import XLSX from 'xlsx';
import type { TaxEvent, KoinlyRow, LedgibleRow, BlockpitRow } from '../models/taxExport.js';
import { TAX_EXPORT_CONFIG } from '../configurations/taxConstants.js';

/**
 * Format tax events based on requested format
 */
export function formatTaxData(
  events: TaxEvent[],
  format: string,
  multipleAccounts: boolean,
): string | Buffer {
  switch (format) {
    case 'koinly':
      return formatAsKoinly(events, multipleAccounts);
    case 'ledgible':
      return formatAsLedgible(events, multipleAccounts);
    case 'blockpit':
      return formatAsBlockpit(events, multipleAccounts);
    case 'json':
    default:
      return JSON.stringify(events, null, 2);
  }
}

/**
 * Format as Koinly CSV (Advanced Custom Format)
 * Uses separate Sent/Received columns with address-specific currency format
 */
function formatAsKoinly(events: TaxEvent[], multipleAccounts: boolean): string {
  const rows: KoinlyRow[] = events.map((event) => {
    const isIncoming =
      event.eventType.includes('_received') ||
      event.eventType === 'coinbase_reward' ||
      event.eventType === 'snark_fee';

    // Use Koinly's address-specific currency format: SYMBOL:ADDRESS:BLOCKCHAIN
    const currency = `${TAX_EXPORT_CONFIG.CURRENCY_SYMBOL}:${event.accountKey}:${TAX_EXPORT_CONFIG.CURRENCY_SYMBOL}`;

    const row: KoinlyRow = {
      date: event.timestamp.toISOString(),
      sentAmount: isIncoming ? '' : event.amount.toString(),
      sentCurrency: isIncoming ? '' : currency,
      receivedAmount: isIncoming ? event.amount.toString() : '',
      receivedCurrency: isIncoming ? currency : '',
      feeAmount: !isIncoming && !event.fee.isZero() ? event.fee.toString() : '',
      feeCurrency: !isIncoming && !event.fee.isZero() ? currency : '',
      netWorthAmount: '', // No USD valuation (spot pricing)
      netWorthCurrency: '',
      label: getKoinlyLabel(event),
      description: getDescription(event),
      txHash: event.transactionHash,
    };

    if (multipleAccounts) {
      row.account = event.accountKey;
    }

    return row;
  });

  return formatKoinlyCsv(rows, getKoinlyHeaders(multipleAccounts));
}

/**
 * Format as Ledgible CSV (13 or 14 columns with multipleAccounts)
 */
function formatAsLedgible(events: TaxEvent[], multipleAccounts: boolean): string {
  const rows: LedgibleRow[] = events.map((event) => {
    const isIncoming = event.eventType.includes('_received') || event.eventType === 'coinbase_reward' || event.eventType === 'snark_fee';

    const row: LedgibleRow = {
      date: formatLedgibleDate(event.timestamp),
      timezone: '', // Empty means UTC
      categorization: getLedgibleCategorization(event),
      side: isIncoming ? 'incoming' : 'outgoing',
      currencySymbol: TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      quantity: event.amount.toString(),
      currencySymbol2: '', // Empty for non-exchange transactions
      quantity2: '', // Empty for non-exchange transactions
      pricePerUnit: 'spot',
      priceCurrency: '', // Empty when using spot
      fee: isIncoming ? '' : event.fee.toString(),
      feeCurrency: isIncoming ? '' : TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      orderId: event.transactionHash,
    };

    if (multipleAccounts) {
      row.account = event.accountKey;
    }

    return row;
  });

  return formatLedgibleCsv(rows, getLedgibleHeaders(multipleAccounts));
}

/**
 * Format as Blockpit (formerly Accointing) XLSX
 * Uses new Blockpit format with separate incoming/outgoing columns
 */
function formatAsBlockpit(events: TaxEvent[], multipleAccounts: boolean): Buffer {
  const rows: BlockpitRow[] = events.map((event) => {
    const isIncoming =
      event.eventType.includes('_received') ||
      event.eventType === 'coinbase_reward' ||
      event.eventType === 'snark_fee';

    const row: BlockpitRow = {
      timestamp: event.timestamp.toISOString().replace('T', ' ').replace('Z', ''),
      integrationName: 'Mina Protocol',
      label: getBlockpitType(event),
      outgoingAsset: isIncoming ? '' : TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      outgoingAmount: isIncoming ? '' : event.amount.toString(),
      incomingAsset: isIncoming ? TAX_EXPORT_CONFIG.CURRENCY_SYMBOL : '',
      incomingAmount: isIncoming ? event.amount.toString() : '',
      // Fees only apply to outgoing transactions
      feeAsset: !isIncoming && !event.fee.isZero() ? TAX_EXPORT_CONFIG.CURRENCY_SYMBOL : '',
      feeAmount: !isIncoming && !event.fee.isZero() ? event.fee.toString() : '',
      comment: getDescription(event),
      trxId: event.transactionHash,
    };

    if (multipleAccounts) {
      row.account = event.accountKey;
    }

    return row;
  });

  // Map rows to match header column names
  const mappedRows = rows.map((row) => ({
    'Timestamp (UTC)': row.timestamp,
    'Integration Name': row.integrationName,
    'Label': row.label,
    'Outgoing Asset': row.outgoingAsset,
    'Outgoing Amount': row.outgoingAmount,
    'Incoming Asset': row.incomingAsset,
    'Incoming Amount': row.incomingAmount,
    'Fee Asset (optional)': row.feeAsset,
    'Fee Amount (optional)': row.feeAmount,
    'Comment (optional)': row.comment,
    'Trx. ID (optional)': row.trxId,
    ...(multipleAccounts && { 'Account': row.account || '' }),
  }));

  // Create XLSX workbook
  const worksheet = XLSX.utils.json_to_sheet(mappedRows, {
    header: getBlockpitHeaders(multipleAccounts),
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Get Koinly label (for Advanced Custom Format)
 * Labels like "Mining" and "Reward" for incoming transactions
 */
function getKoinlyLabel(event: TaxEvent): string {
  // Pool payouts (staking rewards)
  if (event.isPoolPayout) return 'Reward';

  // Block production and SNARK work are mining activities
  if (event.eventType === 'coinbase_reward' || event.eventType === 'snark_fee') {
    return 'Mining';
  }

  // Fee transfers from block production
  if (event.eventType === 'fee_transfer_received') {
    return 'Mining';
  }

  // Regular deposits and withdrawals have no label
  return '';
}

/**
 * Get transaction description
 */
function getDescription(event: TaxEvent): string {
  if (event.memo && event.memo !== '' && event.eventType !== 'account_creation_fee') return event.memo;

  switch (event.eventType) {
    case 'coinbase_reward':
      return 'Block production reward';
    case 'snark_fee':
      return 'SNARK work fee';
    case 'fee_transfer_received':
      return event.isPoolPayout ? 'Pool staking payout' : 'Fees received for block production';
    case 'payment_received':
      return event.isPoolPayout ? 'Pool staking payout' : 'Payment received';
    case 'payment_sent':
      return 'Payment sent';
    case 'zkapp_payment_received':
      return 'zkApp payment received';
    case 'zkapp_payment_sent':
      return 'zkApp payment sent';
    case 'delegation':
      return event.delegateTarget ? `Delegate to ${event.delegateTarget}` : 'Delegation change';
    case 'account_creation_fee':
      return 'Account creation fee';
  }
}

/**
 * Get Ledgible categorization
 */
function getLedgibleCategorization(event: TaxEvent): string {
  switch (event.eventType) {
    case 'coinbase_reward':
    case 'snark_fee':
      return 'Mining Income';
    case 'fee_transfer_received':
      return event.isPoolPayout ? 'Staking Rewards' : 'Mining Income';
    case 'payment_received':
    case 'zkapp_payment_received':
      return event.isPoolPayout ? 'Staking Rewards' : 'Acquisition';
    case 'payment_sent':
    case 'zkapp_payment_sent':
      return 'Withdrawal';
    case 'delegation':
    case 'account_creation_fee':
      return 'Withdrawal'; // Fee-only transactions
  }
}

/**
 * Format date for Ledgible (MM/DD/YYYY HH:mm:ss)
 */
function formatLedgibleDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get Blockpit transaction type
 */
function getBlockpitType(event: TaxEvent): string {
  switch (event.eventType) {
    case 'coinbase_reward':
    case 'snark_fee':
    case 'fee_transfer_received':
      return 'staking';
    case 'payment_received':
    case 'zkapp_payment_received':
      return event.isPoolPayout ? 'staking' : 'deposit';
    case 'payment_sent':
    case 'zkapp_payment_sent':
      return 'withdraw';
    case 'delegation':
    case 'account_creation_fee':
      return 'withdraw'; // Fee-only transactions
  }
}

/**
 * Get Koinly headers (Advanced Custom Format)
 */
function getKoinlyHeaders(multipleAccounts: boolean): string[] {
  const headers = [
    'Date',
    'Sent Amount',
    'Sent Currency',
    'Received Amount',
    'Received Currency',
    'Fee Amount',
    'Fee Currency',
    'Net Worth Amount',
    'Net Worth Currency',
    'Label',
    'Description',
    'TxHash',
  ];

  if (multipleAccounts) {
    return [...headers, 'Account'];
  }

  return headers;
}

/**
 * Get Ledgible headers (matches Unknown Exchange template format)
 */
function getLedgibleHeaders(multipleAccounts: boolean): string[] {
  const headers = [
    'Date',
    'Timezone',
    'Categorization',
    'Side',
    'Currency (To Currency)',
    'Quantity (To Amount)',
    'Currency #2 (From Currency)',
    'Quantity #2 (From Amount)',
    'Price (per unit)',
    'Price Currency',
    'Fee',
    'Fee Currency',
    'Order Id',
  ];

  if (multipleAccounts) {
    return [...headers, 'Account'];
  }

  return headers;
}

/**
 * Get Blockpit headers
 */
function getBlockpitHeaders(multipleAccounts: boolean): string[] {
  const headers = [
    'Timestamp (UTC)',
    'Integration Name',
    'Label',
    'Outgoing Asset',
    'Outgoing Amount',
    'Incoming Asset',
    'Incoming Amount',
    'Fee Asset',
    'Fee Amount',
    'Comment',
    'Trx. ID',
  ];

  if (multipleAccounts) {
    return [...headers, 'Account'];
  }

  return headers;
}

/**
 * Format Koinly rows as CSV (Advanced Custom Format)
 */
function formatKoinlyCsv(rows: KoinlyRow[], headers: string[]): string {
  if (rows.length === 0) {
    return headers.join(',') + '\n';
  }

  // Convert headers to lowercase, replace spaces with underscores for object keys
  const headerKeys = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'));

  // Map row objects to match header keys
  const mappedRows = rows.map((row) => {
    const mappedRow: Record<string, unknown> = {
      date: row.date,
      sent_amount: row.sentAmount,
      sent_currency: row.sentCurrency,
      received_amount: row.receivedAmount,
      received_currency: row.receivedCurrency,
      fee_amount: row.feeAmount,
      fee_currency: row.feeCurrency,
      net_worth_amount: row.netWorthAmount,
      net_worth_currency: row.netWorthCurrency,
      label: row.label,
      description: row.description,
      txhash: row.txHash,
      account: row.account || '',
    };

    return mappedRow;
  });

  return buildCsv(mappedRows, headers, headerKeys);
}

/**
 * Format Ledgible rows as CSV
 */
function formatLedgibleCsv(rows: LedgibleRow[], headers: string[]): string {
  if (rows.length === 0) {
    return headers.join(',') + '\n';
  }

  // Convert headers to lowercase, replace spaces with underscores for object keys
  const headerKeys = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'));

  // Map row objects to match header keys
  const mappedRows = rows.map((row) => {
    const mappedRow: Record<string, unknown> = {
      account: row.account || '',
      date: row.date,
      timezone: row.timezone,
      categorization: row.categorization,
      side: row.side,
      currency_to_currency: row.currencySymbol,
      quantity_to_amount: row.quantity,
      currency_2_from_currency: row.currencySymbol2,
      quantity_2_from_amount: row.quantity2,
      price_per_unit: row.pricePerUnit,
      price_currency: row.priceCurrency,
      fee: row.fee,
      fee_currency: row.feeCurrency,
      order_id: row.orderId,
    };

    return mappedRow;
  });

  return buildCsv(mappedRows, headers, headerKeys);
}

/**
 * Build CSV content from mapped rows
 */
function buildCsv(
  mappedRows: Array<Record<string, unknown>>,
  headers: string[],
  headerKeys: string[],
): string {
  let csv = headers.join(',') + '\n';

  for (const row of mappedRows) {
    const values = headerKeys.map((key) => {
      const value = row[key];
      if (value === undefined || value === null) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    });
    csv += values.join(',') + '\n';
  }

  return csv;
}
