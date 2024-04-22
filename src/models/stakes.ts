import {ShareClass} from '../mina-addresses/minaAddressShareClass';
export interface Ledger {
  stakes: Stake[];
  totalStakingBalance: number;
}
export interface Stake {
  publicKey: string;
  stakingBalance: number;
  untimedAfterSlot: number;
  shareClass: ShareClass;
}
interface Timing {
  initial_minimum_balance?: number;
  cliff_time?: number;
  cliff_amount?: number;
  vesting_period?: number;
  vesting_increment?: number;
}
interface Permissions {
  stake?: boolean;
  edit_stake?: boolean;
  send?: boolean;
  set_delegate?: boolean;
  set_permissions?: boolean;
  set_verification_key?: boolean;
}
export interface LedgerEntry {
  pk: string;
  balance: number;
  delegate: string;
  token?: number;
  nonce?: number;
  receipt_chain_hash?: string;
  voting_for?: string;
  timing?: Timing;
  permissions?: Permissions;
}
export interface TimedStakingLedgerResultRow {
  public_key: string;
  balance: number;
  delegate_key: string;
  timing_initial_minimum_balance?: number;
  timing_cliff_time?: number;
  timing_cliff_amount?: number;
  timing_vesting_period?: number;
  timing_vesting_increment?: number;
}

/* Limited staking ledger raw layout to fields that we may care about to simplify differences around hard fork */
export interface StakingLedgerSourceRow {
  pk: string;
  balance: string;
  delegate: string;
  timing?: {
    initial_minimum_balance: string;
    cliff_time: string;
    cliff_amount: string;
    vesting_period: string;
    vesting_increment: string;
  };
  token: string;
  receipt_chain_hash: string;
  voting_for: string;
}
