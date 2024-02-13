import express from 'express';
import * as db from '../database/blockArchiveDb';
import { BlockSummary } from '../models/blocks';
import configuration from '../configurations/environmentConfiguration';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('Getting consensus...');
    const messages: { [key: string]: string }[] = [];
    const blockSummary: BlockSummary = await db.getLatestBlock();
    const currentEpoch = getCurrentEpoch(blockSummary.globalslotsincegenesis);
    const response = {
      epoch: currentEpoch, blockHeight: blockSummary.blockheight, globalSlotSinceGenesis: blockSummary.globalslotsincegenesis,
      slot: blockSummary.globalslot - (currentEpoch * configuration.slotsPerEpoch), stateHash: blockSummary.statehash, parentHash: blockSummary.parenthash,
      ledgerHash: blockSummary.ledgerhash, datetime: blockSummary.datetime, messages: messages
    };
    console.log('Consensus:', response);
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred getting consensus information');
  }
});

function getCurrentEpoch(slotNumber: number): number {
  return Math.floor(slotNumber / configuration.slotsPerEpoch);
}

export default router;
