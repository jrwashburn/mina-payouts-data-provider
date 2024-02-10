// Relies on view ConsensusChainForPayout in the archive database 
// view can be created with script in deploy/db-setup/ConsensusChainForPayout.sql

import { Block, BlockSummary, Height } from '../models/blocks';
import { createBlockQueryPool } from './databaseFactory'
import configuration from '../configurations/environmentConfiguration';

console.log(`Creating query pool targeting ${configuration.blockDbQueryHost} at port ${configuration.blockDbQueryPort}`);
const pool = createBlockQueryPool(configuration.blockDbQueryConnectionSSL);

const blockQuery = `
    SELECT
      blockHeight,
      stateHash,
      stakingLedgerHash,
      blockDateTime,
      slot,
      globalSlotSinceGenesis,
      creatorPublicKey,
      winnerPublicKey,
      recevierPublicKey,
      coinbase,
      feeTransferToReceiver,
      feeTransferFromCoinbase,
      userCommandTransactionFees
    FROM consensus_chain_for_payout
    WHERE creatorPublicKey = $1
      AND blockHeight >= $2
      AND blockHeight <= $3
    ORDER BY blockHeight DESC;
`;

const getNullParentsQuery = `
    SELECT height FROM blocks WHERE parent_id is null AND height >= $1 AND height <= $2
`;

export async function getLatestBlock(){
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

export async function getMinMaxBlocksInSlotRange(min: number, max:number){
  const query = `
        SELECT min(blockHeight) as epochminblockheight, max(blockHeight) as epochmaxblockheight
        FROM consensus_chain_for_payout
        WHERE globalSlotSinceGenesis between CAST($1 AS INTEGER) and CAST($2 AS INTEGER)`;
  const result = await pool.query(query, [min, max]);
  const epochminblockheight = result.rows[0].epochminblockheight;
  const epochmaxblockheight = result.rows[0].epochmaxblockheight;
  return [epochminblockheight, epochmaxblockheight];
}

export async function getBlocks(key: string, minHeight:number, maxHeight: number){
  const missingHeights: number[] = await getHeightMissing(minHeight, maxHeight);
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
}

export async function getEpoch(hash: string, userSpecifiedEpoch: number | null) {
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
      else if (epoch == 0 && (userSpecifiedEpoch == 0 || userSpecifiedEpoch == 1)) {
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

async function getHeightMissing(minHeight: number, maxHeight: number) {
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
  
async function getNullParents(minHeight: number, maxHeight: number) {
  const result = await pool.query(getNullParentsQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}