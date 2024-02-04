import express from 'express';
import {getLedgerFromHashForKey, getLedgerFromEpochForKey} from '../controllers/stakingLedgers';

const router = express.Router();

router.get('/:ledgerHash', async (req, res) => {
  const key = req.query.key as string;
  const ledgerHash = req.params.ledgerHash as string;

  try {
    const [stakes, totalStakingBalance, messages] = await getLedgerFromHashForKey(ledgerHash, key);
    const response = {
      stakes: stakes,
      totalStakingBalance: totalStakingBalance,
      messages: messages,
    }
    res.status(200).json(response);
  }
  catch (error) {
    console.log(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }

});

router.get('/epoch/:epoch', async (req, res) => {
  const key = req.query.key as string;
  const epoch = parseInt(req.params.epoch);

  try {
    const [stakes, totalStakingBalance, messages] = await getLedgerFromEpochForKey(key, epoch);
    const response = {
      stakes: stakes,
      totalStakingBalance: totalStakingBalance,
      messages: messages,
    }
    res.status(200).json(response);
  }
  catch (error) {
    console.log(error);
    res.status(500).send('An error occurred getting staking ledger information');
  }
});
export default router;