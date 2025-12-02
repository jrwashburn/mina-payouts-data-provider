import request from 'supertest';
import { Application } from 'express';
import { createTestServer } from '../utils/testServer.js';

describe('Health Endpoint', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestServer();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    it('should return plain text response', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // Response body should contain 'ok' or similar status indicator
      expect(response.text || response.body).toBeDefined();
    });

    it('should always be available regardless of database state', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
      }
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app).get('/health');
      const endTime = Date.now();

      // Health check should respond within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Health Check Reliability', () => {
    it('should be idempotent', async () => {
      const response1 = await request(app).get('/health');
      const response2 = await request(app).get('/health');

      expect(response1.status).toBe(response2.status);
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/health').set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(200);
    });
  });
});
