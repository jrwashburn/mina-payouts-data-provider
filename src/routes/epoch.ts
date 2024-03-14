import express from 'express';
import * as db from '../database/blockArchiveDb';
import { BlockSummary } from '../models/blocks';
import configuration from '../configurations/environmentConfiguration';

const router = express.Router();

router.get('/:epoch/', async (req, res) => {
  const epoch = Number(req.params.epoch);
  if (!Number.isInteger(epoch) || epoch < 0) {
    return res.status(400).send('Invalid epoch');
  }
  const messages: { [key: string]: string }[] = [];
  let { fork } = req.query as unknown as { fork: number };

  if (isNaN(fork)) {
    fork = 0;
    messages.push({ warning: 'Fork was not provided, defaulted to 0' });
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
      return res.status(404).send(`No data found for epoch ${epoch} and fork ${fork}`);
    } else {
      return res.status(200).json(response);
    }
  } catch (err) {
    req.log.error(err);
    return res.status(500).send('An error has occured getting epoch data');
  }
});

function getMinMaxSlotHeight(epoch: number): [number, number] {
  const slotsInEpoch = configuration.slotsPerEpoch;
  const min = slotsInEpoch * epoch;
  const max = slotsInEpoch * (epoch + 1) - 1;
  return [min, max];
}

export default router;

