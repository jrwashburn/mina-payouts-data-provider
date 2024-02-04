import {ShareClass} from '../mina-addresses/minaAddressShareClass';

export type Stake = {
  publicKey: string;
  stakingBalance: number;
  untimedAfterSlot: number;
  shareClass: ShareClass;
};

export type LedgerEntry = {
  pk: string;
  balance: number;
  delegate: string;
  timing: {
    initial_minimum_balance: number;
    cliff_time: number;
    cliff_amount: number;
    vesting_period: number;
    vesting_increment: number;
  };
};

