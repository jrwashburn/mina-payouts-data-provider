import apolloCore from '@apollo/client/core/core.cjs';
import cron from 'node-cron';
import configuration from '../configurations/environmentConfiguration.js';
import { getLatestBlock, getHeightMissing, getNullParents } from '../database/blockArchiveDb.js';
import { BlockSummary } from '../models/blocks.js';
import { logger } from '../index.js';

const { ApolloClient, InMemoryCache, HttpLink, gql } = apolloCore;

interface BestChainQuery {
  bestChain: Array<{
    protocolState: {
      consensusState: {
        blockHeight: string;
        epoch: number;
        slot: number;
        slotSinceGenesis: number;
      };
    };
  }>;
}

const query = gql`
  query MyQuery {
    bestChain(maxLength: 1) {
      protocolState {
        consensusState {
          blockHeight
          epoch
          slot
          slotSinceGenesis
        }
      }
    }
  }
`;

async function getBlockHeightFromNode(node: string): Promise<number> {
  const client = new ApolloClient({
    link: new HttpLink({ uri: node, fetch }),
    cache: new InMemoryCache(),
  });
  const { data } = await client.query<BestChainQuery>({ query });
  if (!data) {
    throw new Error('No data returned from GraphQL query');
  }
  return Number(data.bestChain[0].protocolState.consensusState.blockHeight);
}

async function getCurrentBlockHeight(): Promise<number> {
  const blockSummary: BlockSummary = await getLatestBlock();
  return blockSummary.blockheight;
}

async function compareBlockHeights(): Promise<boolean> {
  let trustArchive = true;
  let blockHeightFromNode = 0;
  for (const checkNode of configuration.checkNodes) {
    try {
      const newBlockHeight = await getBlockHeightFromNode(checkNode);
      if (newBlockHeight > blockHeightFromNode) {
        blockHeightFromNode = newBlockHeight;
      }
    } catch (error) {
      logger.warn(`Failed to get block height from node ${checkNode}: ${error}`);
      const response = (error as { response?: unknown }).response;
      if (response !== undefined) {
        logger.warn({ response }, 'Raw response:');
      }
    }
  }
  if (blockHeightFromNode == 0) {
    logger.error('Failed to get block height from all nodes');
    trustArchive = false;
    return trustArchive;
  }
  const blockHeightFromArchiveDb = await getCurrentBlockHeight();
  // If the block height from the node is greater than the block height from the archive db by more than env configured threshold blocks
  // then you cannot trust the archive db height updating the configuration value trustArchiveDatabaseHeight to false will cause all apis to start returning errors.
  if (blockHeightFromNode - configuration.archiveDbRecencyThreshold >= blockHeightFromArchiveDb) {
    trustArchive = false;
    logger.warn(`Current archive db block height: ${blockHeightFromArchiveDb}, block height from node(s): ${blockHeightFromNode}`);
  } else {
    trustArchive = true;
    logger.info(`Current archive db block height: ${blockHeightFromArchiveDb}, block height from node(s): ${blockHeightFromNode}`);
  }
  return trustArchive;
}

async function checkMissingHeightsLast7500Blocks(): Promise<boolean> {
  let trustArchive = true
  const blockHeightFromArchiveDb = await getCurrentBlockHeight();
  const lowerBoundary = blockHeightFromArchiveDb - 7500 > 0 ? blockHeightFromArchiveDb - 7500 : 0;
  const missingHeights = await getHeightMissing(lowerBoundary, blockHeightFromArchiveDb);
  if (missingHeights.length > 0) {
    logger.warn(`Archive database is missing blocks since height ${lowerBoundary}. Missing blocks: ${JSON.stringify(missingHeights)}`);
    trustArchive = false;
  } else {
    logger.info(`Archive database has all blocks since height ${lowerBoundary}`);
    trustArchive = true;
  }
  return trustArchive;
}

async function checkNullParentsLast7500Blocks(): Promise<boolean> {
  let trustArchive = true
  const blockHeightFromArchiveDb = await getCurrentBlockHeight();
  const lowerBoundary = blockHeightFromArchiveDb - 7500 > 0 ? blockHeightFromArchiveDb - 7500 : 0;
  const nullParents = await getNullParents(lowerBoundary, blockHeightFromArchiveDb);
  if (nullParents.length > 0) {
    logger.warn(`Archive database has null parents. The following blocks are missing parent: ${JSON.stringify(nullParents)}`);
    trustArchive = false;
  } else {
    logger.info(`Archive database has parents for all blocks since ${lowerBoundary}`);
    trustArchive = true;
  }
  return trustArchive;
}

async function validateArchiveDb() {
  try {
    const dbInSyncWithNodes = await compareBlockHeights();
    const noMissingBlocks = await checkMissingHeightsLast7500Blocks();
    const noNullParents = await checkNullParentsLast7500Blocks();
    logger.info(`Archive db validation results: dbInSyncWithNodes: ${dbInSyncWithNodes}, noMissingBlocks: ${noMissingBlocks}, noNullParents: ${noNullParents}`);
    if (dbInSyncWithNodes && noMissingBlocks && noNullParents) {
      logger.info('Archive db is trusted. All checks passed.');
      configuration.trustArchiveDatabaseHeight = true;
    } else {
      logger.error('Archive db is NOT trusted. One or more checks failed.');
      configuration.trustArchiveDatabaseHeight = false;
    }
  } catch (error) {
    logger.error(`Failed to validate archive db: ${error}`);
  }
}

export default function startBackgroundTask() {
  // Schedule every N minutes to check the archive db height vs. node heights based on env configuration
  const schedule = `*/${configuration.archiveDbCheckInterval} * * * *`
  logger.info(`Scheduling background task to check archive db height vs. node heights, and look for gaps in consensus chain every ${schedule}`);
  cron.schedule(schedule, validateArchiveDb);
}
