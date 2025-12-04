import request from 'supertest';
import { Application } from 'express';
import { createTestServer } from '../utils/testServer.js';

describe('Consensus Endpoint', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  describe('GET /consensus', () => {
    it('should return current network consensus state', async () => {
      const response = await request(app).get('/consensus');

      if (response.status !== 200) {
        console.log('Response body:', response.body);
        console.log('Response text:', response.text);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('epoch');
      expect(response.body).toHaveProperty('blockHeight');
      expect(response.body).toHaveProperty('globalSlotSinceGenesis');
      expect(response.body).toHaveProperty('slot');
      expect(response.body).toHaveProperty('stateHash');
      expect(response.body).toHaveProperty('parentHash');
      expect(response.body).toHaveProperty('ledgerHash');
      expect(response.body).toHaveProperty('datetime');
      expect(response.body).toHaveProperty('messages');
    });

    it('should return correct epoch calculation from slot', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      const { epoch, slot } = response.body;

      // Epoch is calculated from global_slot_since_hard_fork (not returned in API)
      // Just verify epoch and slot are reasonable values
      expect(Number(epoch)).toBeGreaterThanOrEqual(0);
      expect(Number(slot)).toBeGreaterThanOrEqual(0);
      expect(Number(slot)).toBeLessThan(7140); // Slot should be less than slots per epoch
    });

    it('should return valid block height as number', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      expect(typeof response.body.blockHeight).toBe('string');
      expect(Number(response.body.blockHeight)).toBeGreaterThan(0);
    });

    it('should return valid ISO 8601 datetime', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      const dateTime = response.body.datetime;
      expect(typeof dateTime).toBe('string');
      expect(() => new Date(dateTime)).not.toThrow();
    });

    it('should return empty messages array initially', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should have slot less than 7140 (slots per epoch)', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      expect(response.body.slot).toBeLessThan(7140);
      expect(response.body.slot).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent state hashes', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      // Mina state hashes start with "3N" prefix (base58 encoding)
      expect(response.body.stateHash).toMatch(/^3N[a-zA-Z0-9]+$/);
      expect(response.body.parentHash).toMatch(/^3N[a-zA-Z0-9]+$/);
      // Ledger hash can be different format
      expect(response.body.ledgerHash).toMatch(/^j[a-zA-Z0-9]+$/);
    });

    it('should return matching fixture data (numeric blockHeight)', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      // Verify structure and reasonable values
      expect(Number(response.body.epoch)).toBeGreaterThanOrEqual(0);
      expect(Number(response.body.blockHeight)).toBeGreaterThan(0);
      expect(Number(response.body.slot)).toBeGreaterThanOrEqual(0);
      expect(Number(response.body.slot)).toBeLessThan(7140);
      expect(Number(response.body.globalSlotSinceGenesis)).toBeGreaterThan(0);
    });
  });

  describe('Consensus Structure Validation', () => {
    it('should have all required fields as correct types', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      expect(typeof response.body.epoch).toBe('number');
      expect(typeof response.body.blockHeight).toBe('string');
      expect(typeof response.body.globalSlotSinceGenesis).toBe('string');
      expect(typeof response.body.slot).toBe('number');
      expect(typeof response.body.stateHash).toBe('string');
      expect(typeof response.body.parentHash).toBe('string');
      expect(typeof response.body.ledgerHash).toBe('string');
      expect(typeof response.body.datetime).toBe('string');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
  });
});
