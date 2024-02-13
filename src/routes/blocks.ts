import express from 'express';
import * as db from '../database/blockArchiveDb';

const router = express.Router();

router.get('/', async (req, res) => {
  const { key, minHeight, maxHeight } = req.query as unknown as QueryParams;
  console.log('Getting blocks for key:', key, 'minHeight:', minHeight, 'maxHeight:', maxHeight);
  try {
    const blocks = await db.getBlocks(key, minHeight, maxHeight);
    const response = { blocks, messages: [] };
    console.log('Blocks:', response.blocks[0].blockheight, 'to', response.blocks[response.blocks.length - 1].blockheight);
    res.status(200).json(response);
  }
  catch (error) {
    console.error(error);
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
