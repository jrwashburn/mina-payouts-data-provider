import XLSX from 'xlsx';
import type { TaxEvent, KoinlyRow, LedgibleRow, AccointingRow } from '../models/taxExport.js';
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
    case 'accointing':
      return formatAsAccointing(events, multipleAccounts);
    case 'json':
    default:
      return JSON.stringify(events, null, 2);
  }
}

/**
 * Format as Koinly CSV (12 or 13 columns)
 */
function formatAsKoinly(events: TaxEvent[], multipleAccounts: boolean): string {
  const rows: KoinlyRow[] = events.map((event) => {
    const isDeposit =
      event.eventType.includes('_received') ||
      event.eventType === 'coinbase_reward' ||
      event.eventType === 'snark_fee';

    const row: KoinlyRow = {
      koinlyDate: event.timestamp.toISOString(),
      amount: event.amount.toString(),
      currency: TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      label: getKoinlyLabel(event),
      txHash: event.transactionHash,
      netWorthAmount: '', // No USD valuation (spot pricing)
      netWorthCurrency: '',
      description: getDescription(event),
      type: getKoinlyType(event),
      sendingWallet: isDeposit ? '' : event.from || '',
      receivingWallet: isDeposit ? event.to || '' : '',
      fee: isDeposit ? '' : event.fee.toString(),
    };

    if (multipleAccounts) {
      row.account = event.accountKey;
    }

    return row;
  });

  return formatCsv(rows as unknown as Array<Record<string, unknown>>, getKoinlyHeaders(multipleAccounts));
}

/**
 * Format as Ledgible CSV (11 or 12 columns)
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
      pricePerUnit: 'spot',
      priceCurrency: '', // Empty when using spot
      fee: isIncoming ? '' : event.fee.toString(),
      feeCurrency: isIncoming ? '' : TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      contractAddress: event.transactionHash,
    };

    if (multipleAccounts) {
      row.account = event.accountKey;
    }

    return row;
  });

  return formatCsv(rows as unknown as Array<Record<string, unknown>>, getLedgibleHeaders(multipleAccounts));
}

/**
 * Format as Accointing XLSX (8 or 9 columns)
 */
function formatAsAccointing(events: TaxEvent[], multipleAccounts: boolean): Buffer {
  const rows: AccointingRow[] = events.map((event) => {
    const row: AccointingRow = {
      timestamp: event.timestamp.toISOString().replace('T', ' ').replace('Z', ''),
      type: getAccointingType(event),
      baseCurrency: TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      baseAmount: event.amount.toString(),
      quoteCurrency: '',
      quoteAmount: '',
      feeCurrency: event.fee.isZero() ? '' : TAX_EXPORT_CONFIG.CURRENCY_SYMBOL,
      feeAmount: event.fee.isZero() ? '' : event.fee.toString(),
    };

    if (multipleAccounts) {
      row.account = event.accountKey;
    }

    return row;
  });

  // Create XLSX workbook
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: getAccointingHeaders(multipleAccounts),
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Get Koinly transaction type
 *  coinbase, snark, fees are "mining"
 *  payouts are "rewards"
 *  otherwise "deposit" or "withdrawal" 
 */
function getKoinlyType(event: TaxEvent): string {
  switch (event.eventType) {
    case 'coinbase_reward':
    case 'snark_fee':
      return 'mining';
    case 'fee_transfer_received':
      return event.isPoolPayout ? 'reward' : 'mining';
    case 'payment_received':
    case 'zkapp_payment_received':
      return event.isPoolPayout ? 'reward' : 'deposit';
    case 'payment_sent':
    case 'zkapp_payment_sent':
      return 'withdrawal';
    case 'delegation':
    case 'account_creation_fee':
      return 'withdrawal'; // Fee-only transactions
  }
}

/**
 * Get Koinly label
 */
function getKoinlyLabel(event: TaxEvent): string {
  if (event.isPoolPayout) return 'Staking reward';
  if (event.eventType === 'snark_fee') return 'SNARK work';
  if (event.eventType === 'coinbase_reward') return 'Block production reward';
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
 * Get Accointing transaction type
 */
function getAccointingType(event: TaxEvent): string {
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
 * Get Koinly headers
 */
function getKoinlyHeaders(multipleAccounts: boolean): string[] {
  const headers = [
    'Koinly Date',
    'Amount',
    'Currency',
    'Label',
    'TxHash',
    'Net Worth Amount',
    'Net Worth Currency',
    'Description',
    'Type',
    'SendingWallet',
    'ReceivingWallet',
    'Fee',
  ];

  if (multipleAccounts) {
    return [...headers, 'Account'];
  }

  return headers;
}

/**
 * Get Ledgible headers
 */
function getLedgibleHeaders(multipleAccounts: boolean): string[] {
  const headers = [
    'Date',
    'Timezone',
    'Categorization',
    'Side',
    'Currency Symbol',
    'Quantity',
    'Price (per unit)',
    'Price Currency',
    'Fee',
    'Fee Currency',
    'Contract Address',
  ];

  if (multipleAccounts) {
    return [...headers, 'Account'];
  }

  return headers;
}

/**
 * Get Accointing headers
 */
function getAccointingHeaders(multipleAccounts: boolean): string[] {
  const headers = [
    'Timestamp (UTC)',
    'Type',
    'Base Currency',
    'Base Amount',
    'Quote Currency',
    'Quote Amount',
    'Fee Currency',
    'Fee Amount',
  ];

  if (multipleAccounts) {
    return [...headers, 'Account'];
  }

  return headers;
}

/**
 * Format objects as CSV
 */
function formatCsv(rows: Record<string, unknown>[], headers: string[]): string {
  if (rows.length === 0) {
    return headers.join(',') + '\n';
  }

  // Convert headers to lowercase, replace spaces with underscores for object keys
  const headerKeys = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'));

  // Map row objects to match header keys
  const mappedRows = rows.map((row) => {
    const mappedRow: Record<string, unknown> = {};

    // Handle Koinly format
    if ('koinlyDate' in row) {
      mappedRow.account = row.account || '';
      mappedRow.koinly_date = row.koinlyDate;
      mappedRow.amount = row.amount;
      mappedRow.currency = row.currency;
      mappedRow.label = row.label;
      mappedRow.txhash = row.txHash;
      mappedRow.net_worth_amount = row.netWorthAmount;
      mappedRow.net_worth_currency = row.netWorthCurrency;
      mappedRow.description = row.description;
      mappedRow.type = row.type;
      mappedRow.sendingwallet = row.sendingWallet;
      mappedRow.receivingwallet = row.receivingWallet;
      mappedRow.fee = row.fee;
    }
    // Handle Ledgible format
    else if ('categorization' in row) {
      mappedRow.account = row.account || '';
      mappedRow.date = row.date;
      mappedRow.timezone = row.timezone;
      mappedRow.categorization = row.categorization;
      mappedRow.side = row.side;
      mappedRow.currency_symbol = row.currencySymbol;
      mappedRow.quantity = row.quantity;
      mappedRow.price_per_unit = row.pricePerUnit;
      mappedRow.price_currency = row.priceCurrency;
      mappedRow.fee = row.fee;
      mappedRow.fee_currency = row.feeCurrency;
      mappedRow.contract_address = row.contractAddress;
    }

    return mappedRow;
  });

  // Create CSV content
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
