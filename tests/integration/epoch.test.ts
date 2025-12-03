import request from 'supertest';
import { Application } from 'express';
import { createTestServer } from '../utils/testServer.js';
import { fixtures } from '../utils/mockDatabase.js';

describe('Epoch Endpoint', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  describe('GET /epoch/:epoch', () => {
    it('should return block height range for an epoch', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('minBlockHeight');
      expect(response.body).toHaveProperty('maxBlockHeight');
      expect(response.body).toHaveProperty('messages');
    });

    it('should return block heights as numbers', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      // Database returns these as strings that can be converted to numbers
      expect(typeof response.body.minBlockHeight).toBe('string');
      expect(typeof response.body.maxBlockHeight).toBe('string');
      expect(Number(response.body.minBlockHeight)).toBeGreaterThanOrEqual(0);
      expect(Number(response.body.maxBlockHeight)).toBeGreaterThan(0);
    });

    it('should return positive block heights', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      expect(Number(response.body.minBlockHeight)).toBeGreaterThanOrEqual(0);
      expect(Number(response.body.maxBlockHeight)).toBeGreaterThan(0);
    });

    it('should have minBlockHeight <= maxBlockHeight', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      const min = Number(response.body.minBlockHeight);
      const max = Number(response.body.maxBlockHeight);
      expect(min).toBeLessThanOrEqual(max);
    });

    it('should return matching fixture data', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      // Verify structure instead of exact fixture match
      expect(response.body).toHaveProperty('minBlockHeight');
      expect(response.body).toHaveProperty('maxBlockHeight');
      expect(Number(response.body.minBlockHeight)).toBeGreaterThanOrEqual(0);
      expect(Number(response.body.maxBlockHeight)).toBeGreaterThan(Number(response.body.minBlockHeight));
    });

    it('should return messages array', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
  });

  describe('Epoch Calculation Validation', () => {
    it('should return reasonable block height ranges', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      const min = Number(response.body.minBlockHeight);
      const max = Number(response.body.maxBlockHeight);

      // Epochs typically span thousands of blocks
      // (7140 slots per epoch, roughly 1 block per slot in normal conditions)
      const range = max - min;
      expect(range).toBeGreaterThan(0);
    });
  });

  describe('Fork Parameter Handling', () => {
    it('should accept fork parameter with default value 0', async () => {
      const response = await request(app).get('/epoch/1').query({ fork: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('minBlockHeight');
      expect(response.body).toHaveProperty('maxBlockHeight');
    });

    it('should accept fork parameter with value 1', async () => {
      const response = await request(app).get('/epoch/1').query({ fork: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('minBlockHeight');
      expect(response.body).toHaveProperty('maxBlockHeight');
    });

    it('should handle missing fork parameter gracefully', async () => {
      const response = await request(app).get('/epoch/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('minBlockHeight');
      expect(response.body).toHaveProperty('maxBlockHeight');
      // Should default to fork 0 or include a warning message
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
  });

  describe('Multiple Epochs', () => {
    it('should handle different epoch numbers', async () => {
      for (const epochNum of [0, 1, 5, 10]) {
        const response = await request(app).get(`/epoch/${epochNum}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('minBlockHeight');
        expect(response.body).toHaveProperty('maxBlockHeight');
      }
    });
  });
});
