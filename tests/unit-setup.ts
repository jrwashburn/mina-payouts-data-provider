/**
 * Vitest setup file for unit tests
 * This file runs before unit tests - does NOT mock database modules
 * Unit tests will mock dependencies at the test level for more granular control
 */

// Set default test environment variables before any imports
process.env.NUM_SLOTS_IN_EPOCH = process.env.NUM_SLOTS_IN_EPOCH || '7140';
process.env.FORK_1_START_SLOT = process.env.FORK_1_START_SLOT || '564480';
process.env.FORK_2_START_SLOT = process.env.FORK_2_START_SLOT || '0'; // Disabled by default
process.env.API_PORT = process.env.API_PORT || '0';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

export default {};
