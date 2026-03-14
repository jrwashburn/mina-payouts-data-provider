import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool, QueryResult } from 'pg';
import {
  queryBlockProduction,
  queryMiningFees,
  querySnarkFees,
  queryPayments,
  queryZkApps,
  queryDelegations,
} from '../../../src/database/taxExportDb.js';

describe('taxExportDb', () => {
  let mockPool: Pool;
  const testAccounts = ['B62qTest1', 'B62qTest2'];
  const startTimestamp = '1704067200000'; // 2024-01-01 00:00:00 UTC
  const endTimestamp = '1706745600000'; // 2024-02-01 00:00:00 UTC

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    } as any;
  });

  describe('queryBlockProduction', () => {
    it('should query block production rewards with correct parameters', async () => {
      const mockRows = [
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: '1704067200000',
          creator_key: 'B62qTest1',
          total_reward: '1440000000',
        },
      ];

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: mockRows,
      } as QueryResult);

      const result = await queryBlockProduction(
        mockPool,
        testAccounts,
        startTimestamp,
        endTimestamp
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('blocks_internal_commands'),
        [testAccounts, startTimestamp, endTimestamp]
      );
      expect(result).toEqual(mockRows);
    });

    it('should filter by canonical chain status', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryBlockProduction(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("chain_status = 'canonical'");
    });

    it('should filter by coinbase command type', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryBlockProduction(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("command_type = 'coinbase'");
    });

    it('should use timestamp range with >= and <', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryBlockProduction(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('>=');
      expect(query).toContain('<');
    });
  });

  describe('queryMiningFees', () => {
    it('should query mining fees with correct parameters', async () => {
      const mockRows = [
        {
          height: 12345,
          state_hash: 'jxHash1',
          timestamp: '1704067200000',
          receiver_key: 'B62qTest1',
          amount: '141712112',
          tx_hash: 'CkpHash1',
        },
      ];
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: mockRows } as QueryResult);

      const result = await queryMiningFees(mockPool, testAccounts, startTimestamp, endTimestamp);

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [
        testAccounts,
        startTimestamp,
        endTimestamp,
      ]);
      expect(result).toEqual(mockRows);
    });

    it('should include coinbase receiver (receiver == coinbase receiver)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryMiningFees(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('ic_fee.receiver_id = ic_coinbase.receiver_id');
      expect(query).toContain("ic_coinbase.command_type = 'coinbase'");
    });

    it('should include both fee_transfer and fee_transfer_via_coinbase', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryMiningFees(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("IN ('fee_transfer', 'fee_transfer_via_coinbase')");
    });
  });

  describe('querySnarkFees', () => {
    it('should query SNARK fees with correct parameters', async () => {
      const mockRows = [
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: '1704067200000',
          receiver_key: 'B62qTest1',
          amount: '100000000',
          tx_hash: 'CkpTestHash',
        },
      ];

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: mockRows,
      } as QueryResult);

      const result = await querySnarkFees(
        mockPool,
        testAccounts,
        startTimestamp,
        endTimestamp
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRows);
    });

    it('should include both fee_transfer and fee_transfer_via_coinbase', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await querySnarkFees(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("IN ('fee_transfer', 'fee_transfer_via_coinbase')");
    });

    it('should exclude coinbase receiver (receiver != coinbase receiver)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await querySnarkFees(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('ic_fee.receiver_id != ic_coinbase.receiver_id');
      expect(query).toContain("ic_coinbase.command_type = 'coinbase'");
    });
  });

  describe('queryPayments', () => {
    it('should query payments with correct parameters', async () => {
      const mockRows = [
        {
          height: 12345,
          tx_hash: 'CkpTestHash',
          timestamp: '1704067200000',
          from_key: 'B62qSender',
          to_key: 'B62qTest1',
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: null,
        },
      ];

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: mockRows,
      } as QueryResult);

      const result = await queryPayments(
        mockPool,
        testAccounts,
        startTimestamp,
        endTimestamp
      );

      expect(result).toEqual(mockRows);
    });

    it('should query both sent and received payments (OR condition)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryPayments(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('pk_source.value = ANY');
      expect(query).toContain('pk_receiver.value = ANY');
      expect(query).toContain('OR');
    });

    it('should filter by payment command type', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryPayments(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("command_type = 'payment'");
    });

    it('should include account creation fee via LEFT JOIN', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryPayments(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('LEFT JOIN accounts_created');
    });
  });

  describe('queryZkApps', () => {
    it('should query zkApp transactions with correct parameters', async () => {
      const mockRows = [
        {
          zkapp_cmd_id: 1,
          tx_hash: 'CkpZkAppHash',
          height: 12345,
          timestamp: '1704067200000',
          memo: 'E4YTestMemo',
          fee_payer: 'B62qFeePayer',
          fee: '10000000',
          account_key: 'B62qTest1',
          net_balance_change: '1000000000',
        },
      ];

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: mockRows,
      } as QueryResult);

      const result = await queryZkApps(
        mockPool,
        testAccounts,
        startTimestamp,
        endTimestamp
      );

      expect(result).toEqual(mockRows);
    });

    it('should filter by applied status', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryZkApps(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("status = 'applied'");
    });

    it('should filter by MINA token (token_id = 1)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryZkApps(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('token_id = 1');
    });

    it('should exclude zero balance changes', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryZkApps(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("balance_change != '0'");
    });

    it('should aggregate balance changes with SUM', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryZkApps(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('SUM(balance_change)');
      expect(query).toContain('GROUP BY');
    });
  });

  describe('queryDelegations', () => {
    it('should query delegation transactions with correct parameters', async () => {
      const mockRows = [
        {
          height: 12345,
          tx_hash: 'CkpDelegationHash',
          timestamp: '1704067200000',
          source_key: 'B62qTest1',
          delegate_key: 'B62qDelegate',
          fee: '10000000',
          memo: 'E4YTestMemo',
        },
      ];

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: mockRows,
      } as QueryResult);

      const result = await queryDelegations(
        mockPool,
        testAccounts,
        startTimestamp,
        endTimestamp
      );

      expect(result).toEqual(mockRows);
    });

    it('should filter by delegation command type', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryDelegations(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain("command_type = 'delegation'");
    });

    it('should only query source accounts (not delegates)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

      await queryDelegations(mockPool, testAccounts, startTimestamp, endTimestamp);

      const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
      expect(query).toContain('pk_source.value = ANY');
      expect(query).not.toContain('pk_receiver.value = ANY');
    });
  });

  describe('Common Query Patterns', () => {
    it('all queries should filter by canonical chain', async () => {
      const queries = [
        queryBlockProduction,
        queryMiningFees,
        querySnarkFees,
        queryPayments,
        queryZkApps,
        queryDelegations,
      ];

      for (const queryFn of queries) {
        vi.mocked(mockPool.query).mockClear();
        vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

        await queryFn(mockPool, testAccounts, startTimestamp, endTimestamp);

        const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
        expect(query).toContain("chain_status = 'canonical'");
      }
    });

    it('all queries should order by timestamp', async () => {
      const queries = [
        queryBlockProduction,
        queryMiningFees,
        querySnarkFees,
        queryPayments,
        queryDelegations,
      ];

      for (const queryFn of queries) {
        vi.mocked(mockPool.query).mockClear();
        vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] } as QueryResult);

        await queryFn(mockPool, testAccounts, startTimestamp, endTimestamp);

        const query = vi.mocked(mockPool.query).mock.calls[0][0] as string;
        expect(query.toLowerCase()).toContain('order by');
        expect(query.toLowerCase()).toContain('timestamp');
      }
    });
  });
});
