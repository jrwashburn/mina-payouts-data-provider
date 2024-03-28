// Handles /staking-ledgers endpoint
import express from 'express';
import multer from 'multer';
import basicAuth from 'express-basic-auth';
import configuration from '../configurations/environmentConfiguration';
import { getLedgerFromHashForKey, getLedgerFromEpochForKey } from '../controllers/stakingLedgersQuery';
import { uploadStakingLedger } from '../controllers/stakingLedgersCommand';
import { ControllerResponse } from '../models/controller';
import { Ledger, StakingLedgerSourceRow } from '../models/stakes';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 150 * 1024 * 1024, // limit file size to 150MB
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
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).send('No file uploaded');
    }
    const hash: string = req.params.ledgerHash;
    const userSpecifiedEpoch: number | null = req.query.epoch as unknown as number | null;
    req.log.info(`uploading ${req.file.originalname} with hash ${req.params.hash} and epoch ${userSpecifiedEpoch}`);
    try {
      const ledgerJson: StakingLedgerSourceRow[] = JSON.parse(req.file.buffer.toString('utf8'));
      const controllerResponse: ControllerResponse = await uploadStakingLedger(req.log, ledgerJson, hash, userSpecifiedEpoch);
      const response = {
        messages: controllerResponse.responseMessages
      }
      const status = controllerResponse.responseCode || 200;
      req.log.info(response.messages);
      res.status(status).json(response);
    }
    catch (error) {
      req.log.error(error);
      res.status(500).send('An error occurred uploading staking ledger');
    }
  }
  catch (error) {
    req.log.error(error);
    res.status(500).send('An error occurred uploading staking ledger');
  }
});

router.get('/:ledgerHash', async (req, res) => {
  const key = req.query.key as string;
  if (!key) {
    return res.status(400).send('No key provided');
  }
  const ledgerHash = req.params.ledgerHash as string;
  try {
    const controllerResponse: ControllerResponse = await getLedgerFromHashForKey(ledgerHash, key);
    const responseData: Ledger = controllerResponse.responseData as Ledger;
    const response = {
      stakes: responseData.stakes,
      totalStakingBalance: responseData.totalStakingBalance,
      messages: controllerResponse.responseMessages as string[],
    }
    req.log.info(`Staking ledger total balance for hash ${ledgerHash} for key ${key}: ${response.totalStakingBalance}`);
    res.status(200).json(response);
  }
  catch (error) {
    req.log.error(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }

});

router.get('/epoch/:epoch', async (req, res) => {
  const key = req.query.key as string;
  const epoch = parseInt(req.params.epoch);
  if (!key) {
    return res.status(400).send('No key provided');
  }
  try {
    const controllerResponse: ControllerResponse = await getLedgerFromEpochForKey(key, epoch);
    const responseData: Ledger = controllerResponse.responseData as Ledger;
    const response = {
      stakes: responseData.stakes,
      totalStakingBalance: responseData.totalStakingBalance,
      messages: controllerResponse.responseMessages as string[],
    }
    req.log.info(`Staking ledger total balance for epoch ${epoch} for key ${key}: ${response.totalStakingBalance}`);
    res.status(200).json(response);
  }
  catch (error) {
    req.log.error(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }
});
export default router;