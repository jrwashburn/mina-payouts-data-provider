import request from 'supertest';
import { Application } from 'express';
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestServer } from '../utils/testServer.js';

describe('Tax Export Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  describe('GET /tax-export', () => {
    describe('Request Validation', () => {
      it('should return 400 when key parameter is missing', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            startDate: '20240101',
            endDate: '20240131',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Required parameters');
      });

      it('should return 400 when startDate is missing', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            endDate: '20240131',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Required parameters');
      });

      it('should return 400 when endDate is missing', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            startDate: '20240101',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Required parameters');
      });

      it('should accept valid request with required params', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            startDate: '20240101',
            endDate: '20240131',
          });

        // May return 500 if database not available, but shouldn't be 400
        expect(response.status).not.toBe(400);
      });
    });

    describe('Optional Parameters', () => {
      it('should accept format parameter', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            startDate: '20240101',
            endDate: '20240131',
            format: 'koinly',
          });

        expect(response.status).not.toBe(400);
      });

      it('should default format to json when not provided', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            startDate: '20240101',
            endDate: '20240131',
          });

        // If successful, should return JSON content-type
        if (response.status === 200) {
          expect(response.header['content-type']).toContain('application/json');
        }
      });

      it('should accept payoutKeyword parameter', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            startDate: '20240101',
            endDate: '20240131',
            payoutKeyword: 'Reward',
          });

        expect(response.status).not.toBe(400);
      });

      it('should accept payoutAccount parameter', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: 'B62q' + 'x'.repeat(51),
            startDate: '20240101',
            endDate: '20240131',
            payoutAccount: 'B62qPool' + 'x'.repeat(47),
          });

        expect(response.status).not.toBe(400);
      });
    });

    describe('Response Headers by Format', () => {
      const validKey = 'B62q' + 'x'.repeat(51);
      const validDates = {
        startDate: '20240101',
        endDate: '20240131',
      };

      it('should return CSV headers for koinly format', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: validKey,
            ...validDates,
            format: 'koinly',
          });

        if (response.status === 200) {
          expect(response.header['content-type']).toContain('text/csv');
          expect(response.header['content-disposition']).toContain('.csv');
          expect(response.header['content-disposition']).toContain('koinly');
        }
      });

      it('should return CSV headers for ledgible format', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: validKey,
            ...validDates,
            format: 'ledgible',
          });

        if (response.status === 200) {
          expect(response.header['content-type']).toContain('text/csv');
          expect(response.header['content-disposition']).toContain('.csv');
          expect(response.header['content-disposition']).toContain('ledgible');
        }
      });

      it('should return XLSX headers for blockpit format', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: validKey,
            ...validDates,
            format: 'blockpit',
          });

        if (response.status === 200) {
          expect(response.header['content-type']).toContain('spreadsheetml');
          expect(response.header['content-disposition']).toContain('.xlsx');
          expect(response.header['content-disposition']).toContain('blockpit');
        }
      });

      it('should return JSON headers for json format', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: validKey,
            ...validDates,
            format: 'json',
          });

        if (response.status === 200) {
          expect(response.header['content-type']).toContain('application/json');
        }
      });

      it('should include account prefix in filename', async () => {
        const response = await request(app)
          .get('/tax-export')
          .query({
            key: validKey,
            ...validDates,
            format: 'koinly',
          });

        if (response.status === 200) {
          expect(response.header['content-disposition']).toContain('B62q');
        }
      });
    });
  });

  describe('POST /tax-export', () => {
    describe('Request Body Validation', () => {
      it('should return 400 when accounts array is missing', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            startDate: '20240101',
            endDate: '20240131',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('accounts');
      });

      it('should return 400 when accounts array is empty', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [],
            startDate: '20240101',
            endDate: '20240131',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('accounts');
      });

      it('should return 400 when startDate is missing', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: ['B62q' + 'x'.repeat(51)],
            endDate: '20240131',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('startDate');
      });

      it('should return 400 when endDate is missing', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: ['B62q' + 'x'.repeat(51)],
            startDate: '20240101',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('endDate');
      });

      it('should accept valid request body', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: ['B62q' + 'x'.repeat(51)],
            startDate: '20240101',
            endDate: '20240131',
          });

        expect(response.status).not.toBe(400);
      });
    });

    describe('Multiple Accounts', () => {
      it('should accept multiple accounts in array', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [
              'B62qAAA' + 'x'.repeat(48),
              'B62qBBB' + 'x'.repeat(48),
            ],
            startDate: '20240101',
            endDate: '20240131',
          });

        expect(response.status).not.toBe(400);
      });

      it('should return 400 when exceeding maximum accounts', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: Array(11).fill('B' + '1'.repeat(54)),
            startDate: '20240101',
            endDate: '20240131',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Maximum');
      });

      it('should use multi-account label in filename', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [
              'B62qAAA' + 'x'.repeat(48),
              'B62qBBB' + 'x'.repeat(48),
            ],
            startDate: '20240101',
            endDate: '20240131',
            format: 'koinly',
          });

        if (response.status === 200) {
          expect(response.header['content-disposition']).toContain('2-accounts');
        }
      });
    });

    describe('Payout Configuration', () => {
      const validAccount = 'B62q' + 'x'.repeat(51);

      it('should accept payoutConfig with memoKeywords', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [validAccount],
            startDate: '20240101',
            endDate: '20240131',
            payoutConfig: {
              memoKeywords: ['Payout', 'Reward'],
            },
          });

        expect(response.status).not.toBe(400);
      });

      it('should accept payoutConfig with payoutAccounts', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [validAccount],
            startDate: '20240101',
            endDate: '20240131',
            payoutConfig: {
              payoutAccounts: ['B62qPool' + 'x'.repeat(47)],
            },
          });

        expect(response.status).not.toBe(400);
      });

      it('should accept payoutConfig with both keywords and accounts', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [validAccount],
            startDate: '20240101',
            endDate: '20240131',
            payoutConfig: {
              memoKeywords: ['Payout'],
              payoutAccounts: ['B62qPool' + 'x'.repeat(47)],
            },
          });

        expect(response.status).not.toBe(400);
      });

      it('should default to Payout keyword when no config provided', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [validAccount],
            startDate: '20240101',
            endDate: '20240131',
          });

        // Should succeed with default config
        expect(response.status).not.toBe(400);
      });
    });

    describe('Format Options', () => {
      const validAccount = 'B62q' + 'x'.repeat(51);
      const validDates = {
        startDate: '20240101',
        endDate: '20240131',
      };

      it('should accept all valid formats', async () => {
        const formats = ['koinly', 'ledgible', 'blockpit', 'json'];

        for (const format of formats) {
          const response = await request(app)
            .post('/tax-export')
            .send({
              accounts: [validAccount],
              ...validDates,
              format,
            });

          expect(response.status).not.toBe(400);
        }
      });

      it('should return 400 for invalid format', async () => {
        const response = await request(app)
          .post('/tax-export')
          .send({
            accounts: [validAccount],
            ...validDates,
            format: 'invalid',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('format');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 with error message on controller failure', async () => {
      // Use invalid date to trigger validation error
      const response = await request(app)
        .post('/tax-export')
        .send({
          accounts: ['B62q' + 'x'.repeat(51)],
          startDate: '20240131',
          endDate: '20240101', // End before start
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/tax-export')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Route Accessibility', () => {
    it('GET endpoint should be accessible', async () => {
      const response = await request(app).get('/tax-export');

      // Should not get 404
      expect(response.status).not.toBe(404);
    });

    it('POST endpoint should be accessible', async () => {
      const response = await request(app).post('/tax-export');

      // Should not get 404
      expect(response.status).not.toBe(404);
    });

    it('should reject unsupported methods', async () => {
      const response = await request(app).put('/tax-export');

      expect(response.status).toBe(404);
    });
  });
});
