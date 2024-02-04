import * as sldb from '../database/stakingLedgerDb';
import { Stake, LedgerEntry } from '../models/stakes';
import { MinaAddresses } from '../mina-addresses/minaAddressShareClass'

let minaAddresses: MinaAddresses;
(async () => {
  minaAddresses = await MinaAddresses.create('src/mina-addresses');
})();

export async function getLedgerFromHashForKey(ledgerHash: string, key: string): Promise<[Stake[], number, string[]]> {
  const [stakes, totalStakingBalance] = await getStakes(ledgerHash, key);
  const messages: string[] = [];
  return [stakes, totalStakingBalance, messages];
}

export async function getLedgerFromEpochForKey(key: string, epoch: number): Promise<[Stake[], number, string[]]> {
  const [stakes, totalStakingBalance] = await getStakesByEpoch(key, epoch);
  const messages: string[] = [];
  return [stakes, totalStakingBalance, messages];
}

async function getStakes(ledgerHash: string, key: string): Promise<[Stake[], number]> {
  try {
    let totalStakingBalance = 0;
    const ledger = await sldb.getStakingLedgers(ledgerHash, key);

    const stakers: Stake[] = await Promise.all(
      ledger.map(async (stake: LedgerEntry) => {
        const balance = Number(stake.balance);
        totalStakingBalance += balance;
        return {
          publicKey: stake.pk,
          stakingBalance: balance,
          untimedAfterSlot: await calculateUntimedSlot(stake),
          shareClass: await minaAddresses.getPublicKeyShareClass(stake.pk),
        };
      })
    );

    return [stakers, totalStakingBalance];
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function getStakesByEpoch(key: string, epoch: number): Promise<[Stake[], number]> {
  try {
    let totalStakingBalance = 0;
    const ledger = await sldb.getStakingLedgersByEpoch(key, epoch);

    const stakers: Stake[] = await Promise.all(
      ledger.map(async (stake: LedgerEntry) => {
        const balance = Number(stake.balance);
        totalStakingBalance += balance;
        return {
          publicKey: stake.pk,
          stakingBalance: balance,
          untimedAfterSlot: await calculateUntimedSlot(stake),
          shareClass: await minaAddresses.getPublicKeyShareClass(stake.pk),
        };
      })
    );

    return [stakers, totalStakingBalance];
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function calculateUntimedSlot(ledgerEntry: LedgerEntry): Promise<number> {
  if (!ledgerEntry.timing) {
    return 0;
  } else {
    const vestingPeriod = Number(ledgerEntry.timing.vesting_period);
    const vestingIncrement = Number(ledgerEntry.timing.vesting_increment);
    const cliffTime = Number(ledgerEntry.timing.cliff_time);
    const cliffAmount = Number(ledgerEntry.timing.cliff_amount);
    const initialMinimumBalance = Number(ledgerEntry.timing.initial_minimum_balance);

    if (vestingIncrement === 0) {
      if (cliffAmount === initialMinimumBalance) {
        return cliffTime;
      } else {
        throw new Error('Timed Account with no increment - unsure how to handle');
      }
    } else {
      return ((initialMinimumBalance - cliffAmount) / vestingIncrement) * vestingPeriod + cliffTime;
    }
  }
}
