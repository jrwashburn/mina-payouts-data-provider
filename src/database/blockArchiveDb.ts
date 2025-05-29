import { Block, BlockSummary, Height } from '../models/blocks.js';
import { createBlockQueryPool } from './databaseFactory.js'
import { getLastestBlockQuery, getMinMaxBlocksInSlotRangeQuery, getHeightMissingQuery, getNullParentsQuery, getEpochQuery, getBlocksQuery, getPoolCreatorIdQuery } from './blockQueryFactory.js';
import { Pool } from 'pg';

let defaultPool: Pool | null = null;

function getPool(): Pool {
  if (!defaultPool) {
    defaultPool = createBlockQueryPool();
  }
  return defaultPool;
}

export async function getLatestBlock(customPool?: Pool): Promise<BlockSummary> {
  const pool = customPool || getPool();
  const result = await pool.query(getLastestBlockQuery);
  const blockSummary: BlockSummary = result.rows[0];
  return blockSummary;
}

export async function getMinMaxBlocksInSlotRange(min: number, max: number, fork: number, customPool?: Pool): Promise<[number, number]> {
  const pool = customPool || getPool();
  const result = await pool.query(getMinMaxBlocksInSlotRangeQuery(fork), [min, max]);
  const row = result.rows[0] as unknown as { epochminblockheight: number; epochmaxblockheight: number };
  return [row.epochminblockheight, row.epochmaxblockheight];
}

export async function getHeightMissing(minHeight: number, maxHeight: number, customPool?: Pool): Promise<number[]> {
  const pool = customPool || getPool();
  const result = await pool.query(getHeightMissingQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows as unknown as Height[];
  return heights.map((x) => x.height);
}

export async function getNullParents(minHeight: number, maxHeight: number, customPool?: Pool): Promise<number[]> {
  const pool = customPool || getPool();
  const result = await pool.query(getNullParentsQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows as unknown as Height[];
  return heights.map((x) => x.height);
}

export async function getBlocks(key: string, minHeight: number, maxHeight: number, customPool?: Pool): Promise<Block[]> {
  await validateConsistency(minHeight, maxHeight, customPool);
  const pool = customPool || getPool();
  const creatorResult = await pool.query(getPoolCreatorIdQuery, [key]);
  if (creatorResult.rows.length > 0 && 'id' in creatorResult.rows[0]) {
    const creatorId = (creatorResult.rows[0] as unknown as { id: number }).id;
    const result = await pool.query(getBlocksQuery, [key, minHeight.toString(), maxHeight.toString(), creatorId]);
    const blocks: Block[] = result.rows.map((row: any) => ({
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
  } else {
    throw new Error(`No creator ID found for key: ${key}`);
  }
}

export async function getEpoch(hash: string, userSpecifiedEpoch: number | null, customPool?: Pool): Promise<number> {
  if (!process.env.NUM_SLOTS_IN_EPOCH) throw Error('ERROR: NUM_SLOTS_IN_EPOCH not present in .env file. ');
  const pool = customPool || getPool();
  const result = await pool.query(getEpochQuery, [hash]);

  if (result.rows.length > 0 && 'min' in result.rows[0] && 'max' in result.rows[0]) {
    const minGlobalSlot = Number.parseFloat(String(result.rows[0].min));
    const maxGlobalSlot = Number.parseFloat(String(result.rows[0].max));
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
  return -1;
}

export async function validateConsistency(minHeight: number, maxHeight: number, customPool?: Pool): Promise<void> {
  const missingHeights: number[] = await getHeightMissing(minHeight, maxHeight, customPool);
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
  const nullParents = await getNullParents(minHeight, maxHeight, customPool);
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

}
