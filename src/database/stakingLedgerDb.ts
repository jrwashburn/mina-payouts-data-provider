import configuration from '../configurations/environmentConfiguration';
import { LedgerEntry, TimedStakingLedgerResultRow } from '../models/stakes';
import * as db from './blockArchiveDb';
import { createLedgerQueryPool, createStakingLedgerCommandPool } from './databaseFactory'

console.debug(`Creating query pool targeting ${configuration.ledgerDbQueryHost} at port ${configuration.ledgerDbQueryPort}`);
const sldb = createLedgerQueryPool(configuration.ledgerDbQueryConnectionSSL);

console.debug(`Creating command pool targeting ${configuration.ledgerDbCommandHost} at port ${configuration.ledgerDbCommandPort}`);
const commanddb = createStakingLedgerCommandPool(configuration.ledgerDbCommandConnectionSSL);

export async function getStakingLedgers(hash: string, key: string) {
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
  const result = await sldb.query(query, [hash, key]);
  return buildLedgerEntries(result.rows);
}

export async function getStakingLedgersByEpoch(key: string, epoch: number) {
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
  const result = await sldb.query(query, [key, epoch]);
  return buildLedgerEntries(result.rows);
}

export async function hashExists(hash: string, userSpecifiedEpoch: number | null): Promise<[boolean, number | null]> {
  console.debug(`hashExists called with hash: ${hash}`)
  const query = 'select count(*) from staking_ledger where hash=$1';
  const result = await sldb.query(query, [hash]);
  let hashEpoch = -1;
  let hashExists = result.rows[0].count > 0;
  console.debug('hashExists result:', result.rows[0], result.rows[0].count > 0)
  if (result.rows[0].count > 0 && userSpecifiedEpoch != null) {
    const query = 'select count(*) from staking_ledger where hash=$1 and epoch=$2';
    const result = await sldb.query(query, [hash, userSpecifiedEpoch]);
    console.debug('hashExists for user specified epoch:', result.rows[0], result.rows[0].count > 0)
    hashExists = result.rows[0].count > 0;
  }
  if (hashExists) {
    const query = 'select max(epoch) as epoch from staking_ledger where hash=$1';
    const result = await sldb.query(query, [hash]);
    hashEpoch = result.rows[0].epoch
  }
  return [hashExists, hashEpoch];
}

export async function insertBatch(dataArray: LedgerEntry[], hash: string, userSpecifiedEpoch: number | null): Promise<void> {
  console.debug(`insertBatch called: ${dataArray.length} records to insert.`);
  let epoch = -1;
  epoch = await db.getEpoch(hash, userSpecifiedEpoch);
  const client = await commanddb.connect();
  try {
    await client.query('BEGIN');
    const batchSize = 1000;
    console.log('Number of records:', dataArray.length);
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      const values = batch.map((item, index) => `(DEFAULT, $${index * 20 + 1}, $${index * 20 + 2}, $${index * 20 + 3}, $${index * 20 + 4}, $${index * 20 + 5}, $${index * 20 + 6}, $${index * 20 + 7}, $${index * 20 + 8}, $${index * 20 + 9}, $${index * 20 + 10}, $${index * 20 + 11}, $${index * 20 + 12}, $${index * 20 + 13}, $${index * 20 + 14}, $${index * 20 + 15}, $${index * 20 + 16}, $${index * 20 + 17}, $${index * 20 + 18}, $${index * 20 + 19}, $${index * 20 + 20}) `);
      const query = `INSERT INTO staking_ledger(
				id,
				hash,
				epoch,
				public_key,
				balance,
				delegate_key, 
				token,
				nonce,
				receipt_chain_hash,
				voting_for,
				timing_initial_minimum_balance,
				timing_cliff_time,
				timing_cliff_amount,
				timing_vesting_period,
				timing_vesting_increment,
				permissions_stake,
				permissions_edit_state,
				permissions_send,
				permissions_set_delegate,
				permissions_set_permissions,
				permissions_set_verification_key ) VALUES ${values.join(', ')}`;
      await client.query(query, batch.flatMap((item) => [
        hash,
        epoch == -1 ? userSpecifiedEpoch : epoch,
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

export async function updateEpoch(hash: string, epoch: number): Promise<void> {
  const query = `UPDATE staking_ledger SET epoch = $1 WHERE hash = $2 and epoch is null`;
  await commanddb.query(query, [epoch, hash]);
}

