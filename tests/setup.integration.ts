/**
 * Vitest setup file for integration tests
 * This file runs before integration tests and does NOT mock database connections
 * Integration tests will connect to real PostgreSQL databases via docker-compose.test.yml
 */

// Set test environment variables
// These should match or be overridden by tests/.env.test.integration
process.env.NUM_SLOTS_IN_EPOCH = process.env.NUM_SLOTS_IN_EPOCH || '7140';
process.env.API_PORT = process.env.API_PORT || '0'; // 0 = random available port
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
// Provide CHECK_NODES to satisfy configuration validation in routes
process.env.CHECK_NODES = process.env.CHECK_NODES || 'http://localhost:3001';

// No database mocks - integration tests will use real database connections
// Make sure to start test databases with: npm run test:db:start

export default {};
