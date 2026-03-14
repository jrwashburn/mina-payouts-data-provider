import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import { getTaxExport } from '../../../src/controllers/taxExportQuery.js';
import type { TaxExportRequest } from '../../../src/models/taxExport.js';
import {
  queryBlockProduction,
  queryMiningFees,
  querySnarkFees,
  queryPayments,
  queryZkApps,
  queryDelegations,
} from '../../../src/database/taxExportDb.js';
import { decodeMemo } from '../../../src/utils/memoDecoder.js';
import { isPoolPayout } from '../../../src/utils/payoutDetector.js';
import { formatTaxData } from '../../../src/utils/taxFormatters.js';

// Mock all dependencies
vi.mock('../../../src/database/taxExportDb.js', () => ({
  queryBlockProduction: vi.fn(() => Promise.resolve([])),
  queryMiningFees: vi.fn(() => Promise.resolve([])),
  querySnarkFees: vi.fn(() => Promise.resolve([])),
  queryPayments: vi.fn(() => Promise.resolve([])),
  queryZkApps: vi.fn(() => Promise.resolve([])),
  queryDelegations: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../src/utils/memoDecoder.js', () => ({
  decodeMemo: vi.fn((memo) => memo || ''),
}));

vi.mock('../../../src/utils/payoutDetector.js', () => ({
  isPoolPayout: vi.fn(() => false),
}));

vi.mock('../../../src/utils/taxFormatters.js', () => ({
  formatTaxData: vi.fn(() => '[]'),
}));

describe('taxExportQuery - Request Validation', () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  describe('Account Validation', () => {
    it('should return error when accounts array is empty', async () => {
      const request: TaxExportRequest = {
        accounts: [],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('At least one account is required');
    });

    it('should return error when accounts exceed maximum limit', async () => {
      const request: TaxExportRequest = {
        accounts: Array(11).fill('B' + '1'.repeat(54)), // 11 accounts (max is 10)
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('Maximum 10 accounts per request');
    });

    it('should return error for invalid account key length', async () => {
      const request: TaxExportRequest = {
        accounts: ['B62qShortKey'], // Too short
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('Invalid account key length');
    });

    it('should accept valid account key (55 characters)', async () => {
      const validKey = 'B62q' + 'x'.repeat(51); // 55 chars total
      const request: TaxExportRequest = {
        accounts: [validKey],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });
  });

  describe('Date Validation', () => {
    const validAccount = 'B62q' + 'x'.repeat(51);

    it('should return error for invalid startDate', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: 'invalid-date',
        endDate: '2024-01-31',
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('startDate must be in YYYY-MM-DD format');
    });

    it('should return error for invalid endDate', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: 'invalid-date',
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('endDate must be in YYYY-MM-DD format');
    });

    it('should return error when endDate is before startDate', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-31',
        endDate: '2024-01-01',
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('endDate must be after startDate');
    });

    it('should return error when date range exceeds maximum (365 days)', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2023-01-01',
        endDate: '2024-01-02', // > 1 year
        format: 'json',
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('exceeds maximum of 365 days');
    });

    it('should accept date range at maximum limit (365 days)', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2023-01-01',
        endDate: '2023-12-31', // Exactly 365 days
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });

    it('should accept same day for start and end', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });
  });

  describe('Format Validation', () => {
    const validAccount = 'B62q' + 'x'.repeat(51);

    it('should return error for invalid format', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'invalid' as any,
      };

      await expect(getTaxExport(mockPool, request)).rejects.toThrow('Invalid format');
    });

    it('should accept koinly format', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'koinly',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });

    it('should accept ledgible format', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'ledgible',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });

    it('should accept blockpit format', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'blockpit',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });

    it('should accept json format', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
    });
  });
});

describe('taxExportQuery - Data Transformation', () => {
  let mockPool: Pool;
  const validAccount = 'B62q' + 'x'.repeat(51);
  const testTimestamp = '1704067200000'; // 2024-01-01 00:00:00 UTC

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  describe('Block Production Transformation', () => {
    it('should transform block rewards to tax events', async () => {
      vi.mocked(queryBlockProduction).mockResolvedValueOnce([
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: testTimestamp,
          receiver_key: validAccount,
          total_reward: '1440000000', // 1.44 MINA in nanomina
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      expect(formatTaxData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'coinbase_reward',
            accountKey: validAccount,
            blockHeight: 12345,
            isPoolPayout: false,
          }),
        ]),
        'json',
        false
      );
    });

    it('should convert nanomina to MINA for block rewards', async () => {
      vi.mocked(queryBlockProduction).mockResolvedValueOnce([
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: testTimestamp,
          receiver_key: validAccount,
          total_reward: '1440000000',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(events[0].amount.toString()).toBe('1.44');
    });

    it('should filter out zero reward blocks', async () => {
      vi.mocked(queryBlockProduction).mockResolvedValueOnce([
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: testTimestamp,
          receiver_key: validAccount,
          total_reward: '0',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(events.filter(e => e.eventType === 'coinbase_reward')).toHaveLength(0);
    });
  });

  describe('Mining Fee Transformation', () => {
    it('should create fee_transfer_received event for mining fees', async () => {
      vi.mocked(queryMiningFees).mockResolvedValueOnce([
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: testTimestamp,
          receiver_key: validAccount,
          amount: '141712112', // Mining fees in nanomina
          tx_hash: 'CkpTestHash',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const miningFeeEvent = events.find(e => e.eventType === 'fee_transfer_received' && e.memo === 'Transaction fees from block production');

      expect(miningFeeEvent).toBeDefined();
      expect(miningFeeEvent?.accountKey).toBe(validAccount);
      expect(miningFeeEvent?.amount.toString()).toBe('0.141712112');
      expect(miningFeeEvent?.fee.toString()).toBe('0');
      expect(miningFeeEvent?.isPoolPayout).toBe(false);
    });
  });

  describe('Payment Transformation', () => {
    it('should create payment_received event for incoming payments', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpTestHash',
          timestamp: testTimestamp,
          from_key: 'B62qSender' + 'x'.repeat(45),
          to_key: validAccount,
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: null,
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('Test payment');

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const receivedEvent = events.find(e => e.eventType === 'payment_received');
      expect(receivedEvent).toBeDefined();
      expect(receivedEvent?.accountKey).toBe(validAccount);
      expect(receivedEvent?.amount.toString()).toBe('1');
      expect(receivedEvent?.fee.toString()).toBe('0');
      expect(receivedEvent?.memo).toBe('Test payment');
    });

    it('should create payment_sent event for outgoing payments', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpTestHash',
          timestamp: testTimestamp,
          from_key: validAccount,
          to_key: 'B62qReceiver' + 'x'.repeat(43),
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: null,
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const sentEvent = events.find(e => e.eventType === 'payment_sent');
      expect(sentEvent).toBeDefined();
      expect(sentEvent?.accountKey).toBe(validAccount);
      expect(sentEvent?.fee.toString()).toBe('0.01');
    });

    it('should create account_creation_fee event when applicable', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpTestHash',
          timestamp: testTimestamp,
          from_key: 'B62qSender' + 'x'.repeat(45),
          to_key: validAccount,
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: '1000000000', // 1 MINA
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const creationFeeEvent = events.find(e => e.eventType === 'account_creation_fee');
      expect(creationFeeEvent).toBeDefined();
      expect(creationFeeEvent?.amount.toString()).toBe('1');
      expect(creationFeeEvent?.memo).toBe('Account creation fee');
    });

    it('should detect pool payouts for received payments', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpTestHash',
          timestamp: testTimestamp,
          from_key: 'B62qPool' + 'x'.repeat(47),
          to_key: validAccount,
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: null,
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('Payout');
      vi.mocked(isPoolPayout).mockReturnValue(true);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(events[0].isPoolPayout).toBe(true);
    });

    it('should not detect pool payouts for sent payments', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpTestHash',
          timestamp: testTimestamp,
          from_key: validAccount,
          to_key: 'B62qReceiver' + 'x'.repeat(43),
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: null,
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('Payout');

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(isPoolPayout).not.toHaveBeenCalled();
      expect(events[0].isPoolPayout).toBe(false);
    });

    it('should handle self-transfers as fee-only withdrawals', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpSelfTransferHash',
          timestamp: testTimestamp,
          from_key: validAccount,
          to_key: validAccount, // Same account
          amount: '1000000000', // Original amount (not used for self-transfer)
          fee: '1000000', // 0.001 MINA fee
          memo: 'E4YVotingMemo',
          account_creation_fee: null,
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('Voting transaction');

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const selfTransferEvent = events.find(e => e.eventType === 'payment_sent');

      expect(selfTransferEvent).toBeDefined();
      expect(selfTransferEvent?.accountKey).toBe(validAccount);
      expect(selfTransferEvent?.amount.toString()).toBe('0'); // Amount is 0
      expect(selfTransferEvent?.fee.toString()).toBe('0.001'); // Fee is actual fee
      expect(selfTransferEvent?.from).toBe(validAccount);
      expect(selfTransferEvent?.to).toBe(validAccount);
      expect(selfTransferEvent?.memo).toBe('Self-Transfer Fee: Voting transaction');
      expect(selfTransferEvent?.isPoolPayout).toBe(false);
    });

    it('should handle self-transfers with empty memo', async () => {
      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpSelfTransferHash',
          timestamp: testTimestamp,
          from_key: validAccount,
          to_key: validAccount,
          amount: '5000000000',
          fee: '10000000', // 0.01 MINA fee
          memo: '',
          account_creation_fee: null,
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('');

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const selfTransferEvent = events[0];

      expect(selfTransferEvent.eventType).toBe('payment_sent');
      expect(selfTransferEvent.amount.toString()).toBe('0');
      expect(selfTransferEvent.fee.toString()).toBe('0.01');
      expect(selfTransferEvent.memo).toBe('Self-Transfer Fee');
    });

    it('should create both sender and receiver events when both accounts are exported', async () => {
      const senderAccount = 'B62qSender' + 'x'.repeat(45);
      const receiverAccount = 'B62qReceiver' + 'x'.repeat(43);

      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpDualAccountHash',
          timestamp: testTimestamp,
          from_key: senderAccount,
          to_key: receiverAccount,
          amount: '1000000000', // 1 MINA
          fee: '10000000', // 0.01 MINA
          memo: 'E4YTestMemo',
          account_creation_fee: null,
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('Dual account payment');

      const request: TaxExportRequest = {
        accounts: [senderAccount, receiverAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];

      // Should have exactly 2 events: one for sender, one for receiver
      expect(events).toHaveLength(2);

      // Verify sender event
      const senderEvent = events.find(e => e.eventType === 'payment_sent');
      expect(senderEvent).toBeDefined();
      expect(senderEvent?.accountKey).toBe(senderAccount);
      expect(senderEvent?.amount.toString()).toBe('1');
      expect(senderEvent?.fee.toString()).toBe('0.01');
      expect(senderEvent?.from).toBe(senderAccount);
      expect(senderEvent?.to).toBe(receiverAccount);
      expect(senderEvent?.memo).toBe('Dual account payment');
      expect(senderEvent?.isPoolPayout).toBe(false);

      // Verify receiver event
      const receiverEvent = events.find(e => e.eventType === 'payment_received');
      expect(receiverEvent).toBeDefined();
      expect(receiverEvent?.accountKey).toBe(receiverAccount);
      expect(receiverEvent?.amount.toString()).toBe('1');
      expect(receiverEvent?.fee.toString()).toBe('0'); // Receiver pays no fee
      expect(receiverEvent?.from).toBe(senderAccount);
      expect(receiverEvent?.to).toBe(receiverAccount);
      expect(receiverEvent?.memo).toBe('Dual account payment');
    });

    it('should add account creation fee when both accounts exported and receiver is new', async () => {
      const senderAccount = 'B62qSender' + 'x'.repeat(45);
      const receiverAccount = 'B62qReceiver' + 'x'.repeat(43);

      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpDualAccountCreationHash',
          timestamp: testTimestamp,
          from_key: senderAccount,
          to_key: receiverAccount,
          amount: '1000000000',
          fee: '10000000',
          memo: 'E4YTestMemo',
          account_creation_fee: '1000000000', // 1 MINA
        },
      ]);

      vi.mocked(decodeMemo).mockReturnValue('First payment');

      const request: TaxExportRequest = {
        accounts: [senderAccount, receiverAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];

      // Should have 3 events: sender, receiver, and account creation fee
      expect(events).toHaveLength(3);

      const senderEvent = events.find(e => e.eventType === 'payment_sent');
      const receiverEvent = events.find(e => e.eventType === 'payment_received');
      const creationFeeEvent = events.find(e => e.eventType === 'account_creation_fee');

      expect(senderEvent).toBeDefined();
      expect(receiverEvent).toBeDefined();
      expect(creationFeeEvent).toBeDefined();

      // Verify account creation fee is for receiver
      expect(creationFeeEvent?.accountKey).toBe(receiverAccount);
      expect(creationFeeEvent?.amount.toString()).toBe('1');
      expect(creationFeeEvent?.fee.toString()).toBe('0');
    });
  });

  describe('zkApp Transformation', () => {
    it('should create zkapp_payment_received for positive balance change', async () => {
      vi.mocked(decodeMemo).mockReturnValue('Test zkApp');
      vi.mocked(isPoolPayout).mockReturnValue(false);
      vi.mocked(queryZkApps).mockResolvedValueOnce([
        {
          zkapp_cmd_id: 1,
          tx_hash: 'CkpZkAppHash',
          height: 12345,
          timestamp: testTimestamp,
          memo: 'E4YTestMemo',
          fee_payer: 'B62qFeePayer' + 'x'.repeat(43),
          fee: '10000000',
          account_key: validAccount,
          net_balance_change: '1000000000', // Positive
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const zkappEvent = events.find(e => e.eventType === 'zkapp_payment_received');
      expect(zkappEvent).toBeDefined();
      expect(zkappEvent?.amount.toString()).toBe('1');
    });

    it('should create zkapp_payment_sent for negative balance change', async () => {
      vi.mocked(decodeMemo).mockReturnValue('Test zkApp');
      vi.mocked(queryZkApps).mockResolvedValueOnce([
        {
          zkapp_cmd_id: 1,
          tx_hash: 'CkpZkAppHash',
          height: 12345,
          timestamp: testTimestamp,
          memo: 'E4YTestMemo',
          fee_payer: validAccount,
          fee: '10000000',
          account_key: validAccount,
          net_balance_change: '-1000000000', // Negative
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const zkappEvent = events.find(e => e.eventType === 'zkapp_payment_sent');
      expect(zkappEvent).toBeDefined();
      expect(zkappEvent?.amount.toString()).toBe('1');
    });

    it('should include fee only for fee payer', async () => {
      vi.mocked(queryZkApps).mockResolvedValueOnce([
        {
          zkapp_cmd_id: 1,
          tx_hash: 'CkpZkAppHash',
          height: 12345,
          timestamp: testTimestamp,
          memo: 'E4YTestMemo',
          fee_payer: validAccount,
          fee: '10000000',
          account_key: validAccount,
          net_balance_change: '-1000000000',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(events[0].fee.toString()).toBe('0.01');
    });
  });

  describe('Delegation Transformation', () => {
    it('should create delegation event with zero amount', async () => {
      vi.mocked(decodeMemo).mockReturnValue('Delegation');
      vi.mocked(queryDelegations).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpDelegationHash',
          timestamp: testTimestamp,
          source_key: validAccount,
          delegate_key: 'B62qDelegate' + 'x'.repeat(43),
          fee: '10000000',
          memo: 'E4YTestMemo',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      const delegationEvent = events.find(e => e.eventType === 'delegation');
      expect(delegationEvent).toBeDefined();
      expect(delegationEvent?.amount.toString()).toBe('0');
      expect(delegationEvent?.fee.toString()).toBe('0.01');
      expect(delegationEvent?.delegateTarget).toContain('B62qDelegate');
      expect(delegationEvent?.isPoolPayout).toBe(false);
    });
  });

  describe('Event Sorting', () => {
    it('should sort events chronologically', async () => {
      vi.mocked(queryBlockProduction).mockResolvedValueOnce([
        {
          height: 12346,
          state_hash: 'jxHash2',
          timestamp: '1704153600000', // 2024-01-02
          receiver_key: validAccount,
          total_reward: '1440000000',
        },
        {
          height: 12345,
          state_hash: 'jxHash1',
          timestamp: '1704067200000', // 2024-01-01
          receiver_key: validAccount,
          total_reward: '1440000000',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(events[0].blockHeight).toBe(12345); // Earlier block first
      expect(events[1].blockHeight).toBe(12346);
    });

    it('should sort by account key when timestamps are equal', async () => {
      const account1 = 'B62qAAA' + 'x'.repeat(48);
      const account2 = 'B62qZZZ' + 'x'.repeat(48);

      vi.mocked(queryPayments).mockResolvedValueOnce([
        {
          height: 12345,
          tx_hash: 'CkpHash2',
          timestamp: testTimestamp,
          from_key: 'B62qSender' + 'x'.repeat(45),
          to_key: account2,
          amount: '1000000000',
          fee: '10000000',
          memo: '',
          account_creation_fee: null,
        },
        {
          height: 12345,
          tx_hash: 'CkpHash1',
          timestamp: testTimestamp,
          from_key: 'B62qSender' + 'x'.repeat(45),
          to_key: account1,
          amount: '1000000000',
          fee: '10000000',
          memo: '',
          account_creation_fee: null,
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [account1, account2],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      const events = vi.mocked(formatTaxData).mock.calls[0][0];
      expect(events[0].accountKey).toBe(account1); // AAA before ZZZ
      expect(events[1].accountKey).toBe(account2);
    });
  });

  describe('Parallel Query Execution', () => {
    it('should call all database queries in parallel', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      await getTaxExport(mockPool, request);

      expect(queryBlockProduction).toHaveBeenCalledTimes(1);
      expect(queryMiningFees).toHaveBeenCalledTimes(1);
      expect(querySnarkFees).toHaveBeenCalledTimes(1);
      expect(queryPayments).toHaveBeenCalledTimes(1);
      expect(queryZkApps).toHaveBeenCalledTimes(1);
      expect(queryDelegations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success Response', () => {
    it('should return success response with event count', async () => {
      vi.mocked(queryBlockProduction).mockResolvedValueOnce([
        {
          height: 12345,
          state_hash: 'jxTestHash',
          timestamp: testTimestamp,
          receiver_key: validAccount,
          total_reward: '1440000000',
        },
      ]);

      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(200);
      expect(result.responseMessages).toContain('Exported 1 transactions for 1 account(s)');
    });

    it('should indicate multiple accounts in response message', async () => {
      const account2 = 'B62qBBB' + 'x'.repeat(48);

      const request: TaxExportRequest = {
        accounts: [validAccount, account2],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseMessages).toBeDefined();
      expect(result.responseMessages![0]).toContain('2 account(s)');
    });
  });
});
