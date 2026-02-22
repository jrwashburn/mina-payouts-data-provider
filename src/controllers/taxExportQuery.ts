import { Decimal } from 'decimal.js';
import type { Pool } from 'pg';
import type { ControllerResponse } from '../models/controller.js';
import type {
  TaxExportRequest,
  TaxEvent,
  TaxEventType,
  BlockRewardRow,
  SnarkFeeRow,
  FeeTransferRow,
  PaymentRow,
  ZkAppRow,
  DelegationRow,
  PayoutConfig,
} from '../models/taxExport.js';
import {
  queryBlockProduction,
  querySnarkFees,
  queryFeeTransfers,
  queryPayments,
  queryZkApps,
  queryDelegations,
} from '../database/taxExportDb.js';
import { decodeMemo } from '../utils/memoDecoder.js';
import { isPoolPayout } from '../utils/payoutDetector.js';
import { TAX_EXPORT_CONFIG } from '../configurations/taxConstants.js';
import { formatTaxData } from '../utils/taxFormatters.js';

/**
 * Main controller for tax export functionality
 * Queries all transaction types and transforms them into tax events
 */
export async function getTaxExport(
  pool: Pool,
  request: TaxExportRequest,
): Promise<ControllerResponse> {
  try {
    // 1. Validate inputs
    validateRequest(request);

    // 2. Convert dates to Mina timestamps (start of day for start, end of day for end)
    const startTimestamp = dateToMinaTimestamp(request.startDate, true);
    const endTimestamp = dateToMinaTimestamp(request.endDate, false);

    // 3. Query all transaction types in parallel
    const [blocks, snarks, feeTransfers, payments, zkApps, delegations] = await Promise.all([
      queryBlockProduction(pool, request.accounts, startTimestamp, endTimestamp),
      querySnarkFees(pool, request.accounts, startTimestamp, endTimestamp),
      queryFeeTransfers(pool, request.accounts, startTimestamp, endTimestamp),
      queryPayments(pool, request.accounts, startTimestamp, endTimestamp),
      queryZkApps(pool, request.accounts, startTimestamp, endTimestamp),
      queryDelegations(pool, request.accounts, startTimestamp, endTimestamp),
    ]);

    // 4. Transform to TaxEvent[] with payout detection
    const events: TaxEvent[] = [
      ...transformBlockEvents(blocks),
      ...transformSnarkEvents(snarks),
      ...transformFeeTransferEvents(feeTransfers, request.payoutConfig),
      ...transformPaymentEvents(payments, request.accounts, request.payoutConfig),
      ...transformZkAppEvents(zkApps, request.payoutConfig),
      ...transformDelegationEvents(delegations),
    ];

    // 5. Sort chronologically, then by account for consistency
    events.sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.accountKey.localeCompare(b.accountKey);
    });

    // 6. Format based on requested format
    const responseData = formatTaxData(events, request.format, request.accounts.length > 1);

    return {
      responseData,
      responseCode: 200,
      responseMessages: [
        `Exported ${events.length} transactions for ${request.accounts.length} account(s)`,
      ],
    };
  } catch (error) {
    return {
      responseCode: 500,
      responseError: (error as Error).message,
    };
  }
}

/**
 * Validate tax export request
 */
function validateRequest(request: TaxExportRequest): void {
  // Validate accounts
  if (!request.accounts || request.accounts.length === 0) {
    throw new Error('At least one account is required');
  }

  if (request.accounts.length > TAX_EXPORT_CONFIG.MAX_ACCOUNTS_PER_REQUEST) {
    throw new Error(`Maximum ${TAX_EXPORT_CONFIG.MAX_ACCOUNTS_PER_REQUEST} accounts per request`);
  }

  for (const account of request.accounts) {
    if (account.length !== TAX_EXPORT_CONFIG.ADDRESS_LENGTH) {
      throw new Error(`Invalid account key length: ${account}`);
    }
  }

  // Validate dates
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid startDate: ${request.startDate}`);
  }

  if (isNaN(endDate.getTime())) {
    throw new Error(`Invalid endDate: ${request.endDate}`);
  }

  if (endDate < startDate) {
    throw new Error('endDate must be after startDate');
  }

  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > TAX_EXPORT_CONFIG.MAX_EXPORT_DAYS) {
    throw new Error(`Date range exceeds maximum of ${TAX_EXPORT_CONFIG.MAX_EXPORT_DAYS} days`);
  }

  // Validate format
  if (!['koinly', 'ledgible', 'accointing', 'json'].includes(request.format)) {
    throw new Error('Invalid format. Must be: koinly, ledgible, accointing, or json');
  }
}

/**
 * Convert YYYY-MM-DD date string to Mina timestamp (milliseconds since epoch as string)
 */
function dateToMinaTimestamp(dateString: string, isStartOfDay: boolean): string {
  // For start dates, use beginning of day (00:00:00.000 UTC)
  // For end dates, use beginning of next day (will use < instead of <=)
  if (isStartOfDay) {
    const date = new Date(dateString + 'T00:00:00.000Z');
    return date.getTime().toString();
  } else {
    // Add one day to get to start of next day
    const date = new Date(dateString + 'T00:00:00.000Z');
    date.setUTCDate(date.getUTCDate() + 1);
    return date.getTime().toString();
  }
}

/**
 * Parse Mina timestamp (milliseconds since epoch as string) to Date
 */
function parseMinaTimestamp(timestamp: string): Date {
  return new Date(parseInt(timestamp, 10));
}

/**
 * Transform block production rewards to tax events
 */
function transformBlockEvents(rows: BlockRewardRow[]): TaxEvent[] {
  return rows
    .filter((row) => parseInt(row.total_reward, 10) > 0)
    .map((row) => ({
      accountKey: row.creator_key,
      timestamp: parseMinaTimestamp(row.timestamp),
      blockHeight: row.height,
      transactionHash: row.state_hash,
      eventType: 'coinbase_reward' as TaxEventType,
      amount: new Decimal(row.total_reward).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
      fee: new Decimal(0),
      to: row.creator_key,
      memo: 'Block production',
      isPoolPayout: false, // Block production is never a pool payout
    }));
}

/**
 * Transform SNARK work fees to tax events
 */
function transformSnarkEvents(rows: SnarkFeeRow[]): TaxEvent[] {
  return rows.map((row) => ({
    accountKey: row.receiver_key,
    timestamp: parseMinaTimestamp(row.timestamp),
    blockHeight: row.height,
    transactionHash: row.tx_hash || row.state_hash,
    eventType: 'snark_fee' as TaxEventType,
    amount: new Decimal(row.amount).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
    fee: new Decimal(0),
    to: row.receiver_key,
    memo: 'SNARK work',
    isPoolPayout: false, // SNARK work is never a pool payout
  }));
}

/**
 * Transform fee transfers to tax events
 */
function transformFeeTransferEvents(
  rows: FeeTransferRow[],
  payoutConfig?: PayoutConfig,
): TaxEvent[] {
  return rows.map((row) => {
    const event = {
      accountKey: row.receiver_key,
      timestamp: parseMinaTimestamp(row.timestamp),
      blockHeight: row.height,
      transactionHash: row.tx_hash || row.state_hash,
      eventType: 'fee_transfer_received' as const,
      amount: new Decimal(row.amount).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
      fee: new Decimal(0),
      to: row.receiver_key,
      memo: '',
    };

    return {
      ...event,
      isPoolPayout: isPoolPayout(event, payoutConfig),
    };
  });
}

/**
 * Transform payment transactions to tax events
 */
function transformPaymentEvents(
  rows: PaymentRow[],
  accountKeys: string[],
  payoutConfig?: PayoutConfig,
): TaxEvent[] {
  const events: TaxEvent[] = [];

  for (const row of rows) {
    const isSender = accountKeys.includes(row.from_key);
    const isReceiver = accountKeys.includes(row.to_key);
    const memo = decodeMemo(row.memo);

    const event = {
      accountKey: isSender ? row.from_key : row.to_key,
      timestamp: parseMinaTimestamp(row.timestamp),
      blockHeight: row.height,
      transactionHash: row.tx_hash,
      eventType: (isSender ? 'payment_sent' : 'payment_received') as TaxEventType,
      amount: new Decimal(row.amount).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
      fee: isSender
        ? new Decimal(row.fee).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA)
        : new Decimal(0),
      from: row.from_key,
      to: row.to_key,
      memo: memo,
      isPoolPayout: !isSender && isPoolPayout({ memo, from: row.from_key }, payoutConfig),
    };

    events.push(event);

    // If this payment created the receiver's account, add account creation fee event
    if (row.account_creation_fee && isReceiver) {
      const creationFeeEvent: TaxEvent = {
        accountKey: row.to_key,
        timestamp: parseMinaTimestamp(row.timestamp),
        blockHeight: row.height,
        transactionHash: row.tx_hash,
        eventType: 'account_creation_fee' as TaxEventType,
        amount: new Decimal(row.account_creation_fee).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
        fee: new Decimal(0),
        from: row.to_key,
        to: undefined,
        memo: 'Account creation fee',
        isPoolPayout: false,
      };
      events.push(creationFeeEvent);
    }
  }

  return events;
}

/**
 * Transform zkApp transactions to tax events
 * Aggregates multiple account updates per transaction
 */
function transformZkAppEvents(rows: ZkAppRow[], payoutConfig?: PayoutConfig): TaxEvent[] {
  return rows.map((row) => {
    const balanceChange = new Decimal(row.net_balance_change);
    const isPositive = balanceChange.isPositive();
    const isFeePayer = row.fee_payer === row.account_key;
    const memo = decodeMemo(row.memo);

    const event = {
      accountKey: row.account_key,
      timestamp: parseMinaTimestamp(row.timestamp),
      blockHeight: row.height,
      transactionHash: row.tx_hash,
      eventType: (isPositive ? 'zkapp_payment_received' : 'zkapp_payment_sent') as TaxEventType,
      amount: balanceChange.abs().div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
      fee: isFeePayer
        ? new Decimal(row.fee).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA)
        : new Decimal(0),
      from: isPositive ? undefined : row.account_key,
      to: isPositive ? row.account_key : undefined,
      memo: memo,
    };

    return {
      ...event,
      isPoolPayout: isPositive && isPoolPayout(event, payoutConfig),
    };
  });
}
/**
 * Transform delegation rows to tax events
 * Delegations have 0 amount but include a fee
 */
function transformDelegationEvents(rows: DelegationRow[]): TaxEvent[] {
  return rows.map((row) => {
    const memo = decodeMemo(row.memo);

    return {
      accountKey: row.source_key,
      timestamp: parseMinaTimestamp(row.timestamp),
      blockHeight: row.height,
      transactionHash: row.tx_hash,
      eventType: 'delegation' as TaxEventType,
      amount: new Decimal(0), // Delegations have no amount transfer
      fee: new Decimal(row.fee).div(TAX_EXPORT_CONFIG.NANOMINA_PER_MINA),
      from: row.source_key,
      to: row.delegate_key,
      memo: memo,
      isPoolPayout: false, // Delegations are never pool payouts
      delegateTarget: row.delegate_key,
    };
  });
}
