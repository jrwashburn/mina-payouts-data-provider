import { 
  getStakingLedgers,
  getStakingLedgersByEpoch,
  hashExists,
  insertBatch,
  updateEpoch
} from '../stakingLedgerDb.js';
import { StakingLedgerSourceRow } from '../../models/stakes.js';

jest.mock('pg');

jest.mock('../blockArchiveDb.js', () => ({
  getEpoch: jest.fn().mockResolvedValue(5)
}));

describe('Staking Ledger Database', () => {
  let mockPool: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPool = {
      query: jest.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
      connect: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
      release: jest.fn(),
    };
    
    mockPool.connect.mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    });
  });
  
  describe('getStakingLedgers', () => {
    it('should return ledger entries for a given hash and key', async () => {
      const mockRows = [
        {
          public_key: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          balance: '66000000000',
          delegate_key: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          timing_initial_minimum_balance: '66000000000',
          timing_cliff_time: '1',
          timing_cliff_amount: '1000000000',
          timing_vesting_period: '1',
          timing_vesting_increment: '1000000000'
        }
      ];
      
      mockPool.query.mockResolvedValueOnce({ rows: mockRows });
      
      const result = await getStakingLedgers('test-hash', 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g', mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].pk).toBe('B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g');
    });
  });
  
  describe('getStakingLedgersByEpoch', () => {
    it('should return ledger entries for a given key and epoch', async () => {
      const mockRows = [
        {
          public_key: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          balance: '66000000000',
          delegate_key: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          timing_initial_minimum_balance: '66000000000',
          timing_cliff_time: '1',
          timing_cliff_amount: '1000000000',
          timing_vesting_period: '1',
          timing_vesting_increment: '1000000000'
        }
      ];
      
      mockPool.query.mockResolvedValueOnce({ rows: mockRows });
      
      const result = await getStakingLedgersByEpoch('B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g', 5, mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].pk).toBe('B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g');
    });
  });
  
  describe('hashExists', () => {
    it('should return true and epoch when hash exists', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ count: '1' }] 
      });
      
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ epoch: 5 }] 
      });
      
      const [exists, epoch] = await hashExists('test-hash', null, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(exists).toBe(true);
      expect(epoch).toBe(5);
    });
    
    it('should return false when hash does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ count: '0' }] 
      });
      
      const [exists, epoch] = await hashExists('test-hash', null, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(exists).toBe(false);
      expect(epoch).toBe(-1);
    });
    
    it('should check for specific epoch when provided', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ count: '1' }] 
      });
      
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ count: '1' }] 
      });
      
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ epoch: 3 }] 
      });
      
      const [exists, epoch] = await hashExists('test-hash', 3, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(exists).toBe(true);
      expect(epoch).toBe(3);
    });
  });
  
  describe('insertBatch', () => {
    it('should insert batch of staking ledger data', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      
      mockPool.connect.mockResolvedValueOnce(mockClient);
      
      const mockData: StakingLedgerSourceRow[] = [
        {
          pk: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          balance: '66000000000',
          delegate: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          timing: {
            initial_minimum_balance: '66000000000',
            cliff_time: '1',
            cliff_amount: '1000000000',
            vesting_period: '1',
            vesting_increment: '1000000000'
          },
          token: '1',
          nonce: '0',
          receipt_chain_hash: '',
          voting_for: ''
        }
      ];
      
      await insertBatch(mockData, 'test-hash', 5, mockPool);
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO staking_ledger'), expect.any(Array));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      
      mockPool.connect.mockResolvedValueOnce(mockClient);
      
      mockClient.query.mockResolvedValueOnce({});
      
      mockClient.query.mockRejectedValueOnce(new Error('Insert failed'));
      
      mockClient.query.mockResolvedValueOnce({});
      
      const mockData: StakingLedgerSourceRow[] = [
        {
          pk: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          balance: '66000000000',
          delegate: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g',
          timing: {
            initial_minimum_balance: '66000000000',
            cliff_time: '1',
            cliff_amount: '1000000000',
            vesting_period: '1',
            vesting_increment: '1000000000'
          },
          token: '1',
          nonce: '0',
          receipt_chain_hash: '',
          voting_for: ''
        }
      ];
      
      await expect(insertBatch(mockData, 'test-hash', 5, mockPool))
        .rejects.toThrow('Insert failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('updateEpoch', () => {
    it('should update epoch for a given hash', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      await updateEpoch('test-hash', 5, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE staking_ledger SET epoch'),
        ['5', 'test-hash']
      );
    });
  });
});
