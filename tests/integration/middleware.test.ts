/**
 * Integration tests for middleware functions
 * Focus: Archive database height trust checking middleware
 * Priority: P1 - IMPORTANT (prevents serving stale data)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestServer } from '../utils/testServer.js';
import configuration from '../../src/configurations/environmentConfiguration.js';

describe('Middleware: Check Trust Archive Database Height (P1-9)', () => {
  let app: Express.Application;

  beforeEach(() => {
    app = createTestServer();
  });

  afterEach(() => {
    // Restore trust to true for other tests
    configuration.trustArchiveDatabaseHeight = true;
  });

  it('should allow request to proceed when trustArchiveDatabaseHeight = true', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = true;

    // Act
    const response = await request(app).get('/consensus');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('epoch');
  });

  it('should return 503 when trustArchiveDatabaseHeight = false', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;

    // Act
    const response = await request(app).get('/consensus');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Service Unavailable');
    expect(response.body.error).toContain('Archive database height not trusted');
  });

  it('should include threshold value in error message', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;
    configuration.archiveDbRecencyThreshold = 10;

    // Act
    const response = await request(app).get('/consensus');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body.error).toContain('10 blocks');
  });

  it('should block /consensus endpoint when untrusted', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;

    // Act
    const response = await request(app).get('/consensus');

    // Assert
    expect(response.status).toBe(503);
  });

  it('should block /epoch endpoint when untrusted', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;

    // Act
    const response = await request(app).get('/epoch/10');

    // Assert
    expect(response.status).toBe(503);
  });

  it('should block /blocks endpoint when untrusted', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;

    // Act
    const response = await request(app)
      .get('/blocks')
      .query({ key: 'B62qTest', minHeight: 1000, maxHeight: 2000 });

    // Assert
    expect(response.status).toBe(503);
  });

  it('should NOT block /staking-ledgers endpoint (no middleware)', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;

    // Act
    const response = await request(app).get('/staking-ledgers/jxTest123');

    // Assert
    // Should not be 503 - may be 200 or other error, but not blocked by middleware
    expect(response.status).not.toBe(503);
  });

  it('should NOT block /health endpoint (no middleware)', async () => {
    // Arrange
    configuration.trustArchiveDatabaseHeight = false;

    // Act
    const response = await request(app).get('/health');

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe('ok');
  });
});
