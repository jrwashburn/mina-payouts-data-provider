import { Configuration } from './configuration.js';

/**
 * Creates a test configuration with mock values for testing
 */
export function createTestConfiguration(): Configuration {
  return {
    port: 3000,
    slotsPerEpoch: 7140,
    
    ledgerUploadApiUser: 'test-user',
    ledgerUploadApiPassword: 'test-password',
    
    blockDbQueryConnectionSSL: false,
    blockDbQueryCertificate: '',
    blockDbQueryUser: 'test-user',
    blockDbQueryPassword: 'test-password',
    blockDbQueryHost: 'localhost',
    blockDbQueryPort: 5432,
    blockDbQueryName: 'test-db',
    blockDbVersion: '1.0.0',
    
    ledgerDbQueryConnectionSSL: false,
    ledgerDbQueryCertificate: '',
    ledgerDbQueryUser: 'test-user',
    ledgerDbQueryPassword: 'test-password',
    ledgerDbQueryHost: 'localhost',
    ledgerDbQueryPort: 5432,
    ledgerDbQueryName: 'test-db',
    
    ledgerDbCommandConnectionSSL: false,
    ledgerDbCommandCertificate: '',
    ledgerDbCommandUser: 'test-user',
    ledgerDbCommandPassword: 'test-password',
    ledgerDbCommandHost: 'localhost',
    ledgerDbCommandPort: 5432,
    ledgerDbCommandName: 'test-db',
    
    checkNodes: ['http://localhost:3085'],
    
    logLevel: 'info',
    
    trustArchiveDatabaseHeight: true,
    archiveDbCheckInterval: 5,
    archiveDbRecencyThreshold: 10
  };
}
