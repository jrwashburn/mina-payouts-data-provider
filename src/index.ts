import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import responseTime from 'response-time';
import pino from 'pino';
import pinoHttp from 'pino-http';

import configuration from './configurations/environmentConfiguration';
import startBackgroundTask from './jobs/archiveDbRecencyChecker';
import { checkTrustArchiveDatabaseHeight } from './middlewares/checkTrustArchiveDatabaseHeight';

import consensusRouter from './routes/consensus';
import epochRouter from './routes/epoch';
import blocksRouter from './routes/blocks';
import stakingLedgerRouter from './routes/stakingLedgers';

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
export const logger = pino();
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

app.use('/consensus', cors(), consensusRouter);
app.use('/epoch', cors(), checkTrustArchiveDatabaseHeight, epochRouter);
app.use('/blocks', cors(), checkTrustArchiveDatabaseHeight, blocksRouter);
app.use('/staking-ledgers', cors(), stakingLedgerRouter);

app.listen(configuration.port, () => {
  logger.info(`Mina Pool Payout Data Provider listening on ${configuration.port}`);
  startBackgroundTask();
});
