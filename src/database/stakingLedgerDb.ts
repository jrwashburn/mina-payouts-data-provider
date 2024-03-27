import { Pool } from 'pg';
import { LedgerEntry, TimedStakingLedgerResultRow } from '../models/stakes';
import { getEpoch } from './blockArchiveDb';
import { createLedgerQueryPool, createStakingLedgerCommandPool } from './databaseFactory'
import { getStakingLedgersQuery, getStakingLedgersByEpochQuery, hashExistsQuery, updateEpochQuery, hashExistsForEpochQuery, getEpochFromHashQuery, getInsertIntoStakingLedgersQuery } from './stakingLedgerQueryFactory'

const sldb: Pool = createLedgerQueryPool();
const commanddb: Pool = createStakingLedgerCommandPool();

export async function getStakingLedgers(hash: string, key: string): Promise<LedgerEntry[]> {
  const result = await sldb.query(getStakingLedgersQuery, [hash, key]);
  return buildLedgerEntries(result.rows as TimedStakingLedgerResultRow[]);
}

export async function getStakingLedgersByEpoch(key: string, epoch: number): Promise<LedgerEntry[]> {
  const result = await sldb.query(getStakingLedgersByEpochQuery, [key, epoch]);
  return buildLedgerEntries(result.rows.map(row => ({
    public_key: row[0],
    balance: row[1],
    delegate_key: row[2],
    timing_initial_minimum_balance: row[3],
    timing_cliff_time: row[4],
    timing_cliff_amount: row[5],
    timing_vesting_period: row[6],
    timing_vesting_increment: row[7]
  })) as TimedStakingLedgerResultRow[]);
}

export async function hashExists(hash: string, userSpecifiedEpoch: number | null): Promise<[boolean, number]> {
  const result = await sldb.query(hashExistsQuery, [hash]);
  let hashEpoch = -1;
  let hashExists = parseInt(result.rows[0].count) > 0;
  if (result.rows[0].count > 0 && userSpecifiedEpoch != null) {
    const result = await sldb.query(hashExistsForEpochQuery, [hash, userSpecifiedEpoch]);
    hashExists = parseInt(result.rows[0].count) > 0;
  }
  if (hashExists) {
    const result = await sldb.query(getEpochFromHashQuery, [hash]);
    hashEpoch = parseInt(result.rows[0].epoch)
  }
  return [hashExists, hashEpoch];
}

export async function insertBatch(dataArray: LedgerEntry[], hash: string, userSpecifiedEpoch: number | null): Promise<void> {
  console.debug(`insertBatch called: ${dataArray.length} records to insert.`);
  let epoch = BigInt(-1);
  epoch = await getEpoch(hash, userSpecifiedEpoch);
  const client = await commanddb.connect();
  try {
    await client.query('BEGIN');
    const batchSize = 1000;
    console.log('Number of records:', dataArray.length);
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      const values = batch.map((item, index) => `(DEFAULT, $${index * 20 + 1}, $${index * 20 + 2}, $${index * 20 + 3}, $${index * 20 + 4}, $${index * 20 + 5}, $${index * 20 + 6}, $${index * 20 + 7}, $${index * 20 + 8}, $${index * 20 + 9}, $${index * 20 + 10}, $${index * 20 + 11}, $${index * 20 + 12}, $${index * 20 + 13}, $${index * 20 + 14}, $${index * 20 + 15}, $${index * 20 + 16}, $${index * 20 + 17}, $${index * 20 + 18}, $${index * 20 + 19}, $${index * 20 + 20}) `);
      await client.query(getInsertIntoStakingLedgersQuery(values), batch.flatMap((item) => [
        hash,
        epoch == BigInt(-1) ? userSpecifiedEpoch : BigInt(epoch),
        item.pk,
        item.balance,
        item.delegate,
        item.token,
        item.nonce,
        item.receipt_chain_hash,
        item.voting_for,
        item.timing?.initial_minimum_balance,
        item.timing?.cliff_time,
        item.timing?.cliff_amount,
        item.timing?.vesting_period,
        item.timing?.vesting_increment,
        item.permissions?.stake,
        item.permissions?.edit_stake,
        item.permissions?.send,
        item.permissions?.set_delegate,
        item.permissions?.set_permissions,
        item.permissions?.set_verification_key
      ]));
      console.debug(`Inserted ${batch.length} records`);
    }
    await client.query('COMMIT');
  } catch (error) {
    console.error('Failed to insert batch, starting rollback');
    await client.query('ROLLBACK');
    console.error(`Error inserting batch: ${error}`);
    throw new Error('Failed to insert batch');
  }
}

function buildLedgerEntries(resultRows: TimedStakingLedgerResultRow[]): LedgerEntry[] {
  const ledgerEntries: LedgerEntry[] = [];
  for (const row of resultRows) {
    const stakingLedger: LedgerEntry = {
      pk: row.public_key,
      balance: row.balance,
      delegate: row.delegate_key,
      timing: {
        initial_minimum_balance: row.timing_initial_minimum_balance,
        cliff_time: row.timing_cliff_time,
        cliff_amount: row.timing_cliff_amount,
        vesting_period: row.timing_vesting_period,
        vesting_increment: row.timing_vesting_increment
      }
    };
    ledgerEntries.push(stakingLedger);
  }
  return ledgerEntries;
}

export async function updateEpoch(hash: string, epoch: bigint): Promise<void> {
  await commanddb.query(updateEpochQuery, [epoch, hash]);
}

