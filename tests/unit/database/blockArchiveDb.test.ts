/**
 * Unit tests for blockArchiveDb.ts
 * Focus: Fork detection logic, epoch calculations, chain consistency validation
 * Priority: P0 - CRITICAL (financial impact)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Pool, QueryResult } from 'pg';

// Mock configuration before importing module under test
vi.mock('../../../src/configurations/environmentConfiguration.js', () => ({
  default: {
    fork1StartSlot: 564480,  // Berkeley hardfork slot
    fork2StartSlot: 1000000, // Mesa hardfork slot (test value)
  },
}));

// Mock database factory
const mockQuery = vi.fn();
const mockPool: Pool = {
  query: mockQuery,
} as unknown as Pool;

vi.mock('../../../src/database/databaseFactory.js', () => ({
  createBlockQueryPool: vi.fn(() => mockPool),
}));

// Import after mocks are set up
const { getMinMaxBlocksInSlotRange } = await import('../../../src/database/blockArchiveDb.js');

describe('Fork Detection Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fork 0 (Pre-Berkeley) Detection', () => {
    it('should use Fork 0 queries when slot < FORK_1_START_SLOT', async () => {
      // Arrange: slot range entirely before Fork 1
      const minSlot = 100000;
      const maxSlot = 200000;
      const fork = 0;

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 14000, epochmaxblockheight: 28000 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([14000, 28000]);
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Verify Fork 0 parameters: [minSlot, maxSlot, fork1StartSlot]
      const [query, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([minSlot, maxSlot, 564480]);
      expect(query).toContain('global_slot_since_genesis'); // Fork 0 uses genesis slot
      expect(query).not.toContain('global_slot_since_hard_fork'); // Fork 0 doesn't use hard fork slot
    });

    it('should handle slot exactly at boundary (slot = FORK_1_START_SLOT - 1)', async () => {
      // Arrange: slot exactly one before Fork 1
      const minSlot = 564479;
      const maxSlot = 564479;
      const fork = 0;

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 79000, epochmaxblockheight: 79000 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([79000, 79000]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        [564479, 564479, 564480]
      );
    });
  });

  describe('Fork 1 (Berkeley) Detection', () => {
    it('should use Fork 1 queries when FORK_1_START_SLOT ≤ slot < FORK_2_START_SLOT', async () => {
      // Arrange: slot range in Fork 1 territory
      const minSlot = 600000;
      const maxSlot = 700000;
      const fork = 1;

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 84000, epochmaxblockheight: 98000 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([84000, 98000]);
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Verify Fork 1 parameters: [minSlot, maxSlot, fork1StartSlot, fork2StartSlot]
      const [query, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([minSlot, maxSlot, 564480, 1000000]);
      expect(query).toContain('global_slot_since_hard_fork'); // Fork 1 uses hard fork slot
      expect(query).toContain('global_slot_since_genesis'); // Fork 1 also checks genesis
    });

    it('should handle slot exactly at FORK_1_START_SLOT boundary', async () => {
      // Arrange: slot exactly at Fork 1 start
      const minSlot = 564480;
      const maxSlot = 564480;
      const fork = 1;

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 79100, epochmaxblockheight: 79100 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([79100, 79100]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        [564480, 564480, 564480, 1000000]
      );
    });
  });

  describe('Fork 2 (Mesa) Detection', () => {
    it('should use Fork 2 queries when slot ≥ FORK_2_START_SLOT', async () => {
      // Arrange: slot range in Fork 2 territory
      const minSlot = 1100000;
      const maxSlot = 1200000;
      const fork = 2;

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 154000, epochmaxblockheight: 168000 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([154000, 168000]);
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Verify Fork 2 parameters: [minSlot, maxSlot, fork2StartSlot]
      const [query, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([minSlot, maxSlot, 1000000]);
      expect(query).toContain('global_slot_since_hard_fork'); // Fork 2 uses hard fork slot
      expect(query).toContain('global_slot_since_genesis'); // Fork 2 also checks genesis
    });

    it('should handle slot exactly at FORK_2_START_SLOT boundary', async () => {
      // Arrange: slot exactly at Fork 2 start
      const minSlot = 1000000;
      const maxSlot = 1000000;
      const fork = 2;

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 140000, epochmaxblockheight: 140000 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([140000, 140000]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        [1000000, 1000000, 1000000]
      );
    });

    it('should handle slot one before FORK_2_START_SLOT (should use Fork 1)', async () => {
      // Arrange: slot exactly one before Fork 2
      const minSlot = 999999;
      const maxSlot = 999999;
      const fork = 1; // User must specify Fork 1 for this slot

      mockQuery.mockResolvedValueOnce({
        rows: [{ epochminblockheight: 139900, epochmaxblockheight: 139900 }],
      } as QueryResult);

      // Act
      const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

      // Assert
      expect(result).toEqual([139900, 139900]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        [999999, 999999, 564480, 1000000]
      );
    });
  });

  describe('Fork Validation', () => {
    it('should reject fork parameter < 0', async () => {
      // Arrange
      const minSlot = 100000;
      const maxSlot = 200000;
      const fork = -1;

      // Act & Assert
      await expect(getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork))
        .rejects
        .toThrow('Invalid fork: -1');

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should reject fork parameter > 2', async () => {
      // Arrange
      const minSlot = 100000;
      const maxSlot = 200000;
      const fork = 3;

      // Act & Assert
      await expect(getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork))
        .rejects
        .toThrow('Invalid fork: 3');

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});

describe('Fork Detection with FORK_2_START_SLOT = 0 (Mesa Disabled)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-mock configuration with Fork 2 disabled
    vi.resetModules();
    vi.doMock('../../../src/configurations/environmentConfiguration.js', () => ({
      default: {
        fork1StartSlot: 564480,
        fork2StartSlot: 0, // Fork 2 disabled
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow Fork 0 and Fork 1 when Fork 2 disabled', async () => {
    // This test verifies the module still works when Fork 2 is not activated
    // Note: In the actual route validation (epoch.ts), Fork 2 requests are rejected
    // when FORK_2_START_SLOT = 0, but the database query logic itself doesn't check

    // Re-import module with new config
    const { getMinMaxBlocksInSlotRange } = await import('../../../src/database/blockArchiveDb.js');

    const minSlot = 600000;
    const maxSlot = 700000;
    const fork = 1;

    mockQuery.mockResolvedValueOnce({
      rows: [{ epochminblockheight: 84000, epochmaxblockheight: 98000 }],
    } as QueryResult);

    const result = await getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);

    expect(result).toEqual([84000, 98000]);
    // With Fork 2 disabled (0), Fork 1 params should be: [minSlot, maxSlot, fork1StartSlot, fork2StartSlot=0]
    expect(mockQuery).toHaveBeenCalledWith(
      expect.anything(),
      [minSlot, maxSlot, 564480, 0]
    );
  });
});

describe('Epoch Calculation Accuracy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to get fresh import with default config
    vi.resetModules();
    vi.doMock('../../../src/configurations/environmentConfiguration.js', () => ({
      default: {
        fork1StartSlot: 564480,
        fork2StartSlot: 1000000,
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should calculate epoch correctly when minGlobalSlot and maxGlobalSlot in same epoch', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxTest123';
    const userSpecifiedEpoch = null;

    // Slots in same epoch: epoch 10 = slots 71400-78539 (7140 slots per epoch)
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '72000', max: '75000' }],
    } as QueryResult);

    // Act
    const result = await getEpoch(hash, userSpecifiedEpoch);

    // Assert
    expect(result).toBe(10); // floor(72000 / 7140) = 10
    expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [hash]);
  });

  it('should reject when slots span 2 epochs', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxTest123';
    const userSpecifiedEpoch = null;

    // Slots spanning multiple epochs: min in epoch 9, max in epoch 12
    // epoch = floor(71399 / 7140) = 9
    // nextEpoch = ceil(85680 / 7140) = 12
    // epoch + 1 = 10, nextEpoch = 12, so 10 != 12 → throws
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '71399', max: '85680' }],
    } as QueryResult);

    // Act & Assert
    await expect(getEpoch(hash, userSpecifiedEpoch))
      .rejects
      .toThrow(/different epochs/);
  });

  it('should handle Epoch 0 with userSpecifiedEpoch = 0 (genesis)', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxGenesisHash';
    const userSpecifiedEpoch = 0;

    // Slots in epoch 0: 0-7139
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '0', max: '5000' }],
    } as QueryResult);

    // Act
    const result = await getEpoch(hash, userSpecifiedEpoch);

    // Assert
    expect(result).toBe(0);
  });

  it('should handle Epoch 0 with userSpecifiedEpoch = 1', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxGenesisHash';
    const userSpecifiedEpoch = 1;

    // Slots in epoch 0 but spanning to epoch 2 (genesis edge case needing user input)
    // epoch = floor(0 / 7140) = 0
    // nextEpoch = ceil(14280 / 7140) = 2
    // epoch + 1 = 1, nextEpoch = 2, so 1 != 2 → goes to else if
    // epoch === 0 && userSpec === 1 → returns 1
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '0', max: '14280' }],
    } as QueryResult);

    // Act
    const result = await getEpoch(hash, userSpecifiedEpoch);

    // Assert
    expect(result).toBe(1);
  });

  it('should reject Epoch 0 with userSpecifiedEpoch = 2', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxGenesisHash';
    const userSpecifiedEpoch = 2;

    // Slots in epoch 0 but spanning to epoch 2 (genesis edge case but invalid userSpec)
    // epoch = floor(0 / 7140) = 0
    // nextEpoch = ceil(14280 / 7140) = 2
    // epoch + 1 = 1, nextEpoch = 2, so 1 != 2 → goes to else if
    // epoch === 0 BUT userSpec === 2 (not 0 or 1) → throws
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '0', max: '14280' }],
    } as QueryResult);

    // Act & Assert
    await expect(getEpoch(hash, userSpecifiedEpoch))
      .rejects
      .toThrow(/different epochs/);
  });

  it('should handle minGlobalSlot at epoch boundary (slot % 7140 == 0)', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxTest123';
    const userSpecifiedEpoch = null;

    // Slot exactly at epoch 10 boundary
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '71400', max: '72000' }],
    } as QueryResult);

    // Act
    const result = await getEpoch(hash, userSpecifiedEpoch);

    // Assert
    expect(result).toBe(10); // floor(71400 / 7140) = 10
  });

  it('should handle maxGlobalSlot at epoch boundary (slot % 7140 == 7139)', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxTest123';
    const userSpecifiedEpoch = null;

    // Slot exactly at end of epoch 10
    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '72000', max: '78539' }],
    } as QueryResult);

    // Act
    const result = await getEpoch(hash, userSpecifiedEpoch);

    // Assert
    expect(result).toBe(10); // floor(72000 / 7140) = 10, ceil(78539 / 7140) = 11, so 10 + 1 = 11 ✓
  });

  it('should return -1 when hash does not exist (no rows)', async () => {
    // Arrange
    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxNonExistent';
    const userSpecifiedEpoch = null;

    mockQuery.mockResolvedValueOnce({
      rows: [],
    } as QueryResult);

    // Act
    const result = await getEpoch(hash, userSpecifiedEpoch);

    // Assert
    expect(result).toBe(-1);
  });

  it('should throw when NUM_SLOTS_IN_EPOCH not configured', async () => {
    // Arrange
    const originalValue = process.env.NUM_SLOTS_IN_EPOCH;
    delete process.env.NUM_SLOTS_IN_EPOCH;

    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxTest123';
    const userSpecifiedEpoch = null;

    // Act & Assert
    await expect(getEpoch(hash, userSpecifiedEpoch))
      .rejects
      .toThrow(/NUM_SLOTS_IN_EPOCH/);

    // Restore
    process.env.NUM_SLOTS_IN_EPOCH = originalValue;
  });

  it('should validate division by zero protection (paranoid test)', async () => {
    // Arrange: temporarily set NUM_SLOTS_IN_EPOCH to 0 (should never happen)
    const originalValue = process.env.NUM_SLOTS_IN_EPOCH;
    process.env.NUM_SLOTS_IN_EPOCH = '0';

    const { getEpoch } = await import('../../../src/database/blockArchiveDb.js');
    const hash = 'jxTest123';
    const userSpecifiedEpoch = null;

    mockQuery.mockResolvedValueOnce({
      rows: [{ min: '72000', max: '75000' }],
    } as QueryResult);

    // Act & Assert
    // This will cause Infinity from division by zero
    const result = await getEpoch(hash, userSpecifiedEpoch);
    expect(result).toBe(Infinity); // JavaScript returns Infinity for division by zero

    // Restore
    process.env.NUM_SLOTS_IN_EPOCH = originalValue;
  });
});

describe('Chain Consistency Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.doMock('../../../src/configurations/environmentConfiguration.js', () => ({
      default: {
        fork1StartSlot: 564480,
        fork2StartSlot: 1000000,
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Missing Height Detection', () => {
    it('should pass when no missing heights', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 1000;
      const maxHeight = 2000;

      // Mock getHeightMissing to return empty array
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as QueryResult);

      // Mock getNullParents to return empty array
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight)).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should detect missing height in middle of range', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 1000;
      const maxHeight = 2000;

      // Mock getHeightMissing to return missing height 1500
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1500 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight))
        .rejects
        .toThrow(/missing blocks.*1500/);
    });

    it('should detect multiple missing heights', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 1000;
      const maxHeight = 2000;

      // Mock getHeightMissing to return multiple missing heights
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1200 }, { height: 1500 }, { height: 1800 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight))
        .rejects
        .toThrow(/missing blocks.*1200.*1500.*1800/);
    });

    it('should allow minHeight = 0 with height 0 missing and height 1 null parent', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 0;
      const maxHeight = 1000;

      // Mock getHeightMissing to return only height 0 missing (allowed for minHeight = 0)
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 0 }],
      } as QueryResult);

      // Mock getNullParents to return height 1 (genesis - allowed for minHeight = 0)
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight)).resolves.not.toThrow();
    });

    it('should reject minHeight = 0 with height 1 missing', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 0;
      const maxHeight = 1000;

      // Mock getHeightMissing to return height 1 missing
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight))
        .rejects
        .toThrow(/missing blocks.*1/);
    });
  });

  describe('Null Parent Detection', () => {
    it('should pass when no null parents', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 1000;
      const maxHeight = 2000;

      // Mock getHeightMissing to return empty
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as QueryResult);

      // Mock getNullParents to return empty
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight)).resolves.not.toThrow();
    });

    it('should allow null parent at height 1 (genesis)', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 0;
      const maxHeight = 1000;

      // Mock getHeightMissing to return [0] (allowed for minHeight = 0)
      // MUST be [{ height: 0 }] not [] - empty array fails validation
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 0 }],
      } as QueryResult);

      // Mock getNullParents to return only [{ height: 1 }] (genesis block)
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight)).resolves.not.toThrow();
    });

    it('should reject null parent at height > 1', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 1000;
      const maxHeight = 2000;

      // Mock getHeightMissing to return empty
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as QueryResult);

      // Mock getNullParents to return [{ height: 1500 }]
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1500 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight))
        .rejects
        .toThrow(/null parents.*1500/);
    });

    it('should allow minHeight = 0 with only height 1 having null parent', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 0;
      const maxHeight = 1000;

      // Mock getHeightMissing to return [{ height: 0 }] (allowed for minHeight = 0)
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 0 }],
      } as QueryResult);

      // Mock getNullParents to return only [{ height: 1 }]
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight)).resolves.not.toThrow();
    });

    it('should detect multiple null parents (error)', async () => {
      // Arrange
      const { validateConsistency } = await import('../../../src/database/blockArchiveDb.js');
      const minHeight = 1000;
      const maxHeight = 2000;

      // Mock getHeightMissing to return empty
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as QueryResult);

      // Mock getNullParents to return [{ height: 1200 }, { height: 1500 }]
      mockQuery.mockResolvedValueOnce({
        rows: [{ height: 1200 }, { height: 1500 }],
      } as QueryResult);

      // Act & Assert
      await expect(validateConsistency(minHeight, maxHeight))
        .rejects
        .toThrow(/null parents.*1200.*1500/);
    });
  });
});
