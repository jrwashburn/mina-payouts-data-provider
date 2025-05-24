import express from 'express';
import * as db from '../database/blockArchiveDb.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { key, minHeight, maxHeight } = req.query as unknown as QueryParams;
  try {
    const blocks = await db.getBlocks(key, minHeight, maxHeight);
    const response = { blocks, messages: [] };
    if (blocks.length > 0) {
      req.log.info(`Returning blocks for key ${key} from height ${minHeight} to ${maxHeight}, returning blocks ${response.blocks[0].blockheight} to ${response.blocks[response.blocks.length - 1].blockheight}`);
    } else {
      req.log.info(blocks, 'No blocks returned');
    }
    res.status(200).json(response);
  }
  catch (error) {
    req.log.error(error);
    res.status(500).send('An error occurred getting block information');
  }
});

interface QueryParams {
  key: string;
  minHeight: number;
  maxHeight: number;
  ledgerHash: string;
}

export default router;
