import request from 'supertest';
import { Application } from 'express';
import { createTestServer } from '../utils/testServer.js';
import { fixtures } from '../utils/mockDatabase.js';

describe('Blocks Endpoint', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  const testKey = 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L';

  describe('GET /blocks', () => {
    it('should return blocks for a given key within height range', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('blocks');
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.blocks)).toBe(true);
    });

    it('should return blocks with correct structure', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      expect(response.body.blocks.length).toBeGreaterThan(0);

      const block = response.body.blocks[0];
      expect(block).toHaveProperty('blockheight');
      expect(block).toHaveProperty('statehash');
      expect(block).toHaveProperty('stakingledgerhash');
      expect(block).toHaveProperty('blockdatetime');
      expect(block).toHaveProperty('slot');
      expect(block).toHaveProperty('globalslotsincegenesis');
      expect(block).toHaveProperty('creatorpublickey');
      expect(block).toHaveProperty('winnerpublickey');
      expect(block).toHaveProperty('receiverpublickey');
      expect(block).toHaveProperty('coinbase');
      expect(block).toHaveProperty('feetransfertoreceiver');
      expect(block).toHaveProperty('feetransferfromcoinbase');
      expect(block).toHaveProperty('usercommandtransactionfees');
    });

    it('should return blocks sorted by block height', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      const blocks = response.body.blocks;

      for (let i = 0; i < blocks.length - 1; i++) {
        expect(blocks[i].blockheight).toBeLessThanOrEqual(blocks[i + 1].blockheight);
      }
    });

    it('should return blocks matching fixture data', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      expect(response.body.blocks[0]).toEqual(fixtures.blocks[0]);
    });

    it('should return empty array when no blocks found', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '9999999', maxHeight: '9999999' });

      expect(response.status).toBe(200);
      expect(response.body.blocks).toEqual([]);
      expect(response.body.messages).toEqual([]);
    });
  });

  describe('Block Field Validation', () => {
    it('should have valid block heights and slots', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      response.body.blocks.forEach((block: any) => {
        expect(typeof block.blockheight).toBe('number');
        expect(block.blockheight).toBeGreaterThan(0);
        expect(typeof block.slot).toBe('number');
        expect(block.slot).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid coinbase amounts', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      response.body.blocks.forEach((block: any) => {
        expect(typeof block.coinbase).toBe('number');
        expect(block.coinbase).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid fee amounts', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      response.body.blocks.forEach((block: any) => {
        expect(typeof block.feetransfertoreceiver).toBe('number');
        expect(typeof block.feetransferfromcoinbase).toBe('number');
        expect(typeof block.usercommandtransactionfees).toBe('number');
        expect(block.feetransfertoreceiver).toBeGreaterThanOrEqual(0);
        expect(block.feetransferfromcoinbase).toBeGreaterThanOrEqual(0);
        expect(block.usercommandtransactionfees).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid Mina addresses', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      response.body.blocks.forEach((block: any) => {
        // Mina addresses start with B62q
        expect(block.creatorpublickey).toMatch(/^B62q[a-zA-Z0-9]+$/);
        expect(block.winnerpublickey).toMatch(/^B62q[a-zA-Z0-9]+$/);
        expect(block.receiverpublickey).toMatch(/^B62q[a-zA-Z0-9]+$/);
      });
    });

    it('should have valid state and ledger hashes', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
      response.body.blocks.forEach((block: any) => {
        // State hashes start with 3N
        expect(block.statehash).toMatch(/^3N[a-zA-Z0-9]+$/);
        // Ledger hashes start with j
        expect(block.stakingledgerhash).toMatch(/^j[a-zA-Z0-9]+$/);
      });
    });
  });

  describe('Query Parameter Validation', () => {
    it('should accept numeric string heights', async () => {
      const response = await request(app)
        .get('/blocks')
        .query({ key: testKey, minHeight: '1000', maxHeight: '2000' });

      expect(response.status).toBe(200);
    });
  });
});
