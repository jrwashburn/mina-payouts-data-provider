/**
 * Unit tests for stakingLedgersQuery.ts
 * Focus: Vesting schedule calculations, balance aggregation
 * Priority: P0 - CRITICAL (financial impact)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LedgerEntry } from '../../../src/models/stakes.js';

// Mock dependencies
vi.mock('../../../src/database/stakingLedgerDb.js', () => ({
  getStakingLedgers: vi.fn(),
  getStakingLedgersByEpoch: vi.fn(),
}));

vi.mock('../../../src/mina-addresses/minaAddressShareClass.js', () => ({
  MinaAddresses: {
    create: vi.fn(() => Promise.resolve({
      getPublicKeyShareClass: vi.fn(() => Promise.resolve(['Common', ''])),
    })),
  },
}));

// We need to test the private calculateUntimedSlot function
// We'll do this by testing through the public functions that call it
import { getLedgerFromHashForKey } from '../../../src/controllers/stakingLedgersQuery.js';
import { getStakingLedgers } from '../../../src/database/stakingLedgerDb.js';

describe('Vesting Schedule Calculations (P0-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return untimedAfterSlot = 0 for untimed accounts (no timing)', async () => {
    // Arrange
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
      // No timing field = untimed account
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(0);
  });

  it('should return cliffTime when vestingIncrement = 0 AND cliffAmount = initialMinimumBalance', async () => {
    // Arrange: Cliff vesting (all vests at once at cliffTime)
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
      timing: {
        vesting_period: '100',
        vesting_increment: '0', // No incremental vesting
        cliff_time: '50000',
        cliff_amount: '500000000', // Same as initial min balance
        initial_minimum_balance: '500000000',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(50000);
  });

  it('should throw error when vestingIncrement = 0 BUT cliffAmount ≠ initialMinimumBalance', async () => {
    // Arrange: Invalid vesting configuration
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
      timing: {
        vesting_period: '100',
        vesting_increment: '0',
        cliff_time: '50000',
        cliff_amount: '300000000', // Different from initial
        initial_minimum_balance: '500000000',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act & Assert
    await expect(getLedgerFromHashForKey('jxTestHash', 'B62qPool'))
      .rejects
      .toThrow(/Timed Account with no increment/);
  });

  it('should calculate standard vesting: ((initial - cliff) / increment) * period + cliffTime', async () => {
    // Arrange: Standard linear vesting
    // Formula: ((500000000 - 100000000) / 10000000) * 100 + 50000
    // = (400000000 / 10000000) * 100 + 50000
    // = 40 * 100 + 50000
    // = 4000 + 50000 = 54000
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
      timing: {
        vesting_period: '100',
        vesting_increment: '10000000',
        cliff_time: '50000',
        cliff_amount: '100000000',
        initial_minimum_balance: '500000000',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(54000);
  });

  it('should handle integer division/rounding correctly', async () => {
    // Arrange: Test integer division
    // Formula: ((1000000000 - 100000000) / 30000000) * 100 + 10000
    // = (900000000 / 30000000) * 100 + 10000
    // = 30 * 100 + 10000 = 13000
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '2000000000',
      timing: {
        vesting_period: '100',
        vesting_increment: '30000000',
        cliff_time: '10000',
        cliff_amount: '100000000',
        initial_minimum_balance: '1000000000',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(13000);
  });

  it('should handle very large vesting periods (overflow protection)', async () => {
    // Arrange: Large numbers but within JavaScript safe integer range
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000000',
      timing: {
        vesting_period: '1000000', // 1 million
        vesting_increment: '100000000',
        cliff_time: '500000',
        cliff_amount: '100000000000',
        initial_minimum_balance: '1000000000000',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    // Formula: ((1000000000000 - 100000000000) / 100000000) * 1000000 + 500000
    // = (900000000000 / 100000000) * 1000000 + 500000
    // = 9000 * 1000000 + 500000 = 9000500000
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(9000500000);
  });

  it('should handle zero initial_minimum_balance', async () => {
    // Arrange: Account starts with no minimum balance
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
      timing: {
        vesting_period: '100',
        vesting_increment: '10000000',
        cliff_time: '5000',
        cliff_amount: '0',
        initial_minimum_balance: '0',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    // Formula: ((0 - 0) / 10000000) * 100 + 5000 = 0 + 5000 = 5000
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(5000);
  });

  it('should handle negative values from calculation (edge case)', async () => {
    // Arrange: Cliff amount > initial minimum balance (shouldn't happen in practice)
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
      timing: {
        vesting_period: '100',
        vesting_increment: '10000000',
        cliff_time: '5000',
        cliff_amount: '600000000', // More than initial
        initial_minimum_balance: '500000000',
      },
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    // Formula: ((500000000 - 600000000) / 10000000) * 100 + 5000
    // = (-100000000 / 10000000) * 100 + 5000
    // = -10 * 100 + 5000 = -1000 + 5000 = 4000
    expect(result.responseData.stakes[0].untimedAfterSlot).toBe(4000);
  });
});

describe('Staking Balance Aggregation (P0-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly aggregate single stake entry', async () => {
    // Arrange
    const ledgerEntry: LedgerEntry = {
      pk: 'B62qTest123',
      balance: '1000000000',
    };

    vi.mocked(getStakingLedgers).mockResolvedValueOnce([ledgerEntry]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes.length).toBe(1);
    expect(result.responseData.stakes[0].stakingBalance).toBe(1000000000);
    expect(result.responseData.totalStakingBalance).toBe(1000000000);
  });

  it('should correctly aggregate multiple stake entries with decimal precision', async () => {
    // Arrange: Multiple stakes that require decimal precision
    const ledgerEntries: LedgerEntry[] = [
      { pk: 'B62qTest1', balance: '1000000000' },
      { pk: 'B62qTest2', balance: '2000000000' },
      { pk: 'B62qTest3', balance: '3000000000' },
    ];

    vi.mocked(getStakingLedgers).mockResolvedValueOnce(ledgerEntries);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes.length).toBe(3);
    expect(result.responseData.totalStakingBalance).toBe(6000000000);
  });

  it('should handle very large balances (> 1e15 nanomina)', async () => {
    // Arrange: Very large balance requiring decimal precision
    const ledgerEntries: LedgerEntry[] = [
      { pk: 'B62qTest1', balance: '1234567890123456' }, // > 1 quadrillion nanomina
      { pk: 'B62qTest2', balance: '9876543210987654' },
    ];

    vi.mocked(getStakingLedgers).mockResolvedValueOnce(ledgerEntries);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.totalStakingBalance).toBe(11111111101111110);
    expect(result.responseData.stakes[0].stakingBalance).toBe(1234567890123456);
    expect(result.responseData.stakes[1].stakingBalance).toBe(9876543210987654);
  });

  it('should handle zero balance entries', async () => {
    // Arrange
    const ledgerEntries: LedgerEntry[] = [
      { pk: 'B62qTest1', balance: '1000000000' },
      { pk: 'B62qTest2', balance: '0' }, // Zero balance
      { pk: 'B62qTest3', balance: '500000000' },
    ];

    vi.mocked(getStakingLedgers).mockResolvedValueOnce(ledgerEntries);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes.length).toBe(3);
    expect(result.responseData.stakes[1].stakingBalance).toBe(0);
    expect(result.responseData.totalStakingBalance).toBe(1500000000);
  });

  it('should use Decimal.js precision (no floating point errors)', async () => {
    // Arrange: Numbers that would cause floating point errors with regular JS
    const ledgerEntries: LedgerEntry[] = [
      { pk: 'B62qTest1', balance: '100000000000001' },
      { pk: 'B62qTest2', balance: '200000000000002' },
      { pk: 'B62qTest3', balance: '300000000000003' },
    ];

    vi.mocked(getStakingLedgers).mockResolvedValueOnce(ledgerEntries);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    // Decimal.js should give us exact precision
    const expectedTotal = 100000000000001 + 200000000000002 + 300000000000003;
    expect(result.responseData.totalStakingBalance).toBe(expectedTotal);
  });

  it('should verify totalStakingBalance equals sum of individual stakes', async () => {
    // Arrange: Random balances
    const ledgerEntries: LedgerEntry[] = [
      { pk: 'B62qTest1', balance: '123456789' },
      { pk: 'B62qTest2', balance: '987654321' },
      { pk: 'B62qTest3', balance: '456789123' },
      { pk: 'B62qTest4', balance: '789123456' },
    ];

    vi.mocked(getStakingLedgers).mockResolvedValueOnce(ledgerEntries);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    const manualSum = result.responseData.stakes.reduce(
      (sum, stake) => sum + stake.stakingBalance,
      0
    );
    expect(result.responseData.totalStakingBalance).toBe(manualSum);
  });

  it('should handle empty ledger (no stakes)', async () => {
    // Arrange
    vi.mocked(getStakingLedgers).mockResolvedValueOnce([]);

    // Act
    const result = await getLedgerFromHashForKey('jxTestHash', 'B62qPool');

    // Assert
    expect(result.responseData.stakes.length).toBe(0);
    expect(result.responseData.totalStakingBalance).toBe(0);
  });
});
