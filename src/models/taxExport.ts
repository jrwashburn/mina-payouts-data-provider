import type { Decimal } from 'decimal.js';

export interface TaxExportRequest {
  accounts: string[];
  startDate: string;
  endDate: string;
  format: 'koinly' | 'ledgible' | 'blockpit' | 'json';
  payoutConfig?: PayoutConfig;
}

export interface PayoutConfig {
  memoKeywords?: string[];
  payoutAccounts?: string[];
}

export type TaxEventType =
  | 'coinbase_reward' // Block production
  | 'snark_fee' // SNARK work
  | 'fee_transfer_received' // Fee transfer (pool payout via coinbase)
  | 'payment_sent' // Payment sent
  | 'payment_received' // Payment received
  | 'zkapp_payment_sent' // zkApp with negative balance change
  | 'zkapp_payment_received' // zkApp with positive balance change
  | 'delegation' // Delegation change (stake delegation)
  | 'account_creation_fee'; // Account creation fee (1 MINA deducted)

export interface TaxEvent {
  accountKey: string;
  timestamp: Date;
  blockHeight: number;
  transactionHash: string;
  eventType: TaxEventType;
  amount: Decimal;
  fee: Decimal;
  from?: string;
  to?: string;
  memo?: string;
  isPoolPayout: boolean;
  delegateTarget?: string; // For delegation events
}

// Database row types
export interface BlockRewardRow {
  height: number;
  state_hash: string;
  timestamp: string;
  receiver_key: string; // Report block rewards with the wallet that receives the Coinbase, not necessarily the block creator)
  total_reward: string; // bigint as string
}

export interface SnarkFeeRow {
  height: number;
  state_hash: string;
  timestamp: string;
  receiver_key: string;
  amount: string; // bigint as string
  tx_hash: string;
}

export interface FeeTransferRow {
  height: number;
  state_hash: string;
  timestamp: string;
  receiver_key: string;
  amount: string; // bigint as string
  tx_hash: string;
}

export interface PaymentRow {
  height: number;
  tx_hash: string;
  timestamp: string;
  from_key: string;
  to_key: string;
  amount: string; // bigint as string
  fee: string; // bigint as string
  memo: string;
  account_creation_fee: string | null; // bigint as string, null if no account created
}

export interface ZkAppRow {
  zkapp_cmd_id: number;
  tx_hash: string;
  height: number;
  timestamp: string;
  memo: string;
  fee_payer: string;
  fee: string; // bigint as string
  account_key: string;
  net_balance_change: string; // bigint as string
}

export interface DelegationRow {
  height: number;
  tx_hash: string;
  timestamp: string;
  source_key: string;
  delegate_key: string;
  fee: string; // bigint as string
  memo: string;
}

// Format-specific row types
export interface KoinlyRow {
  date: string;
  sentAmount: string;
  sentCurrency: string;
  receivedAmount: string;
  receivedCurrency: string;
  feeAmount: string;
  feeCurrency: string;
  netWorthAmount: string;
  netWorthCurrency: string;
  label: string;
  description: string;
  txHash: string;
  account?: string;
}

//echo "Date,Timezone,Categorization,Side,Currency (To Currency),Quantity (To Amount),Currency #2 (From Currency),Quantity #2 (From Amount),Price (per unit),Price Currency,Fee,Fee Currency,Order Id"

export interface LedgibleRow {
  date: string;
  timezone: string;
  categorization: string;
  side: string;
  currencySymbol: string; // Maps to "Currency (To Currency)"
  quantity: string; // Maps to "Quantity (To Amount)"
  currencySymbol2: string; // Maps to "Currency #2 (From Currency)"
  quantity2: string; // Maps to "Quantity #2 (From Amount)"
  pricePerUnit: string;
  priceCurrency: string;
  fee: string;
  feeCurrency: string;
  orderId: string; // Maps to "Order Id"
  account?: string;
}

export interface BlockpitRow {
  timestamp: string;
  integrationName: string;
  label: string;
  outgoingAsset: string;
  outgoingAmount: string;
  incomingAsset: string;
  incomingAmount: string;
  feeAsset: string;
  feeAmount: string;
  comment: string;
  trxId: string;
  account?: string;
}
