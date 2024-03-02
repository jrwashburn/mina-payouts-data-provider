import express from 'express';
import * as db from '../database/blockArchiveDb';
import { BlockSummary } from '../models/blocks';
import configuration from '../configurations/environmentConfiguration';


const router = express.Router();

router.get('/:epoch/', async (req, res) => {
  const epoch: number = parseInt(req.params.epoch);
  console.log('Getting epoch data for epoch:', epoch);

  try {
    const messages: { [key: string]: string }[] = [];
    const [minSlot, maxSlot] = getMinMaxSlotHeight(epoch);
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
    console.log('Epoch data:', response);
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('An error has occured getting epoch data');
  }
});

function getMinMaxSlotHeight(epoch: number) {
  const slotsInEpoch = configuration.slotsPerEpoch;
  const min = slotsInEpoch * epoch;
  const max = slotsInEpoch * (epoch + 1) - 1;
  return [min, max];
}

export default router;

