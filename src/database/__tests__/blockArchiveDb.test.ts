import { 
  getLatestBlock, 
  getMinMaxBlocksInSlotRange, 
  getHeightMissing, 
  getNullParents, 
  getBlocks, 
  getEpoch, 
  validateConsistency 
} from '../blockArchiveDb.js';
import { Pool } from 'pg';
import { BlockSummary } from '../../models/blocks.js';

jest.mock('pg');

jest.mock('pg');

describe('Block Archive Database', () => {
  let mockPool: jest.Mocked<Pool>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
  });
  
  describe('getLatestBlock', () => {
    it('should return the latest block summary', async () => {
      const mockBlockSummary: BlockSummary = {
        blockheight: 1000,
        globalslotsincegenesis: 7140,
        globalslot: 7140,
        statehash: 'test-hash',
        parenthash: 'parent-hash',
        ledgerhash: 'ledger-hash',
        datetime: '2023-01-01T00:00:00Z'
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [mockBlockSummary] });
      
      const result = await getLatestBlock(mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual(mockBlockSummary);
    });
  });
  
  describe('getMinMaxBlocksInSlotRange', () => {
    it('should return min and max block heights in slot range', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 100, epochmaxblockheight: 200 }]
      });
      
      const result = await getMinMaxBlocksInSlotRange(1000, 2000, 0, mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual([100, 200]);
    });
  });
  
  describe('getHeightMissing', () => {
    it('should return array of missing heights', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ height: 101 }, { height: 103 }]
      });
      
      const result = await getHeightMissing(100, 105, mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual([101, 103]);
    });
    
    it('should return empty array when no heights are missing', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getHeightMissing(100, 105, mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
  
  describe('getNullParents', () => {
    it('should return array of heights with null parents', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ height: 101 }, { height: 103 }]
      });
      
      const result = await getNullParents(100, 105, mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual([101, 103]);
    });
  });
  
  describe('getBlocks', () => {
    it('should return blocks for a given key and height range', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      });
      
      const mockBlocks = [
        {
          blockheight: 100,
          statehash: 'hash1',
          stakingledgerhash: 'ledger1',
          blockdatetime: 1000000,
          slot: 1,
          globalslotsincegenesis: 1000,
          creatorpublickey: 'creator1',
          winnerpublickey: 'winner1',
          receiverpublickey: 'receiver1',
          coinbase: 720000000000,
          feetransfertoreceiver: 10000000,
          feetransferfromcoinbase: 5000000,
          usercommandtransactionfees: 15000000
        }
      ];
      
      mockPool.query.mockResolvedValueOnce({
        rows: mockBlocks
      });
      
      const result = await getBlocks('B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g', 100, 105, mockPool);
      
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(1);
      expect(result[0].blockheight).toBe(100);
    });
    
    it('should throw error when creator ID is not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });
      
      await expect(getBlocks('B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g', 100, 105, mockPool))
        .rejects.toThrow('No creator ID found for key:');
    });
  });
  
  describe('getEpoch', () => {
    beforeEach(() => {
      process.env.NUM_SLOTS_IN_EPOCH = '7140';
    });
    
    it('should return epoch for a given ledger hash', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ min: 14280, max: 21419 }]
      });
      
      const result = await getEpoch('test-hash', null, mockPool);
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toBe(2); // 14280 / 7140 = 2
    });
    
    it('should throw error when ledger spans multiple epochs and no epoch is specified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ min: 14280, max: 28559 }]
      });
      
      await expect(getEpoch('test-hash', null, mockPool))
        .rejects.toThrow();
    });
    
    it('should use specified epoch when ledger spans multiple epochs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ min: 0, max: 7139 }]
      });
      
      const result = await getEpoch('test-hash', 0, mockPool);
      
      expect(result).toBe(0);
    });
  });
  
  describe('validateConsistency', () => {
    it('should not throw error when no missing heights or null parents', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      await expect(validateConsistency(100, 105, mockPool))
        .resolves.not.toThrow();
    });
    
    it('should throw error when missing heights are found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ height: 101 }, { height: 103 }]
      });
      
      await expect(validateConsistency(100, 105, mockPool))
        .rejects.toThrow('Archive database is missing blocks');
    });
    
    it('should throw error when null parents are found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ height: 101 }, { height: 103 }]
      });
      
      await expect(validateConsistency(100, 105, mockPool))
        .rejects.toThrow('Archive database has null parents');
    });
  });
});
