import express from 'express';
import * as db from '../database/blockArchiveDb';

const router = express.Router();

router.get('/', async (req, res) => {
  const { key, minHeight, maxHeight } = req.query as unknown as QueryParams;
  try {
    const blocks = await db.getBlocks(key, minHeight, maxHeight);
    const response = { blocks, messages: [] };
    res.status(200).json(response);
  }
  catch (error) {
    console.log(error);
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
