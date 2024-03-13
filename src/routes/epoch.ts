import express from 'express';
import * as db from '../database/blockArchiveDb';
import { BlockSummary } from '../models/blocks';
import configuration from '../configurations/environmentConfiguration';

const router = express.Router();

router.get('/:epoch/', async (req, res) => {
  const epoch: number = parseInt(req.params.epoch);
  const { fork = 0 } = req.query as unknown as { fork: number };
  if (isNaN(epoch) || isNaN(fork)) {
    res.status(400).send('Invalid epoch or fork');
  }

  try {
    const messages: { [key: string]: string }[] = [];
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
    res.status(200).json(response);
  } catch (err) {
    req.log.error(err);
    res.status(500).send('An error has occured getting epoch data');
  }
});

function getMinMaxSlotHeight(epoch: number): [number, number] {
  const slotsInEpoch = configuration.slotsPerEpoch;
  const min = slotsInEpoch * epoch;
  const max = slotsInEpoch * (epoch + 1) - 1;
  return [min, max];
}

export default router;

