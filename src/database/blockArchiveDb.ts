// Relies on view ConsensusChainForPayout in the archive database 
// view can be created with script in deploy/db-setup/ConsensusChainForPayout.sql

import { Block, BlockSummary, Height } from '../models/blocks';
import { createBlockQueryPool } from './databaseFactory'
import configuration from '../configurations/environmentConfiguration';

console.log(`Creating query pool targeting ${configuration.blockDbQueryHost} at port ${configuration.blockDbQueryPort}`);
const pool = createBlockQueryPool(configuration.blockDbQueryConnectionSSL);

const blockQuery = `
WITH block_range AS (
  SELECT min(id) AS min_id, max(id) AS max_id
  FROM blocks
  WHERE height >= $2 and height <= $3
)
SELECT
  b.id AS id,
  b.height AS blockheight,
  b.state_hash AS statehash,
  slh.value AS stakingLedgerhash,
  b.timestamp AS blockdatetime,
  b.global_slot AS slot,
  b.global_slot_since_genesis AS globalslotsincegenesis,
  pkc.value AS creatorpublickey,
  pkw.value AS winnerpublickey,
  pk.value AS recevierpublickey,
  coalesce(bif.coinbase, 0) AS coinbase,
  coalesce(bif2.feeTransferToReceiver, 0) AS feetransfertoreceiver,
  coalesce(bif.feeTransferFromCoinbase, 0) AS feetransferfromcoinbase,
  coalesce(btf.userCommandTransactionFees, 0) AS usercommandtransactionfees
FROM
  blocks b
  INNER JOIN public_keys pkc ON b.creator_id = pkc.id
  INNER JOIN public_keys pkw ON b.block_winner_id = pkw.id
  INNER JOIN epoch_data ed ON b.staking_epoch_data_id = ed.id
  INNER JOIN snarked_ledger_hashes slh ON ed.ledger_hash_id = slh.id
  LEFT JOIN (
    SELECT
      bic.block_id,
      sum(
        CASE
          WHEN ic.type = 'coinbase' THEN coalesce(ic.fee, 0)
          ELSE 0
        END
      ) AS coinbase,
      sum(
        CASE
          WHEN ic.type = 'fee_transfer_via_coinbase' THEN coalesce(ic.fee, 0)
          ELSE 0
        END
      ) AS feeTransferFromCoinbase,
      max(
        CASE
          WHEN ic.type = 'coinbase' THEN ic.receiver_id
          ELSE NULL
        END
      ) AS coinbaseReceiverId
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    WHERE bic.block_id >= (SELECT min_id FROM block_range) AND bic.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      bic.block_id
  ) bif ON b.id = bif.block_id
  LEFT JOIN public_keys pk on pk.id = bif.coinbaseReceiverId
  LEFT JOIN (
    SELECT
      bic.block_id,
      sum(
        CASE
          WHEN ic.type = 'fee_transfer' THEN coalesce(ic.fee, 0)
          ELSE 0
        END
      ) AS feeTransferToReceiver,
      ic.receiver_id
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    WHERE bic.block_id >= (SELECT min_id FROM block_range) AND bic.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      bic.block_id,
      ic.receiver_id
  ) bif2 ON b.id = bif2.block_id
    AND bif2.receiver_id = bif.coinbaseReceiverId
  LEFT JOIN (
    SELECT
      buc.block_id,
      sum(coalesce(uc.fee, 0)) AS userCommandTransactionFees
    FROM
      blocks_user_commands buc
    INNER JOIN user_commands uc ON buc.user_command_id = uc.id
    WHERE
      buc.status = 'applied' and buc.block_id >= (SELECT min_id FROM block_range) AND buc.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      buc.block_id
  ) btf ON b.id = btf.block_id
WHERE
  EXISTS (
    WITH RECURSIVE chain AS (
      SELECT
        id,
        state_hash,
        parent_id,
        creator_id,
        snarked_ledger_hash_id,
        ledger_hash,
        height,
        timestamp
      FROM
        blocks b
      WHERE
        b.height = ( select MAX(height) from blocks )
      UNION
      ALL
      SELECT
        b.id,
        b.state_hash,
        b.parent_id,
        b.creator_id,
        b.snarked_ledger_hash_id,
        b.ledger_hash,
        b.height,
        b.timestamp
      FROM
        blocks b
        INNER JOIN chain ON b.id = chain.parent_id
    )
    SELECT
        1
    FROM
        chain c
    WHERE c.id = b.id
  )
AND pkc.value = $1
AND b.height >= $2
AND b.height <= $3
ORDER BY b.height DESC
`;

const getNullParentsQuery = `
    SELECT height FROM blocks WHERE parent_id is null AND height >= $1 AND height <= $2
`;

export async function getLatestBlock(): Promise<BlockSummary> {
  const query = `
    SELECT 
    height as blockheight, 
    global_slot_since_genesis as globalslotsincegenesis,
    global_slot as globalslot,
    state_hash as statehash,
    parent_hash as parenthash,
    ledger_hash as ledgerhash,
    to_char(to_timestamp("timestamp" / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '.' || 
        LPAD((("timestamp" % 1000)::text), 3, '0') || 'Z' as datetime
    FROM blocks
    WHERE id in (SELECT MAX(id) FROM blocks)`
  const result = await pool.query(query);
  const blockSummary: BlockSummary = result.rows[0];
  return blockSummary;
}

export async function getMinMaxBlocksInSlotRange(min: number, max: number): Promise<[number, number]> {
  const query = `
        SELECT min(blockHeight) as epochminblockheight, max(blockHeight) as epochmaxblockheight
        FROM consensus_chain_for_payout
        WHERE globalSlotSinceGenesis between CAST($1 AS INTEGER) and CAST($2 AS INTEGER)`;
  const result = await pool.query(query, [min, max]);
  const epochminblockheight = result.rows[0].epochminblockheight;
  const epochmaxblockheight = result.rows[0].epochmaxblockheight;
  return [epochminblockheight, epochmaxblockheight];
}

export async function getBlocks(key: string, minHeight: number, maxHeight: number): Promise<Block[]> {
  console.log('Getting blocks in blockArchiveDb.ts for key:', key, 'minHeight:', minHeight, 'maxHeight:', maxHeight);
  const missingHeights: number[] = await getHeightMissing(minHeight, maxHeight);
  console.log('missingHeights:', missingHeights);
  if (
    (minHeight === 0 && (missingHeights.length > 1 || missingHeights[0] != 0)) ||
        (minHeight > 0 && missingHeights.length > 0)
  ) {
    throw new Error(
      `Archive database is missing blocks in the specified range. Import them and try again. Missing blocks were: ${JSON.stringify(
        missingHeights,
      )}`,
    );
  }
  const nullParents = await getNullParents(minHeight, maxHeight);
  console.log('nullParents:', nullParents);
  if (
    (minHeight === 0 && (nullParents.length > 1 || nullParents[0] != 1)) ||
        (minHeight > 0 && nullParents.length > 0)
  ) {
    throw new Error(
      `Archive database has null parents in the specified range. Import them and try again. Blocks with null parents were: ${JSON.stringify(
        nullParents,
      )}`,
    );
  }
  console.log('calling blockQuery');
  try {
    const result = await pool.query(blockQuery, [key, minHeight, maxHeight]);
    const blocks: Block[] = result.rows.map(row => ({
      blockheight: Number(row.blockheight),
      statehash: String(row.statehash),
      stakingledgerhash: String(row.stakingledgerhash),
      blockdatetime: Number(row.blockdatetime),
      slot: Number(row.slot),
      globalslotsincegenesis: Number(row.globalslotsincegenesis),
      creatorpublickey: String(row.creatorpublickey),
      winnerpublickey: String(row.winnerpublickey),
      receiverpublickey: String(row.receiverpublickey),
      coinbase: Number(row.coinbase),
      feetransfertoreceiver: Number(row.feetransfertoreceiver),
      feetransferfromcoinbase: Number(row.feetransferfromcoinbase),
      usercommandtransactionfees: Number(row.usercommandtransactionfees),
    }));
    return blocks;
  } catch (error) {
    console.error('Error getting blocks:', error);
    throw new Error('Error getting blocks');
  }
}

export async function getEpoch(hash: string, userSpecifiedEpoch: number | null): Promise<number> {
  if (!process.env.NUM_SLOTS_IN_EPOCH) throw Error('ERROR: NUM_SLOTS_IN_EPOCH not present in .env file. ');

  const query = `
    SELECT MIN(b.global_slot), MAX(b.global_slot) 
    FROM blocks b
    INNER JOIN epoch_data ed ON b.staking_epoch_data_id = ed.id
    INNER JOIN snarked_ledger_hashes slh ON ed.ledger_hash_id = slh.id
    WHERE slh.value = $1
    `;

  try{
    const result = await pool.query(query, [hash]);

    if(result.rows[0].min && result.rows[0].max){
      const minGlobalSlot = Number.parseFloat(result.rows[0].min);
      const maxGlobalSlot = Number.parseFloat(result.rows[0].max);
      const slotsInEpoch = Number.parseInt(process.env.NUM_SLOTS_IN_EPOCH);

      const epoch = Math.floor(minGlobalSlot / slotsInEpoch);
      const nextEpoch = Math.ceil(maxGlobalSlot / slotsInEpoch);
      if (epoch + 1 == nextEpoch) {
        return epoch;
      }
      else if (epoch === 0 && (userSpecifiedEpoch === 0 || userSpecifiedEpoch === 1)) {
        return userSpecifiedEpoch;
      }
      else {
        throw new Error(`Error getting epoch, minGlobalSlot and maxGlobalSlot are from different epochs. 
          If this is the genesis ledger, please specify the epoch in the request.
          Epoch: ${epoch}, Next Epoch: ${nextEpoch}, User Specified Epoch: ${userSpecifiedEpoch}, minGlobalSlot: ${minGlobalSlot}, maxGlobalSlot: ${maxGlobalSlot}`);
      }
    }
  } catch (error) {
    console.log(`Error getting epoch ${error}`);
    throw error;
  }
  return -1;
}

export async function updateEpoch(hash: string, epoch: number): Promise<void> {
  const query = `UPDATE staking_ledger SET epoch = $1 WHERE hash = $2 and epoch is null`;
  try {
    await pool.query(query, [epoch, hash]);
  } catch (error) {
    console.error('Error updating epoch:', error);
    throw new Error('Error updating epoch');
  }
}

async function getHeightMissing(minHeight: number, maxHeight: number): Promise<number[]> {
  const query = `
    SELECT h as height
    FROM (SELECT h::int FROM generate_series(CAST($1 as INTEGER) , CAST($2 as INTEGER)) h
    LEFT JOIN blocks b
    ON h = b.height where b.height is null) as v
  `;
  
  const result = await pool.query(query, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}
  
async function getNullParents(minHeight: number, maxHeight: number): Promise<number[]> {
  const result = await pool.query(getNullParentsQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}