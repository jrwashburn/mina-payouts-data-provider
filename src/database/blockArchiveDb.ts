import { Block, BlockSummary, Height, EpochBlockRange, EpochSlotRange } from '../models/blocks';
import { createBlockQueryPool } from './databaseFactory'
import { getLastestBlockQuery, getMinMaxBlocksInSlotRangeQuery, getHeightMissingQuery, getNullParentsQuery, getEpochQuery, getBlocksQuery } from './blockQueryFactory';

const pool = createBlockQueryPool();

export async function getLatestBlock(): Promise<BlockSummary> {
  const result = await pool.query<BlockSummary>(getLastestBlockQuery);
  const blockSummary: BlockSummary = result.rows[0];
  return blockSummary;
}

export async function getMinMaxBlocksInSlotRange(min: number, max: number, fork: number): Promise<[bigint, bigint]> {
  const result = await pool.query<EpochBlockRange>(getMinMaxBlocksInSlotRangeQuery(fork), [min, max]);
  const epochminblockheight = result.rows[0].epochminblockheight;
  const epochmaxblockheight = result.rows[0].epochmaxblockheight;
  return [epochminblockheight, epochmaxblockheight];
}

async function getHeightMissing(minHeight: number, maxHeight: number): Promise<bigint[]> {
  const result = await pool.query<Height>(getHeightMissingQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}

async function getNullParents(minHeight: number, maxHeight: number): Promise<bigint[]> {
  const result = await pool.query<Height>(getNullParentsQuery, [minHeight, maxHeight]);
  const heights: Height[] = result.rows;
  return heights.map((x) => x.height);
}

export async function getBlocks(key: string, minHeight: number, maxHeight: number): Promise<Block[]> {
  const missingHeights: bigint[] = await getHeightMissing(minHeight, maxHeight);
  if (
    (minHeight === 0 && (missingHeights.length > 1 || missingHeights[0] != BigInt(0))) ||
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
    (minHeight === 0 && (nullParents.length > 1 || nullParents[0] != BigInt(1))) ||
    (minHeight > 0 && nullParents.length > 0)
  ) {
    throw new Error(
      `Archive database has null parents in the specified range. Import them and try again. Blocks with null parents were: ${JSON.stringify(
        nullParents,
      )}`,
    );
  }
  const result = await pool.query<Block>(getBlocksQuery, [key, minHeight, maxHeight]);
  const blocks: Block[] = result.rows.map(row => ({
    blockheight: BigInt(row.blockheight),
    statehash: String(row.statehash),
    stakingledgerhash: String(row.stakingledgerhash),
    blockdatetime: Number(row.blockdatetime),
    slot: BigInt(row.slot),
    globalslotsincegenesis: BigInt(row.globalslotsincegenesis),
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

export async function getEpoch(hash: string, userSpecifiedEpoch: number | null): Promise<bigint> {
  if (!process.env.NUM_SLOTS_IN_EPOCH) throw Error('ERROR: NUM_SLOTS_IN_EPOCH not present in .env file. ');
  const result = await pool.query<EpochSlotRange>(getEpochQuery, [hash]);

  if (result.rows[0].epochminslot && result.rows[0].epochmaxslot) {
    const minSlot = result.rows[0].epochminslot;
    const maxSlot = result.rows[0].epochmaxslot;
    const slotsInEpoch: bigint = BigInt(process.env.NUM_SLOTS_IN_EPOCH);

    const epoch = minSlot / slotsInEpoch;
    const nextEpoch = (maxSlot + slotsInEpoch - BigInt(1)) / slotsInEpoch;
    if (epoch + BigInt(1) == nextEpoch) {
      return epoch;
    }
    else if (epoch === BigInt(0) && (userSpecifiedEpoch === 0 || userSpecifiedEpoch === 1)) {
      return BigInt(userSpecifiedEpoch);
    }
    else {
      throw new Error(`Error getting epoch, minGlobalSlot and maxGlobalSlot are from different epochs. 
        If this is the genesis ledger, please specify the epoch in the request.
        Epoch: ${epoch}, Next Epoch: ${nextEpoch}, User Specified Epoch: ${userSpecifiedEpoch}, minGlobalSlot: ${minSlot}, maxGlobalSlot: ${maxSlot}`);
    }
  }
  return BigInt(-1);
}

