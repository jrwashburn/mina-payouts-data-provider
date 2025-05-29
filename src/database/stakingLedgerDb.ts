import configuration from '../configurations/environmentConfiguration.js';
import { LedgerEntry, TimedStakingLedgerResultRow, StakingLedgerSourceRow } from '../models/stakes.js';
import { getEpoch } from './blockArchiveDb.js';
import { createLedgerQueryPool, createStakingLedgerCommandPool } from './databaseFactory.js';
import { Pool } from 'pg';

let defaultQueryPool: Pool | null = null;
let defaultCommandPool: Pool | null = null;

function getQueryPool(): Pool {
  if (!defaultQueryPool) {
    console.debug(`Creating query pool targeting ${configuration.ledgerDbQueryHost} at port ${configuration.ledgerDbQueryPort}`);
    defaultQueryPool = createLedgerQueryPool();
  }
  return defaultQueryPool;
}

function getCommandPool(): Pool {
  if (!defaultCommandPool) {
    console.debug(`Creating command pool targeting ${configuration.ledgerDbCommandHost} at port ${configuration.ledgerDbCommandPort}`);
    defaultCommandPool = createStakingLedgerCommandPool();
  }
  return defaultCommandPool;
}

export async function getStakingLedgers(hash: string, key: string, customPool?: Pool) {
  const pool = customPool || getQueryPool();
  const query = `SELECT 
		public_key, 
		balance, 
		delegate_key, 
		timing_initial_minimum_balance, 
		timing_cliff_time, 
		timing_cliff_amount, 
		timing_vesting_period, 
		timing_vesting_increment 
		FROM public.staking_ledger
		WHERE hash = $1 AND delegate_key = $2`;
  const result = await pool.query(query, [hash, key]);
  return buildLedgerEntries(result.rows);
}

export async function getStakingLedgersByEpoch(key: string, epoch: number, customPool?: Pool) {
  const pool = customPool || getQueryPool();
  const query = `SELECT 
		public_key, 
		balance, 
		delegate_key, 
		timing_initial_minimum_balance, 
		timing_cliff_time, 
		timing_cliff_amount, 
		timing_vesting_period, 
		timing_vesting_increment 
		FROM public.staking_ledger
		WHERE delegate_key = $1 AND epoch = $2`;
  const result = await pool.query(query, [key, epoch.toString()]);
  return buildLedgerEntries(result.rows);
}

export async function hashExists(hash: string, userSpecifiedEpoch: number | null, customPool?: Pool): Promise<[boolean, number | null]> {
  console.debug(`hashExists called with hash: ${hash}`)
  const pool = customPool || getQueryPool();
  const query = 'select count(*) from staking_ledger where hash=$1';
  const result = await pool.query(query, [hash]);
  let hashEpoch = -1;
  let hashExists = result.rows[0].count > 0;
  console.debug('hashExists result:', result.rows[0], result.rows[0].count > 0)
  if (result.rows[0].count > 0 && userSpecifiedEpoch != null) {
    const query = 'select count(*) from staking_ledger where hash=$1 and epoch=$2';
    const result = await pool.query(query, [hash, userSpecifiedEpoch.toString()]);
    console.debug('hashExists for user specified epoch:', result.rows[0], result.rows[0].count > 0)
    hashExists = result.rows[0].count > 0;
  }
  if (hashExists) {
    const query = 'select max(epoch) as epoch from staking_ledger where hash=$1';
    const result = await pool.query(query, [hash]);
    hashEpoch = result.rows[0].epoch
  }
  return [hashExists, hashEpoch];
}

function safeNumeric(val: number | string | null | undefined, maxAbs: number = 1e10): number | string | null {
  if (val === null || val === undefined) return null;
  if (Math.abs(Number(val)) >= maxAbs) {
    throw new Error(`Value ${val} exceeds DB numeric limit (${maxAbs})`);
  }
  return val;
}

export async function insertBatch(dataArray: StakingLedgerSourceRow[], hash: string, userSpecifiedEpoch: number | null, customPool?: Pool): Promise<void> {
  console.debug(`insertBatch called: ${dataArray.length} records to insert.`);
  let epoch = -1;
  epoch = await getEpoch(hash, userSpecifiedEpoch);
  const pool = customPool || getCommandPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batchSize = 1000;
    console.debug('Number of records:', dataArray.length);
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      console.debug(`Processing batch ${i} to ${i + batchSize}`);
      const values = batch.map(item => `(
        '${hash}',
        ${epoch},
        '${item.pk}',
        ${safeNumeric(item.balance, 1e19)},
        '${item.delegate}',
        '${item.token}',
        '${item.receipt_chain_hash}',
        '${item.voting_for}',
        ${safeNumeric(item.timing?.initial_minimum_balance ?? null, 1e19)},
        ${item.timing?.cliff_time ?? null},
        ${safeNumeric(item.timing?.cliff_amount ?? null, 1e19)},
        ${item.timing?.vesting_period ?? null},
        ${item.timing?.vesting_increment ?? null}
      )`).join(',');
      const query = `INSERT INTO staking_ledger(
        hash,
        epoch,
        public_key,
        balance,
        delegate_key, 
        token,
        receipt_chain_hash,
        voting_for,
        timing_initial_minimum_balance,
        timing_cliff_time,
        timing_cliff_amount,
        timing_vesting_period,
        timing_vesting_increment)
      VALUES ${values}`;
      await client.query(query);
    }
    await client.query('COMMIT');
  } catch (error) {
    console.error('Failed to insert batch, starting rollback', error);
    await client.query('ROLLBACK');
    console.error(`Error inserting batch: ${error}`);
    throw new Error('Failed to insert batch');
  } finally {
    client.release();
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

export async function updateEpoch(hash: string, epoch: number, customPool?: Pool): Promise<void> {
  const pool = customPool || getCommandPool();
  const query = `UPDATE staking_ledger SET epoch = $1 WHERE hash = $2 and epoch = -1`;
  await pool.query(query, [epoch.toString(), hash]);
}

