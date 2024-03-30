import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client/core';
import cron from 'node-cron';
import configuration from '../configurations/environmentConfiguration';
import { getLatestBlock, getHeightMissing, getNullParents } from '../database/blockArchiveDb';
import { BlockSummary } from '../models/blocks';
import { logger } from '../index';

// Define the GraphQL query
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

// Create a function that sends the GraphQL query to a node and returns the block height
async function getBlockHeightFromNode(node: string): Promise<number> {
  const client = new ApolloClient({
    link: new HttpLink({ uri: node, fetch }),
    cache: new InMemoryCache(),
  });
  const { data } = await client.query({ query });
  return Number(data.bestChain[0].protocolState.consensusState.blockHeight);
}

// Create a function that gets the current block height from the /consensus endpoint
async function getCurrentBlockHeight(): Promise<number> {
  const blockSummary: BlockSummary = await getLatestBlock();
  return blockSummary.blockheight;
}

// Create a function that compares the block heights and updates the database if necessary
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
      if (error instanceof Error && 'response' in error) {
        logger.warn('Raw response:', error.response);
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

async function checkMissingHeightsLast5000Blocks(): Promise<boolean> {
  let trustArchive = true
  const blockHeightFromArchiveDb = await getCurrentBlockHeight();
  const lowerBoundary = blockHeightFromArchiveDb - 5000 > 0 ? blockHeightFromArchiveDb - 5000 : 0;
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

async function checkNullParentsLast5000Blocks(): Promise<boolean> {
  let trustArchive = true
  const blockHeightFromArchiveDb = await getCurrentBlockHeight();
  const lowerBoundary = blockHeightFromArchiveDb - 5000 > 0 ? blockHeightFromArchiveDb - 5000 : 0;
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
    const noMissingBlocks = await checkMissingHeightsLast5000Blocks();
    const noNullParents = await checkNullParentsLast5000Blocks();
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
