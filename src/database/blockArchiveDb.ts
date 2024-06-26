import { Block, BlockSummary, Height } from '../models/blocks';
import { createBlockQueryPool } from './databaseFactory'
import { getLastestBlockQuery, getMinMaxBlocksInSlotRangeQuery, getHeightMissingQuery, getNullParentsQuery, getEpochQuery, getBlocksQuery, getPoolCreatorIdQuery } from './blockQueryFactory';

const pool = createBlockQueryPool();

export async function getLatestBlock(): Promise<BlockSummary> {
  const result = await pool.query(getLastestBlockQuery);
  const blockSummary: BlockSummary = result.rows[0];
  return blockSummary;
}

export async function getMinMaxBlocksInSlotRange(min: number, max: number, fork: number): Promise<[number, number]> {
  const result = await pool.query(getMinMaxBlocksInSlotRangeQuery(fork), [min, max]);
  const epochminblockheight = result.rows[0].epochminblockheight;
  const epochmaxblockheight = result.rows[0].epochmaxblockheight;
  return [epochminblockheight, epochmaxblockheight];
}

export async function getHeightMissing(minHeight: number, maxHeight: number): Promise<number[]> {
  const result = await pool.query(getHeightMissingQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}

export async function getNullParents(minHeight: number, maxHeight: number): Promise<number[]> {
  const result = await pool.query(getNullParentsQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}

export async function getBlocks(key: string, minHeight: number, maxHeight: number): Promise<Block[]> {
  await validateConsistency(minHeight, maxHeight);
  const creatorResult = await pool.query(getPoolCreatorIdQuery, [key]);
  const creatorId = creatorResult.rows[0].id;
  const result = await pool.query(getBlocksQuery, [key, minHeight.toString(), maxHeight.toString(), creatorId]);
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

export async function getEpoch(hash: string, userSpecifiedEpoch: number | null): Promise<number> {
  if (!process.env.NUM_SLOTS_IN_EPOCH) throw Error('ERROR: NUM_SLOTS_IN_EPOCH not present in .env file. ');
  const result = await pool.query(getEpochQuery, [hash]);

  if (result.rows[0].min && result.rows[0].max) {
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