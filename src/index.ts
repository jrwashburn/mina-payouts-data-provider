import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import responseTime from 'response-time';
import configuration from './configurations/environmentConfiguration';

import consensusRouter from './routes/consensus';
import epochRouter from './routes/epoch';
import blocksRouter from './routes/blocks';
import stakingLedgerRouter from './routes/stakingLedgers';

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const app = express();
app.set('trust proxy', 2)
app.use(responseTime());
app.use(helmet());
app.use(limiter);

app.get('/ip', (request, response) => response.send(request.ip))
app.use('/consensus', consensusRouter);
app.use('/epoch', epochRouter);
app.use('/blocks', blocksRouter);
app.use('/staking-ledgers', stakingLedgerRouter);

app.listen(configuration.port, () => {
  console.log(`Mina Pool Payout Data Provider listening on ${configuration.port}`);
});
