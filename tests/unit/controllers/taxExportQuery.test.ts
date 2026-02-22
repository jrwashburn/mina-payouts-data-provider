import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import { getTaxExport } from '../../../src/controllers/taxExportQuery.js';
import type { TaxExportRequest } from '../../../src/models/taxExport.js';

// Mock all dependencies
vi.mock('../../../src/database/taxExportDb.js', () => ({
  queryBlockProduction: vi.fn(() => Promise.resolve([])),
  querySnarkFees: vi.fn(() => Promise.resolve([])),
  queryFeeTransfers: vi.fn(() => Promise.resolve([])),
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

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('At least one account is required');
    });

    it('should return error when accounts exceed maximum limit', async () => {
      const request: TaxExportRequest = {
        accounts: Array(11).fill('B' + '1'.repeat(54)), // 11 accounts (max is 10)
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('Maximum 10 accounts per request');
    });

    it('should return error for invalid account key length', async () => {
      const request: TaxExportRequest = {
        accounts: ['B62qShortKey'], // Too short
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('Invalid account key length');
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

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('Invalid startDate');
    });

    it('should return error for invalid endDate', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: 'invalid-date',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('Invalid endDate');
    });

    it('should return error when endDate is before startDate', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-31',
        endDate: '2024-01-01',
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('endDate must be after startDate');
    });

    it('should return error when date range exceeds maximum (3650 days)', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2014-01-01',
        endDate: '2024-01-02', // > 10 years
        format: 'json',
      };

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('exceeds maximum');
    });

    it('should accept date range at maximum limit (3650 days)', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2014-01-01',
        endDate: '2023-12-30', // Exactly 3650 days
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

      const result = await getTaxExport(mockPool, request);

      expect(result.responseCode).toBe(500);
      expect(result.responseError).toContain('Invalid format');
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

    it('should accept accointing format', async () => {
      const request: TaxExportRequest = {
        accounts: [validAccount],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'accointing',
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
