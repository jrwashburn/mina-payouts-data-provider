import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import responseTime from 'response-time';
import configuration from './configurations/environmentConfiguration';

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
const app = express();
app.set('trust proxy', 2)
app.use(responseTime());
app.use(helmet());
app.use(limiter);

app.use('/consensus', cors(), consensusRouter);
app.use('/epoch', cors(), epochRouter);
app.use('/blocks', cors(), blocksRouter);
app.use('/staking-ledgers', cors(), stakingLedgerRouter);

app.listen(configuration.port, () => {
  console.log(`Mina Pool Payout Data Provider listening on ${configuration.port}`);
});
