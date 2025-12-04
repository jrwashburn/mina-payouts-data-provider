import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import responseTime from 'response-time';
import pino from 'pino';
import pinoHttp from 'pino-http';

import configuration from './configurations/environmentConfiguration.js';
import startBackgroundTask from './jobs/archiveDbRecencyChecker.js';
import { checkTrustArchiveDatabaseHeight } from './middlewares/checkTrustArchiveDatabaseHeight.js';

import consensusRouter from './routes/consensus.js';
import epochRouter from './routes/epoch.js';
import blocksRouter from './routes/blocks.js';
import stakingLedgerRouter from './routes/stakingLedgers.js';
import healthRouter from './routes/health.js';

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const logger = pino({
  level: configuration.logLevel || 'info',
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
// @ts-expect-error pino-http default export interop
const expressLogger = pinoHttp({
  logger, redact: {
    paths: ['req.headers', 'req.body', 'res.headers'],
  }
});

const app = express();
app.set('trust proxy', 2)
app.use(responseTime());
app.use(helmet());
app.use(limiter);
app.use(expressLogger);

app.use('/health', cors(), healthRouter);
app.use('/consensus', cors(), checkTrustArchiveDatabaseHeight, consensusRouter);
app.use('/epoch', cors(), checkTrustArchiveDatabaseHeight, epochRouter);
app.use('/blocks', cors(), checkTrustArchiveDatabaseHeight, blocksRouter);
app.use('/staking-ledgers', cors(), stakingLedgerRouter);

app.listen(configuration.port, () => {
  logger.info(`Mina Pool Payout Data Provider listening on ${configuration.port}`);
  startBackgroundTask();
});
