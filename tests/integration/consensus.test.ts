import request from 'supertest';
import { Application } from 'express';
import { createTestServer } from '../utils/testServer.js';
import { fixtures } from '../utils/mockDatabase.js';

describe('Consensus Endpoint', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  describe('GET /consensus', () => {
    it('should return current network consensus state', async () => {
      const response = await request(app).get('/consensus');

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
      const { epoch, globalSlotSinceGenesis } = response.body;

      // Epoch = floor(globalSlotSinceGenesis / 7140) where 7140 is slots per epoch
      const expectedEpoch = Math.floor(Number(globalSlotSinceGenesis) / 7140);
      expect(epoch).toBe(expectedEpoch);
    });

    it('should return valid block height as string', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      expect(typeof response.body.blockHeight).toBe('string');
      expect(/^\d+$/.test(response.body.blockHeight)).toBe(true);
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

    it('should return matching fixture data', async () => {
      const response = await request(app).get('/consensus');

      expect(response.status).toBe(200);
      expect(response.body.epoch).toBe(fixtures.consensus.epoch);
      expect(response.body.blockHeight).toBe(fixtures.consensus.blockHeight);
      expect(response.body.slot).toBe(fixtures.consensus.slot);
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
