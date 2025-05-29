import { createConfig, createBlockQueryPool, createLedgerQueryPool, createStakingLedgerCommandPool } from '../databaseFactory.js';
import { createTestConfiguration } from '../../models/testConfiguration.js';
import { Pool } from 'pg';

jest.mock('pg');

describe('Database Factory', () => {
  const testConfig = createTestConfiguration();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createConfig', () => {
    it('should create a config without SSL when useSSL is false', () => {
      const config = createConfig(
        'test-user',
        'localhost',
        'test-db',
        'test-password',
        5432,
        '',
        false
      );
      
      expect(config).toEqual({
        user: 'test-user',
        host: 'localhost',
        database: 'test-db',
        password: 'test-password',
        port: 5432
      });
    });
    
    it('should create a config with SSL when useSSL is true', () => {
      const config = createConfig(
        'test-user',
        'localhost',
        'test-db',
        'test-password',
        5432,
        'test-certificate',
        true
      );
      
      expect(config).toEqual({
        user: 'test-user',
        host: 'localhost',
        database: 'test-db',
        password: 'test-password',
        port: 5432,
        connectionTimeoutMillis: 2000,
        idleTimeoutMillis: 10000,
        ssl: {
          ca: 'test-certificate',
          rejectUnauthorized: false,
        }
      });
    });
  });
  
  describe('createBlockQueryPool', () => {
    it('should create a pool with the correct configuration', () => {
      const pool = createBlockQueryPool(testConfig);
      
      expect(Pool).toHaveBeenCalledWith({
        user: testConfig.blockDbQueryUser,
        host: testConfig.blockDbQueryHost,
        database: testConfig.blockDbQueryName,
        password: testConfig.blockDbQueryPassword,
        port: testConfig.blockDbQueryPort
      });
      
      expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
  
  describe('createLedgerQueryPool', () => {
    it('should create a pool with the correct configuration', () => {
      const pool = createLedgerQueryPool(testConfig);
      
      expect(Pool).toHaveBeenCalledWith({
        user: testConfig.ledgerDbQueryUser,
        host: testConfig.ledgerDbQueryHost,
        database: testConfig.ledgerDbQueryName,
        password: testConfig.ledgerDbQueryPassword,
        port: testConfig.ledgerDbQueryPort
      });
      
      expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
  
  describe('createStakingLedgerCommandPool', () => {
    it('should create a pool with the correct configuration', () => {
      const pool = createStakingLedgerCommandPool(testConfig);
      
      expect(Pool).toHaveBeenCalledWith({
        user: testConfig.ledgerDbCommandUser,
        host: testConfig.ledgerDbCommandHost,
        database: testConfig.ledgerDbCommandName,
        password: testConfig.ledgerDbCommandPassword,
        port: testConfig.ledgerDbCommandPort
      });
      
      expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
