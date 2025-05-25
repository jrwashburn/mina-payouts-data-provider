import { getStakingLedgers, getStakingLedgersByEpoch } from '../database/stakingLedgerDb.js';
import { Stake, LedgerEntry, Ledger } from '../models/stakes.js';
import { MinaAddresses } from '../mina-addresses/minaAddressShareClass.js'
import { ControllerResponse } from '../models/controller.js';
import { Decimal } from 'decimal.js';

let minaAddresses: MinaAddresses;
(async () => {
  minaAddresses = await MinaAddresses.create('src/mina-addresses');
})();

export async function getLedgerFromHashForKey(ledgerHash: string, key: string): Promise<ControllerResponse> {
  const ledger: Ledger = await getStakes(ledgerHash, key);
  const controllerResponse: ControllerResponse = { responseData: ledger }
  return controllerResponse;
}

export async function getLedgerFromEpochForKey(key: string, epoch: number): Promise<ControllerResponse> {
  const ledger: Ledger = await getStakesByEpoch(key, epoch);
  const controllerResponse: ControllerResponse = { responseData: ledger }
  return controllerResponse;
}

async function getStakes(ledgerHash: string, key: string): Promise<Ledger> {
  let totalStakingBalance = new Decimal(0.0);
  const ledger = await getStakingLedgers(ledgerHash, key);

  const stakers: Stake[] = await Promise.all(
    ledger.map(async (stake: LedgerEntry) => {
      const balance = Number(stake.balance);
      totalStakingBalance = totalStakingBalance.plus(balance);
      return {
        publicKey: stake.pk,
        stakingBalance: balance,
        untimedAfterSlot: await calculateUntimedSlot(stake),
        shareClass: await minaAddresses.getPublicKeyShareClass(stake.pk),
      };
    })
  );

  return {
    stakes: stakers, totalStakingBalance: totalStakingBalance.toNumber()
  };
}

async function getStakesByEpoch(key: string, epoch: number): Promise<Ledger> {
  let totalStakingBalance = new Decimal(0.0);
  const ledger = await getStakingLedgersByEpoch(key, epoch);

  const stakers: Stake[] = await Promise.all(
    ledger.map(async (stake: LedgerEntry) => {
      const balance = Number(stake.balance);
      totalStakingBalance = totalStakingBalance.plus(balance);
      return {
        publicKey: stake.pk,
        stakingBalance: balance,
        untimedAfterSlot: await calculateUntimedSlot(stake),
        shareClass: await minaAddresses.getPublicKeyShareClass(stake.pk),
      };
    })
  );
  return { stakes: stakers, totalStakingBalance: totalStakingBalance.toNumber() };
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
