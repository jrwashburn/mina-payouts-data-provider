import { describe, it, expect } from 'vitest';
import { isPoolPayout } from '../../../src/utils/payoutDetector.js';

describe('payoutDetector', () => {
  describe('No Configuration', () => {
    it('should return false when no payoutConfig provided', () => {
      const event = { memo: 'Payout', from: 'B62qTest123' };
      expect(isPoolPayout(event, undefined)).toBe(false);
    });

    it('should return false when payoutConfig is empty object', () => {
      const event = { memo: 'Payout', from: 'B62qTest123' };
      expect(isPoolPayout(event, {})).toBe(false);
    });
  });

  describe('Memo Keyword Detection', () => {
    it('should return true when memo contains configured keyword (case insensitive)', () => {
      const event = { memo: 'Pool Payout received' };
      const config = { memoKeywords: ['Payout'] };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return true when memo matches keyword with different case', () => {
      const event = { memo: 'PAYOUT' };
      const config = { memoKeywords: ['payout'] };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return true when memo contains any of multiple keywords', () => {
      const event = { memo: 'Staking reward' };
      const config = { memoKeywords: ['Payout', 'Reward', 'Staking'] };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return false when memo does not contain any keyword', () => {
      const event = { memo: 'Regular payment' };
      const config = { memoKeywords: ['Payout', 'Reward'] };
      expect(isPoolPayout(event, config)).toBe(false);
    });

    it('should return false when memo is undefined', () => {
      const event = { from: 'B62qTest123' };
      const config = { memoKeywords: ['Payout'] };
      expect(isPoolPayout(event, config)).toBe(false);
    });

    it('should return false when memoKeywords is empty array', () => {
      const event = { memo: 'Payout' };
      const config = { memoKeywords: [] };
      expect(isPoolPayout(event, config)).toBe(false);
    });
  });

  describe('Payout Account Detection', () => {
    it('should return true when from address matches configured payout account', () => {
      const event = { from: 'B62qPoolAccount123' };
      const config = { payoutAccounts: ['B62qPoolAccount123'] };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return true when from address matches any of multiple payout accounts', () => {
      const event = { from: 'B62qPoolB' };
      const config = { payoutAccounts: ['B62qPoolA', 'B62qPoolB', 'B62qPoolC'] };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return false when from address does not match any payout account', () => {
      const event = { from: 'B62qOtherAccount' };
      const config = { payoutAccounts: ['B62qPoolAccount123'] };
      expect(isPoolPayout(event, config)).toBe(false);
    });

    it('should return false when from is undefined', () => {
      const event = { memo: 'test' };
      const config = { payoutAccounts: ['B62qPoolAccount123'] };
      expect(isPoolPayout(event, config)).toBe(false);
    });

    it('should return false when payoutAccounts is empty array', () => {
      const event = { from: 'B62qPoolAccount123' };
      const config = { payoutAccounts: [] };
      expect(isPoolPayout(event, config)).toBe(false);
    });
  });

  describe('OR Logic - Combined Rules', () => {
    it('should return true when memo matches keyword (ignoring from address)', () => {
      const event = { memo: 'Payout', from: 'B62qOtherAccount' };
      const config = {
        memoKeywords: ['Payout'],
        payoutAccounts: ['B62qPoolAccount'],
      };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return true when from address matches (ignoring memo)', () => {
      const event = { memo: 'Regular payment', from: 'B62qPoolAccount' };
      const config = {
        memoKeywords: ['Payout'],
        payoutAccounts: ['B62qPoolAccount'],
      };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return true when both memo and from address match', () => {
      const event = { memo: 'Payout', from: 'B62qPoolAccount' };
      const config = {
        memoKeywords: ['Payout'],
        payoutAccounts: ['B62qPoolAccount'],
      };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should return false when neither memo nor from address match', () => {
      const event = { memo: 'Regular payment', from: 'B62qOtherAccount' };
      const config = {
        memoKeywords: ['Payout'],
        payoutAccounts: ['B62qPoolAccount'],
      };
      expect(isPoolPayout(event, config)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial keyword matches in memo', () => {
      const event = { memo: 'MyPoolPayoutForStaking' };
      const config = { memoKeywords: ['Payout'] };
      expect(isPoolPayout(event, config)).toBe(true);
    });

    it('should require exact account match (not partial)', () => {
      const event = { from: 'B62qPoolAccount123xyz' };
      const config = { payoutAccounts: ['B62qPoolAccount123'] };
      expect(isPoolPayout(event, config)).toBe(false);
    });
  });
});
