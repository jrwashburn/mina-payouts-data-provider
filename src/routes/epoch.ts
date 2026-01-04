import express, { Request, Response } from 'express';
import * as db from '../database/blockArchiveDb.js';
import { BlockSummary } from '../models/blocks.js';
import configuration from '../configurations/environmentConfiguration.js';

const router = express.Router();

router.get('/:epoch/', async (req: Request<{ epoch: string }>, res: Response): Promise<void> => {
  const epoch = Number(req.params.epoch);
  const messages: { [key: string]: string }[] = [];

  if (!Number.isInteger(epoch) || epoch < 0) {
    res.status(400).send('Invalid epoch');
    return;
  }

  let fork = Number(req.query.fork);
  if (isNaN(fork)) {
    fork = 0;
    messages.push({ warning: 'Fork was not provided, defaulted to 0' });
  }

  // Validate fork value
  if (fork < 0) {
    res.status(400).send('Invalid fork value. Fork must be >= 0');
    return;
  }

  // Validate fork activation
  if (fork >= configuration.forkStartSlots.length) {
    res.status(400).send(`Fork ${fork} not supported (only ${configuration.forkStartSlots.length - 1} forks configured)`);
    return;
  }
  
  // For forks > 0, check if they are activated (start slot > 0)
  if (fork > 0 && configuration.forkStartSlots[fork] === 0) {
    res.status(400).send(`Fork ${fork} not activated (FORK_${fork}_START_SLOT not configured)`);
    return;
  }

  try {
    const [minSlot, maxSlot] = getMinMaxSlotHeight(epoch, fork);
    const [epochMinBlockHeight, epochMaxBlockHeight] = await db.getMinMaxBlocksInSlotRange(minSlot, maxSlot);
    const blockSummary: BlockSummary = await db.getLatestBlock();
    if (blockSummary.blockheight - epochMaxBlockHeight < 20) {
      messages.push({ warning: 'Epoch is in progress' });
    }
    const response = {
      minBlockHeight: epochMinBlockHeight,
      maxBlockHeight: epochMaxBlockHeight,
      messages: messages,
    }
    req.log.info(response, `Epoch data for epoch ${epoch} and fork ${fork}`);
    if (epochMinBlockHeight === null || epochMinBlockHeight === undefined) {
      res.status(404).send(`No data found for epoch ${epoch} and fork ${fork}`);
      return;
    } else {
      res.status(200).json(response);
      return;
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).send('An error has occured getting epoch data');
    return;
  }
});

function getMinMaxSlotHeight(epoch: number, fork: number): [number, number] {
  const slotsInEpoch = configuration.slotsPerEpoch;
  const forkOffset = configuration.forkStartSlots[fork] || 0;
  const min = forkOffset + (slotsInEpoch * epoch);
  const max = forkOffset + (slotsInEpoch * (epoch + 1)) - 1;
  return [min, max];
}

export default router;

