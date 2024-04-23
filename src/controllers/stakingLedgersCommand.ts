import { hashExists, updateEpoch, insertBatch } from '../database/stakingLedgerDb';
import { getEpoch } from '../database/blockArchiveDb';
import { ControllerResponse } from '../models/controller';
import { StakingLedgerSourceRow } from '../models/stakes';
import { Logger } from 'pino';

export async function uploadStakingLedger(log: Logger, ledgerJson: StakingLedgerSourceRow[], hash: string, userSpecifiedEpoch: number | null) {
  log.info('uploadStakingLedger called for hash:', hash);
  const [isAlreadyImported, hashEpoch] = await hashExists(hash, userSpecifiedEpoch);
  if (isAlreadyImported) {
    if (hashEpoch == null || hashEpoch < 0) {
      const epochToUpdate = await getEpoch(hash, userSpecifiedEpoch);
      if (epochToUpdate > 0) {
        await updateEpoch(hash, epochToUpdate);
      }
    }
    log.info(`File with hash ${hash} for user specified epoch {userSpecifiedEpoch} was already imported`);
    const controllerResponse: ControllerResponse = { responseMessages: [`File with hash ${hash} was already imported`], responseCode: 409 }
    return controllerResponse;
  }
  else {
    log.info(`Processing file ${hash}`);
    await insertBatch(ledgerJson, hash, userSpecifiedEpoch);
    log.info(`Finished processing file ${hash}`);
    const controllerResponse: ControllerResponse = { responseMessages: [`Received file and processing for hash ${hash}`] };
    return (controllerResponse);
  }
}