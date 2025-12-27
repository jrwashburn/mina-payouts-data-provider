/**
 * Unit tests for environmentConfiguration.ts
 * Focus: Configuration loading and validation, especially fork thresholds
 * Priority: P0 - CRITICAL (wrong config = wrong fork detection)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Prevent environmentConfiguration from loading values from .env during tests
vi.mock('dotenv', () => ({ config: () => undefined }));

describe('Configuration Loading & Fork Validation (P0-7)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set minimal valid environment
    process.env.API_PORT = '3000';
    process.env.NUM_SLOTS_IN_EPOCH = '7140';
    process.env.LEDGER_UPLOAD_API_USER = 'testuser';
    process.env.LEDGER_UPLOAD_API_PASSWORD = 'testpass';
    process.env.BLOCK_DB_QUERY_REQUIRE_SSL = 'false';
    process.env.BLOCK_DB_QUERY_USER = 'blockuser';
    process.env.BLOCK_DB_QUERY_PASSWORD = 'blockpass';
    process.env.BLOCK_DB_QUERY_HOST = 'localhost';
    process.env.BLOCK_DB_QUERY_PORT = '5432';
    process.env.BLOCK_DB_QUERY_NAME = 'archive';
    process.env.FORK_1_START_SLOT = '564480';
    process.env.FORK_2_START_SLOT = '0';
    process.env.LEDGER_DB_QUERY_REQUIRE_SSL = 'false';
    process.env.LEDGER_DB_QUERY_USER = 'ledgeruser';
    process.env.LEDGER_DB_QUERY_PASSWORD = 'ledgerpass';
    process.env.LEDGER_DB_QUERY_HOST = 'localhost';
    process.env.LEDGER_DB_QUERY_PORT = '5433';
    process.env.LEDGER_DB_QUERY_NAME = 'ledger';
    process.env.LEDGER_DB_COMMAND_REQUIRE_SSL = 'false';
    process.env.LEDGER_DB_COMMAND_USER = 'ledgercmduser';
    process.env.LEDGER_DB_COMMAND_PASSWORD = 'ledgercmdpass';
    process.env.LEDGER_DB_COMMAND_HOST = 'localhost';
    process.env.LEDGER_DB_COMMAND_PORT = '5433';
    process.env.LEDGER_DB_COMMAND_NAME = 'ledger';
    process.env.CHECK_NODES = 'http://localhost:3001';
    process.env.LOG_LEVEL = 'info';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to allow re-import with new env
    vi.resetModules();
  });

  describe('Fork 1 (Berkeley) Configuration', () => {
    it('should reject when FORK_1_START_SLOT is missing', async () => {
      // Arrange
      delete process.env.FORK_1_START_SLOT;

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/FORK_1_START_SLOT is missing/);
    });

    it('should reject when FORK_1_START_SLOT = 0 (invalid)', async () => {
      // Arrange
      process.env.FORK_1_START_SLOT = '0';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/FORK_1_START_SLOT must be a positive number/);
    });

    it('should reject when FORK_1_START_SLOT is negative', async () => {
      // Arrange
      process.env.FORK_1_START_SLOT = '-100';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/FORK_1_START_SLOT must be a positive number/);
    });

    it('should reject when FORK_1_START_SLOT is not a number', async () => {
      // Arrange
      process.env.FORK_1_START_SLOT = 'abc';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/FORK_1_START_SLOT must be a positive number/);
    });
  });

  describe('Fork 2 (Mesa) Configuration', () => {
    it('should allow FORK_2_START_SLOT = 0 (fork not activated)', async () => {
      // Arrange
      process.env.FORK_2_START_SLOT = '0';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.fork2StartSlot).toBe(0);
    });

    it('should reject when FORK_2_START_SLOT is negative', async () => {
      // Arrange
      process.env.FORK_2_START_SLOT = '-1';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/FORK_2_START_SLOT must be >= 0/);
    });

    it('should reject when FORK_2_START_SLOT ≤ FORK_1_START_SLOT', async () => {
      // Arrange
      process.env.FORK_1_START_SLOT = '564480';
      process.env.FORK_2_START_SLOT = '564480'; // Same as Fork 1

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/FORK_2_START_SLOT.*must be greater than FORK_1_START_SLOT/);
    });

    it('should allow FORK_2_START_SLOT = FORK_1_START_SLOT + 1 (valid edge case)', async () => {
      // Arrange
      process.env.FORK_1_START_SLOT = '564480';
      process.env.FORK_2_START_SLOT = '564481';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.fork1StartSlot).toBe(564480);
      expect(config.default.fork2StartSlot).toBe(564481);
    });

    it('should allow valid FORK_2_START_SLOT > FORK_1_START_SLOT', async () => {
      // Arrange
      process.env.FORK_1_START_SLOT = '564480';
      process.env.FORK_2_START_SLOT = '1000000';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.fork1StartSlot).toBe(564480);
      expect(config.default.fork2StartSlot).toBe(1000000);
    });
  });

  describe('NUM_SLOTS_IN_EPOCH Configuration', () => {
    it('should reject when NUM_SLOTS_IN_EPOCH ≠ 7140', async () => {
      // Arrange
      process.env.NUM_SLOTS_IN_EPOCH = '7000';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/NUM_SLOTS_IN_EPOCH is expected to be 7140/);
    });

    it('should accept NUM_SLOTS_IN_EPOCH = 7140', async () => {
      // Arrange
      process.env.NUM_SLOTS_IN_EPOCH = '7140';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.slotsPerEpoch).toBe(7140);
    });

    it('should reject when NUM_SLOTS_IN_EPOCH is not a number', async () => {
      // Arrange
      process.env.NUM_SLOTS_IN_EPOCH = 'abc';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/NUM_SLOTS_IN_EPOCH is expected to be 7140/);
    });
  });

  describe('Port Validation', () => {
    it('should reject when API_PORT < 0', async () => {
      // Arrange
      process.env.API_PORT = '-1';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/Ports must be a number between 1 and 65535/);
    });

    it('should reject when API_PORT > 65535', async () => {
      // Arrange
      process.env.API_PORT = '65536';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/Ports must be a number between 1 and 65535/);
    });

    it('should reject when API_PORT is NaN', async () => {
      // Arrange
      process.env.API_PORT = 'abc';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/Ports must be a number between 1 and 65535/);
    });

    it('should allow API_PORT = 0 (random port)', async () => {
      // Arrange
      process.env.API_PORT = '0';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.port).toBe(0);
    });

    it('should allow valid ports (1-65535)', async () => {
      // Arrange
      process.env.API_PORT = '3000';
      process.env.BLOCK_DB_QUERY_PORT = '5432';
      process.env.LEDGER_DB_QUERY_PORT = '5433';
      process.env.LEDGER_DB_COMMAND_PORT = '5434';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.port).toBe(3000);
      expect(config.default.blockDbQueryPort).toBe(5432);
      expect(config.default.ledgerDbQueryPort).toBe(5433);
      expect(config.default.ledgerDbCommandPort).toBe(5434);
    });
  });

  describe('CHECK_NODES URL Validation', () => {
    it('should accept valid HTTP URL', async () => {
      // Arrange
      process.env.CHECK_NODES = 'http://localhost:3001';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.checkNodes).toEqual(['http://localhost:3001']);
    });

    it('should accept valid HTTPS URL', async () => {
      // Arrange
      process.env.CHECK_NODES = 'https://node.example.com:443/graphql';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.checkNodes).toEqual(['https://node.example.com:443/graphql']);
    });

    it('should accept comma-separated multiple URLs', async () => {
      // Arrange
      process.env.CHECK_NODES = 'http://node1.com:3001,https://node2.com:443';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.checkNodes).toEqual([
        'http://node1.com:3001',
        'https://node2.com:443',
      ]);
    });

    it('should reject malformed URL (no protocol)', async () => {
      // Arrange
      process.env.CHECK_NODES = 'localhost:3001';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/CHECK_NODES.*must contain validly formed/);
    });

    it('should reject invalid URL (invalid characters)', async () => {
      // Arrange
      process.env.CHECK_NODES = 'http://node with spaces:3001';

      // Act & Assert
      await expect(async () => {
        await import('../../../src/configurations/environmentConfiguration.js');
      }).rejects.toThrow(/CHECK_NODES.*must contain validly formed/);
    });

    it('should accept provided CHECK_NODES when set', async () => {
      // Arrange
      process.env.CHECK_NODES = 'http://localhost:3001';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.checkNodes).toEqual(['http://localhost:3001']);
    });
  });

  describe('Default Values', () => {
    it('should default FORK_2_START_SLOT to 0 if not provided', async () => {
      // Arrange
      delete process.env.FORK_2_START_SLOT;

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.fork2StartSlot).toBe(0);
    });

    it('should accept LOG_LEVEL = "info" when provided', async () => {
      // Arrange
      process.env.LOG_LEVEL = 'info';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.logLevel).toBe('info');
    });

    it('should default trustArchiveDatabaseHeight to true', async () => {
      // Arrange
      delete process.env.TRUST_ARCHIVE_DATABASE_HEIGHT;

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.trustArchiveDatabaseHeight).toBe(true);
    });

    it('should set trustArchiveDatabaseHeight to false when explicitly set', async () => {
      // Arrange
      process.env.TRUST_ARCHIVE_DATABASE_HEIGHT = 'false';

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.trustArchiveDatabaseHeight).toBe(false);
    });

    it('should default archiveDbCheckInterval to 2 if not provided', async () => {
      // Arrange
      delete process.env.ARCHIVE_DB_CHECK_INTERVAL;

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.archiveDbCheckInterval).toBe(2);
    });

    it('should default archiveDbRecencyThreshold to 5 if not provided', async () => {
      // Arrange
      delete process.env.ARCHIVE_DB_RECENCY_THRESHOLD;

      // Act
      const config = await import('../../../src/configurations/environmentConfiguration.js');

      // Assert
      expect(config.default.archiveDbRecencyThreshold).toBe(5);
    });
  });
});
