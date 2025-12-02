/**
 * Jest setup file
 * This file runs before all tests and can be used to configure global test settings
 */

// Set default test environment variables before any imports
process.env.NUM_SLOTS_IN_EPOCH = process.env.NUM_SLOTS_IN_EPOCH || '7140';
process.env.API_PORT = process.env.API_PORT || '0'; // 0 = random available port
process.env.NODE_ENV = 'test';

// Set a longer timeout for integration tests that might hit real endpoints
jest.setTimeout(10000);

export default {};
