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

  let { fork } = req.query as unknown as { fork: number };
  if (isNaN(fork)) {
    fork = 0;
    messages.push({ warning: 'Fork was not provided, defaulted to 0' });
  }

  if (fork > 0 && configuration.blockDbVersion == 'v1') {
    res.status(400).send('Invalid fork for this archive database version');
    return;
  }

  try {
    const [minSlot, maxSlot] = getMinMaxSlotHeight(epoch);
    const [epochMinBlockHeight, epochMaxBlockHeight] = await db.getMinMaxBlocksInSlotRange(minSlot, maxSlot, fork);
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

function getMinMaxSlotHeight(epoch: number): [number, number] {
  const slotsInEpoch = configuration.slotsPerEpoch;
  const min = slotsInEpoch * epoch;
  const max = slotsInEpoch * (epoch + 1) - 1;
  return [min, max];
}

export default router;

