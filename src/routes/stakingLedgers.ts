import express from 'express';
import multer from 'multer';
import basicAuth from 'express-basic-auth';
import configuration from '../configurations/environmentConfiguration';
import { getLedgerFromHashForKey, getLedgerFromEpochForKey } from '../controllers/stakingLedgersQuery';
import { uploadStakingLedger } from '../controllers/stakingLedgersCommand';
import { ControllerResponse } from '../models/controller';
import { Ledger } from '../models/stakes';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 150 * 1024 * 1024, // limit file size to 5MB
  },
});
const user = configuration.ledgerUploadApiUser;
const password = configuration.ledgerUploadApiPassword;
const auth = basicAuth({
  users: {
    [user]: password
  },
  challenge: true,
  unauthorizedResponse: 'Unauthorized',
});

router.post('/:ledgerHash', auth, upload.single('jsonFile'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).send('No file uploaded');
  }
  const hash: string = req.params.ledgerHash;
  const nextEpoch: number | null = req.query.nextepoch as unknown as number | null;
  console.log(`uploading ${req.file.originalname} with hash ${req.params.hash} and nextepoch ${req.query.nextepoch}`);
  try {
    const controllerResponse: ControllerResponse = await uploadStakingLedger(req.file.buffer, hash, nextEpoch);
    const response = {
      messages: controllerResponse.responseMessages,
    }
    res.status(200).json(response);
  }
  catch (error) {
    console.error(error);
    res.status(500).send('An error occurred uploading staking ledger');
  }
});

router.get('/:ledgerHash', async (req, res) => {
  const key = req.query.key as string;
  const ledgerHash = req.params.ledgerHash as string;

  try {
    const controllerResponse: ControllerResponse = await getLedgerFromHashForKey(ledgerHash, key);
    const responseData: Ledger = controllerResponse.responseData as Ledger;
    const response = {
      stakes: responseData.stakes,
      totalStakingBalance: responseData.totalStakingBalance,
      messages: controllerResponse.responseMessages as string[],
    }
    res.status(200).json(response);
  }
  catch (error) {
    console.error(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }

});

router.get('/epoch/:epoch', async (req, res) => {
  const key = req.query.key as string;
  const epoch = parseInt(req.params.epoch);

  try {
    const controllerResponse: ControllerResponse = await getLedgerFromEpochForKey(key, epoch);
    const responseData: Ledger = controllerResponse.responseData as Ledger;
    const response = {
      stakes: responseData.stakes,
      totalStakingBalance: responseData.totalStakingBalance,
      messages: controllerResponse.responseMessages as string[],
    }
    res.status(200).json(response);
  }
  catch (error) {
    console.error(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }
});
export default router;