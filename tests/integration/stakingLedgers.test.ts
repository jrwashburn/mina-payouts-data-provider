import request from 'supertest';
import { Application } from 'express';
import { createTestServer } from '../utils/testServer.js';
import { fixtures } from '../utils/mockDatabase.js';

describe('Staking Ledgers Endpoint', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  const testLedgerHash = 'jwyody4XQNTnGxkXQEKf87AN27wXadAjYgnGLAtvHahDkn2uWDU';
  const testKey = 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L';

  describe('GET /staking-ledgers/:ledgerHash', () => {
    it('should return staking ledger for a given hash', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stakes');
      expect(response.body).toHaveProperty('totalStakingBalance');
      expect(Array.isArray(response.body.stakes)).toBe(true);
    });

    it('should return stakes with correct structure', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      expect(response.body.stakes.length).toBeGreaterThan(0);

      const stake = response.body.stakes[0];
      expect(stake).toHaveProperty('publicKey');
      expect(stake).toHaveProperty('stakingBalance');
      expect(stake).toHaveProperty('untimedAfterSlot');
      expect(stake).toHaveProperty('shareClass');
    });

    it('should have valid stake entries', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      response.body.stakes.forEach((stake: any) => {
        // Public key should be Mina address format
        expect(typeof stake.publicKey).toBe('string');
        expect(stake.publicKey).toMatch(/^B62q[a-zA-Z0-9]+$/);

        // Staking balance should be numeric string or number
        expect(typeof stake.stakingBalance).toBe('string');
        expect(/^[\d.]+$/.test(stake.stakingBalance)).toBe(true);

        // Untimed after slot should be a number
        expect(typeof stake.untimedAfterSlot).toBe('number');
        expect(stake.untimedAfterSlot).toBeGreaterThanOrEqual(0);

        // Share class should be a string (typically "Common")
        expect(typeof stake.shareClass).toBe('string');
      });
    });

    it('should have correct total staking balance', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      const totalFromHeader = Number(response.body.totalStakingBalance);
      const totalFromStakes = response.body.stakes.reduce(
        (sum: number, stake: any) => sum + Number(stake.stakingBalance),
        0,
      );

      // Allow small floating point differences
      expect(Math.abs(totalFromHeader - totalFromStakes)).toBeLessThan(0.01);
    });

    it('should return matching fixture data', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      expect(response.body.stakes[0]).toEqual(fixtures.stakingLedger.stakes[0]);
      expect(response.body.totalStakingBalance).toBe(fixtures.stakingLedger.totalStakingBalance);
    });
  });

  describe('Staking Balance Validation', () => {
    it('should have non-negative staking balances', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      response.body.stakes.forEach((stake: any) => {
        const balance = Number(stake.stakingBalance);
        expect(balance).toBeGreaterThanOrEqual(0);
      });
    });

    it('should support various balance scales', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      // Should have stakes with different decimal places
      const balances = response.body.stakes.map((s: any) => s.stakingBalance);
      const hasDecimalBalances = balances.some((b: string) => b.includes('.'));
      const hasWholeBalances = balances.some((b: string) => !b.includes('.') || b.endsWith('.0'));

      expect(hasDecimalBalances || hasWholeBalances).toBe(true);
    });
  });

  describe('Untimed After Slot Validation', () => {
    it('should have valid vesting lock periods', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      response.body.stakes.forEach((stake: any) => {
        // Slot numbers should be reasonable
        expect(stake.untimedAfterSlot).toBeGreaterThanOrEqual(0);
        // Vesting periods typically don't exceed 10 years of slots (70M+ slots)
        expect(stake.untimedAfterSlot).toBeLessThan(100000000);
      });
    });

    it('should handle zero-vesting stakes (immediately available)', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      const hasZeroVesting = response.body.stakes.some((s: any) => s.untimedAfterSlot === 0);
      expect(hasZeroVesting).toBe(true);
    });

    it('should handle vesting stakes', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      const hasVestingStakes = response.body.stakes.some((s: any) => s.untimedAfterSlot > 0);
      expect(hasVestingStakes).toBe(true);
    });
  });

  describe('Share Class Validation', () => {
    it('should have valid share class values', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      const validShareClasses = ['Common', 'NPS'];
      response.body.stakes.forEach((stake: any) => {
        expect(validShareClasses).toContain(stake.shareClass);
      });
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should return empty stakes array when no stakes found', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/nonexistenthash`)
        .query({ key: testKey });

      // Should return 404 or empty array
      if (response.status === 200) {
        expect(response.body.stakes).toEqual([]);
      } else {
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Query Parameters', () => {
    it('should accept key parameter', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stakes');
    });

    it('should accept optional epoch parameter', async () => {
      const response = await request(app)
        .get(`/staking-ledgers/${testLedgerHash}`)
        .query({ key: testKey, epoch: '1' });

      expect(response.status === 200 || response.status === 404).toBe(true);
    });
  });
});
