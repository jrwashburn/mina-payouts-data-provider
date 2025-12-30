import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import responseTime from 'response-time';
import * as consensusRoute from '../../src/routes/consensus.js';
import * as blocksRoute from '../../src/routes/blocks.js';
import * as epochRoute from '../../src/routes/epoch.js';
import * as healthRoute from '../../src/routes/health.js';
import * as stakingLedgersRoute from '../../src/routes/stakingLedgers.js';
import { checkTrustArchiveDatabaseHeight } from '../../src/middlewares/checkTrustArchiveDatabaseHeight.js';

/**
 * Creates a test Express application with all routes and middleware configured
 */
export function createTestServer(): Application {
  const app = express();

  // Middleware
  app.use(responseTime());
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Mock logger middleware
  app.use((req, _res, next) => {
    // @ts-ignore - adding mock logger
    req.log = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    };
    next();
  });

  // Use real middleware for archive database height trust

  // Routes
  app.use('/health', healthRoute.default);
  app.use('/consensus', checkTrustArchiveDatabaseHeight, consensusRoute.default);
  app.use('/blocks', checkTrustArchiveDatabaseHeight, blocksRoute.default);
  app.use('/epoch', checkTrustArchiveDatabaseHeight, epochRoute.default);
  app.use('/staking-ledgers', stakingLedgersRoute.default);

  return app;
}

/**
 * Starts a test server on a random available port
 */
export async function startTestServer(): Promise<{ server: any; port: number; app: Application }> {
  const app = createTestServer();

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 8080;
      resolve({ server, port, app });
    });
  });
}

/**
 * Stops a test server
 */
export async function stopTestServer(server: any): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
