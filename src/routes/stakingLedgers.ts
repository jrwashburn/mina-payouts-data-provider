import express from 'express';
import * as sldb from '../database/stakingLedgerDb';
import { Stake, LedgerEntry } from '../models/stakes';
import {MinaAddresses} from '../mina-addresses/minaAddressShareClass'

const router = express.Router();
let minaAddresses: MinaAddresses;
(async () => {
  minaAddresses = await MinaAddresses.create('src/mina-addresses');
})();

router.get('/:ledgerHash', async (req, res) => {
  const key = req.query.key as string;
  const ledgerHash = req.params.ledgerHash as string;

  try {
    const stakes = await getStakes(ledgerHash, key);
    const response = { stakes, messages: [] };
    res.status(200).json(response);
  }
  catch (error) {
    console.log(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }

});

router.get('/epoch/:epoch', async (req, res) => {

  const key = req.query.key as string;
  const epoch = parseInt(req.params.epoch);

  try {
    const stakes = await getStakesByEpoch(key, epoch);
    const response = { stakes, messages: [] };
    res.status(200).json(response);
  }
  catch (error) {
    console.log(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }
});

async function getStakes(ledgerHash: string, key: string): Promise<[Stake[], number]> {
  try {
      let totalStakingBalance = 0;
      const ledger = await sldb.getStakingLedgers(ledgerHash,key);

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
      const ledger = await sldb.getStakingLedgersByEpoch(key,epoch);

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
export default router;