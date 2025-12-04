/**
 * Vitest setup file
 * This file runs before all tests and can be used to configure global test settings
 */

import { vi } from 'vitest';
import consensusFixture from './fixtures/consensus.json' with { type: 'json' };
import blocksFixture from './fixtures/blocks.json' with { type: 'json' };
import epochFixture from './fixtures/epoch.json' with { type: 'json' };
import stakingLedgerFixture from './fixtures/staking-ledger.json' with { type: 'json' };

// Set default test environment variables before any imports
process.env.NUM_SLOTS_IN_EPOCH = process.env.NUM_SLOTS_IN_EPOCH || '7140';
process.env.API_PORT = process.env.API_PORT || '0'; // 0 = random available port
process.env.NODE_ENV = 'test';

// Mock the pg Pool to prevent actual database connections
vi.mock('pg', () => {
  const Pool = vi.fn(() => ({
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  }));
  return { Pool };
});

// Mock the database modules with fixture data - Vitest handles ES modules properly!
vi.mock('../src/database/blockArchiveDb.js', () => ({
  getLatestBlock: vi.fn(() => Promise.resolve({
    epoch: consensusFixture.epoch,
    blockheight: consensusFixture.blockHeight, // Return as string to match real database
    globalslotsincegenesis: consensusFixture.globalSlotSinceGenesis, // Return as string to match real database
    globalslot: Number(consensusFixture.globalSlotSinceGenesis),
    slot: consensusFixture.slot,
    statehash: consensusFixture.stateHash,
    parenthash: consensusFixture.parentHash,
    ledgerhash: consensusFixture.ledgerHash,
    datetime: consensusFixture.datetime,
  })),
  getBlocks: vi.fn((key: string, minHeight: number, maxHeight: number) => {
    // Return empty array for unrealistic height ranges
    if (minHeight > 1000000 || maxHeight > 1000000) {
      return Promise.resolve([]);
    }
    return Promise.resolve(blocksFixture.blocks);
  }),
  getMinMaxBlocksInSlotRange: vi.fn(() => Promise.resolve([
    epochFixture.minBlockHeight, // Return as string to match real database
    epochFixture.maxBlockHeight  // Return as string to match real database
  ])),
  getHeightMissing: vi.fn(() => Promise.resolve([])),
  getNullParents: vi.fn(() => Promise.resolve([])),
  validateConsistency: vi.fn(() => Promise.resolve(undefined)),
  getEpoch: vi.fn(() => Promise.resolve(1)),
}));

vi.mock('../src/database/stakingLedgerDb.js', () => ({
  getStakingLedgers: vi.fn((hash: string) => {
    // Return empty array for unknown hashes
    if (hash === 'nonexistenthash') {
      return Promise.resolve([]);
    }
    return Promise.resolve(stakingLedgerFixture.ledgerEntries);
  }),
  hashExists: vi.fn((hash: string) => {
    // Return false for unknown hashes
    if (hash === 'nonexistenthash') {
      return Promise.resolve([false, null]);
    }
    return Promise.resolve([true, 1]);
  }),
}));

export default {};
