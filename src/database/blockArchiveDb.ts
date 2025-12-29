import { Pool } from 'pg';
import { Block, BlockSummary, Height } from '../models/blocks.js';
import { createBlockQueryPool } from './databaseFactory.js'
import { getLastestBlockQuery, getHeightMissingQuery, getNullParentsQuery, getEpochQuery, getBlocksQuery, getMinMaxBlocksInSlotRangeQuery, getPoolCreatorIdQuery } from './blockQueryFactory.js';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = createBlockQueryPool();
  }
  return pool;
}

export async function getLatestBlock(): Promise<BlockSummary> {
  const result = await getPool().query(getLastestBlockQuery);
  const blockSummary: BlockSummary = result.rows[0];
  return blockSummary;
}

export async function getMinMaxBlocksInSlotRange(min: number, max: number): Promise<[number, number]> {
  const result = await getPool().query(getMinMaxBlocksInSlotRangeQuery, [min, max]);
  const row = result.rows[0] as unknown as { epochminblockheight: number; epochmaxblockheight: number };
  return [row.epochminblockheight, row.epochmaxblockheight];
}

export async function getHeightMissing(minHeight: number, maxHeight: number): Promise<number[]> {
  const result = await getPool().query(getHeightMissingQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows as unknown as Height[];
  return heights.map((x) => x.height);
}

export async function getNullParents(minHeight: number, maxHeight: number): Promise<number[]> {
  const result = await getPool().query(getNullParentsQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows as unknown as Height[];
  return heights.map((x) => x.height);
}

export async function getBlocks(key: string, minHeight: number, maxHeight: number): Promise<Block[]> {
  await validateConsistency(minHeight, maxHeight);
  const creatorResult = await getPool().query(getPoolCreatorIdQuery, [key]);
  if (creatorResult.rows.length > 0 && 'id' in creatorResult.rows[0]) {
    const creatorId = (creatorResult.rows[0] as unknown as { id: number }).id;
    const result = await getPool().query(getBlocksQuery, [key, minHeight.toString(), maxHeight.toString(), creatorId]);
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
  } else {
    throw new Error(`No creator ID found for key: ${key}`);
  }
}

export async function getEpoch(hash: string, userSpecifiedEpoch: number | null): Promise<number> {
  if (!process.env.NUM_SLOTS_IN_EPOCH) throw Error('ERROR: NUM_SLOTS_IN_EPOCH not present in .env file. ');
  const result = await getPool().query(getEpochQuery, [hash]);

  if (result.rows.length > 0) {
    const min = result.rows[0].min;
    const max = result.rows[0].max;

    // Check if values are null or undefined
    if (min == null || max == null) {
      return -1;
    }

    const minGlobalSlot = Number.parseFloat(String(min));
    const maxGlobalSlot = Number.parseFloat(String(max));

    // Verify parsed values are valid numbers
    if (Number.isNaN(minGlobalSlot) || Number.isNaN(maxGlobalSlot)) {
      return -1;
    }

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

export async function validateConsistency(minHeight: number, maxHeight: number): Promise<void> {
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

}