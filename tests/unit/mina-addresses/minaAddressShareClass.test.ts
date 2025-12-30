/**
 * Unit tests for minaAddressShareClass.ts
 * Focus: Share class categorization for addresses
 * Priority: P1 - IMPORTANT (affects financial reporting)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { MinaAddresses } from '../../../src/mina-addresses/minaAddressShareClass.js';

// Mock fs module
vi.mock('fs/promises');

describe('Share Class Determination (P1-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return NPS/MF for address in Mina Foundation CSV', async () => {
    // Arrange
    const foundationAddress = 'B62qFoundation123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('Mina_Foundation')) {
        return `${foundationAddress}\nB62qFoundation456`;
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(foundationAddress);

    // Assert
    expect(result.shareClass).toBe('NPS');
    expect(result.shareOwner).toBe('MF');
  });

  it('should return NPS/O1 for address in O1 Labs CSV', async () => {
    // Arrange
    const o1Address = 'B62qO1Labs123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('O1_Labs')) {
        return `${o1Address}\nB62qO1Labs456`;
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(o1Address);

    // Assert
    expect(result.shareClass).toBe('NPS');
    expect(result.shareOwner).toBe('O1');
  });

  it('should return NPS/INVEST for address in Investors CSV', async () => {
    // Arrange
    const investorAddress = 'B62qInvestor123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('Investors')) {
        return `${investorAddress}\nB62qInvestor456`;
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(investorAddress);

    // Assert
    expect(result.shareClass).toBe('NPS');
    expect(result.shareOwner).toBe('INVEST');
  });

  it('should return Common/"" for address not in any CSV', async () => {
    // Arrange
    const commonAddress = 'B62qCommon123';
    vi.mocked(fs.readFile).mockResolvedValue('B62qOtherAddress\n');

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(commonAddress);

    // Assert
    expect(result.shareClass).toBe('Common');
    expect(result.shareOwner).toBe('');
  });

  it('should prioritize Foundation over O1 Labs if address in multiple CSVs', async () => {
    // Arrange: Address in both Foundation and O1 Labs
    const address = 'B62qDuplicate123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('Mina_Foundation') || filePath.includes('O1_Labs')) {
        return `${address}`;
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(address);

    // Assert
    // Foundation check comes first, so it should return MF
    expect(result.shareClass).toBe('NPS');
    expect(result.shareOwner).toBe('MF');
  });

  it('should handle CSV file loading errors', async () => {
    // Arrange
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    // Act & Assert
    await expect(MinaAddresses.create('invalid-path')).rejects.toThrow('File not found');
  });

  it('should handle empty CSV files', async () => {
    // Arrange
    vi.mocked(fs.readFile).mockResolvedValue('');

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass('B62qAnyAddress');

    // Assert
    // Empty CSV means no matches, should return Common
    expect(result.shareClass).toBe('Common');
    expect(result.shareOwner).toBe('');
  });

  it('should handle whitespace in addresses', async () => {
    // Arrange: Address with trailing whitespace in CSV
    const address = 'B62qTest123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('Mina_Foundation')) {
        return `${address}  \n`; // Trailing whitespace
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(address);

    // Assert
    // Whitespace is trimmed during parsing, so exact match should work
    expect(result.shareClass).toBe('NPS');
    expect(result.shareOwner).toBe('MF');
  });

  it('should be case-sensitive for address matching', async () => {
    // Arrange
    const address = 'B62qTest123';
    const lowerCaseAddress = 'b62qtest123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('Mina_Foundation')) {
        return `${address}`;
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(lowerCaseAddress);

    // Assert
    // Mina addresses are case-sensitive, so lowercase shouldn't match
    expect(result.shareClass).toBe('Common');
    expect(result.shareOwner).toBe('');
  });

  it('should not match partial addresses', async () => {
    // Arrange: One address is substring of another
    const fullAddress = 'B62qTest12345';
    const partialAddress = 'B62qTest123';
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath.includes('Mina_Foundation')) {
        return `${fullAddress}`;
      }
      return '';
    });

    const minaAddresses = await MinaAddresses.create('test-path');

    // Act
    const result = await minaAddresses.getPublicKeyShareClass(partialAddress);

    // Assert
    // Exact matching should NOT match partial addresses
    expect(result.shareClass).toBe('Common');
    expect(result.shareOwner).toBe('');
  });
});
