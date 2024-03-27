import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client/core';
import cron from 'node-cron';
import configuration from '../configurations/environmentConfiguration';
import * as db from '../database/blockArchiveDb';
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
async function getCurrentBlockHeight(): Promise<bigint> {
  const blockSummary: BlockSummary = await db.getLatestBlock();
  return blockSummary.blockheight;
}

// Create a function that compares the block heights and updates the database if necessary
async function compareBlockHeights() {
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
    logger.error('Failed to get higher block height from all nodes');
    return;
  }
  const blockHeightFromArchiveDb = await getCurrentBlockHeight();
  // If the block height from the node is greater than the block height from the archive db by more than env configured threshold blocks
  // then you cannot trust the archive db height updating the configuration value trustArchiveDatabaseHeight to false will cause all apis to start returning errors.
  if (blockHeightFromNode - configuration.archiveDbRecencyThreshold >= blockHeightFromArchiveDb) {
    configuration.trustArchiveDatabaseHeight = false;
  } else { configuration.trustArchiveDatabaseHeight = true; }
  logger.info(`Finished archive db trust check. Current archive db block height: ${blockHeightFromArchiveDb}, block height from node: ${blockHeightFromNode}, trustArchiveDatabaseHeight: ${configuration.trustArchiveDatabaseHeight}`);
}

export default function startBackgroundTask() {
  // Schedule every N minutes to check the archive db height vs. node heights based on env configuration
  const schedule = `*/${configuration.archiveDbCheckInterval} * * * *`
  logger.info(`Scheduling background task to check archive db height vs. node heights every ${schedule}`);
  cron.schedule(schedule, compareBlockHeights);
}
