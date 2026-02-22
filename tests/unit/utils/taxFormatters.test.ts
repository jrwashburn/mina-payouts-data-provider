import { describe, it, expect } from 'vitest';
import { formatTaxData } from '../../../src/utils/taxFormatters.js';
import { TaxEvent } from '../../../src/models/taxExport.js';
import Decimal from 'decimal.js';

describe('taxFormatters', () => {
  // Helper to create a basic tax event
  const createTestEvent = (overrides?: Partial<TaxEvent>): TaxEvent => ({
    accountKey: 'B62qTest123',
    timestamp: new Date('2024-01-15T10:30:00.000Z'),
    blockHeight: 12345,
    transactionHash: 'CkpTest123',
    eventType: 'payment_received',
    amount: new Decimal('100'),
    fee: new Decimal('0.1'),
    to: 'B62qTest123',
    from: 'B62qSender456',
    memo: 'Test payment',
    isPoolPayout: false,
    ...overrides,
  });

  describe('JSON Format', () => {
    it('should format events as JSON string', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'json', false);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should preserve all event fields in JSON format', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'json', false);
      const parsed = JSON.parse(result as string);

      expect(parsed[0].accountKey).toBe('B62qTest123');
      expect(parsed[0].blockHeight).toBe(12345);
      expect(parsed[0].eventType).toBe('payment_received');
    });

    it('should handle empty events array', () => {
      const result = formatTaxData([], 'json', false);
      const parsed = JSON.parse(result as string);
      expect(parsed).toEqual([]);
    });
  });

  describe('Koinly CSV Format', () => {
    it('should format single event as CSV with 12 columns (single account)', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'koinly', false);

      expect(typeof result).toBe('string');
      const lines = (result as string).split('\n');
      expect(lines[0]).toContain('Koinly Date');
      expect(lines[0].split(',').length).toBe(12);
    });

    it('should format multiple accounts with 13 columns (includes Account)', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'koinly', true);

      const lines = (result as string).split('\n');
      expect(lines[0]).toContain('Account');
      expect(lines[0].split(',').length).toBe(13);
    });

    it('should format coinbase_reward as mining type', () => {
      const events = [createTestEvent({ eventType: 'coinbase_reward' })];
      const result = formatTaxData(events, 'koinly', false);

      expect(result).toContain('mining');
    });

    it('should format pool payout as reward type', () => {
      const events = [createTestEvent({
        eventType: 'payment_received',
        isPoolPayout: true
      })];
      const result = formatTaxData(events, 'koinly', false);

      expect(result).toContain('reward');
    });

    it('should format payment_sent as withdrawal type', () => {
      const events = [createTestEvent({ eventType: 'payment_sent' })];
      const result = formatTaxData(events, 'koinly', false);

      expect(result).toContain('withdrawal');
    });

    it('should include fee for withdrawals', () => {
      const events = [createTestEvent({
        eventType: 'payment_sent',
        fee: new Decimal('0.5')
      })];
      const result = formatTaxData(events, 'koinly', false);
      const lines = (result as string).split('\n');

      expect(lines[1]).toContain('0.5');
    });

    it('should not include fee for deposits', () => {
      const events = [createTestEvent({
        eventType: 'payment_received',
        fee: new Decimal('0.5')
      })];
      const result = formatTaxData(events, 'koinly', false);
      const lines = (result as string).split('\n');
      const lastColumn = lines[1].split(',').pop();

      expect(lastColumn?.trim()).toBe('');
    });

    it('should use ISO timestamp format', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'koinly', false);

      expect(result).toContain('2024-01-15T10:30:00.000Z');
    });

    it('should include SNARK work label', () => {
      const events = [createTestEvent({
        eventType: 'snark_fee',
        memo: 'SNARK work'
      })];
      const result = formatTaxData(events, 'koinly', false);

      expect(result).toContain('SNARK work');
    });

    it('should escape CSV special characters', () => {
      const events = [createTestEvent({
        memo: 'Payment with, comma and "quotes"'
      })];
      const result = formatTaxData(events, 'koinly', false);

      // Should wrap in quotes and escape internal quotes
      expect(result).toContain('""');
    });
  });

  describe('Ledgible CSV Format', () => {
    it('should format single event as CSV with 11 columns (single account)', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'ledgible', false);

      const lines = (result as string).split('\n');
      expect(lines[0]).toContain('Date');
      expect(lines[0].split(',').length).toBe(11);
    });

    it('should format date as MM/DD/YYYY HH:mm:ss', () => {
      const events = [createTestEvent({
        timestamp: new Date('2024-01-15T10:30:45.000Z')
      })];
      const result = formatTaxData(events, 'ledgible', false);

      expect(result).toContain('01/15/2024 10:30:45');
    });

    it('should categorize coinbase_reward as Mining Income', () => {
      const events = [createTestEvent({ eventType: 'coinbase_reward' })];
      const result = formatTaxData(events, 'ledgible', false);

      expect(result).toContain('Mining Income');
    });

    it('should categorize pool payout as Staking Rewards', () => {
      const events = [createTestEvent({
        eventType: 'payment_received',
        isPoolPayout: true
      })];
      const result = formatTaxData(events, 'ledgible', false);

      expect(result).toContain('Staking Rewards');
    });

    it('should categorize payment_sent as Withdrawal', () => {
      const events = [createTestEvent({ eventType: 'payment_sent' })];
      const result = formatTaxData(events, 'ledgible', false);

      expect(result).toContain('Withdrawal');
    });

    it('should mark incoming side for received payments', () => {
      const events = [createTestEvent({ eventType: 'payment_received' })];
      const result = formatTaxData(events, 'ledgible', false);

      expect(result).toContain('incoming');
    });

    it('should mark outgoing side for sent payments', () => {
      const events = [createTestEvent({ eventType: 'payment_sent' })];
      const result = formatTaxData(events, 'ledgible', false);

      expect(result).toContain('outgoing');
    });

    it('should use empty price currency when using spot pricing', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'ledgible', false);
      const lines = (result as string).split('\n');
      const dataRow = lines[1].split(',');

      // Price Currency field (index 7) should be empty when using spot pricing
      expect(dataRow[7]).toBe('');
    });
  });

  describe('Accointing XLSX Format', () => {
    it('should format as Buffer for XLSX', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'accointing', false);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should create valid XLSX structure', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'accointing', false);

      // XLSX files start with PK (ZIP header)
      expect((result as Buffer).toString('utf8', 0, 2)).toBe('PK');
    });

    it('should handle coinbase as staking type', () => {
      const events = [createTestEvent({ eventType: 'coinbase_reward' })];
      const result = formatTaxData(events, 'accointing', false);

      // Can't easily test XLSX content without parsing, but verify it doesn't throw
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle payment_sent as withdraw type', () => {
      const events = [createTestEvent({ eventType: 'payment_sent' })];
      const result = formatTaxData(events, 'accointing', false);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should format timestamp without T and Z', () => {
      // Can't directly test XLSX content, but ensure no errors
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'accointing', false);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });
  });

  describe('Format Edge Cases', () => {
    it('should handle delegation events with delegateTarget', () => {
      const events = [createTestEvent({
        eventType: 'delegation',
        delegateTarget: 'B62qDelegate789',
        amount: new Decimal('0'),
        fee: new Decimal('0.1'),
        memo: '' // Clear memo so getDescription generates delegation description
      })];

      const koinlyResult = formatTaxData(events, 'koinly', false);
      expect(koinlyResult).toContain('Delegate to B62qDelegate789');
    });

    it('should handle account creation fee events', () => {
      const events = [createTestEvent({
        eventType: 'account_creation_fee',
        amount: new Decimal('1'),
        memo: 'Account creation fee'
      })];

      const result = formatTaxData(events, 'koinly', false);
      expect(result).toContain('Account creation fee');
    });

    it('should handle zero fee transactions', () => {
      const events = [createTestEvent({
        fee: new Decimal('0')
      })];

      const result = formatTaxData(events, 'koinly', false);
      expect(typeof result).toBe('string');
    });

    it('should handle very large amounts with Decimal precision', () => {
      const events = [createTestEvent({
        amount: new Decimal('999999999999.123456789')
      })];

      const result = formatTaxData(events, 'koinly', false);
      expect(result).toContain('999999999999.123456789');
    });

    it('should default to json for unknown format', () => {
      const events = [createTestEvent()];
      const result = formatTaxData(events, 'unknown' as any, false);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });
});
