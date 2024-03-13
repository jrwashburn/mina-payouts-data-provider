import * as sldb from '../database/stakingLedgerDb';
import * as db from '../database/blockArchiveDb';
import { ControllerResponse } from '../models/controller';
import { LedgerEntry } from '../models/stakes';
import { Logger } from 'pino';

export async function uploadStakingLedger(log: Logger, ledgerJson: LedgerEntry[], hash: string, userSpecifiedEpoch: number | null) {
  log.info('uploadStakingLedger called for hash:', hash);
  const [isAlreadyImported, hashEpoch] = await sldb.hashExists(hash, userSpecifiedEpoch);
  if (isAlreadyImported) {
    if (hashEpoch === null) {
      const epochToUpdate = await db.getEpoch(hash, userSpecifiedEpoch);
      if (epochToUpdate > 0) {
        await sldb.updateEpoch(hash, epochToUpdate);
      }
    }
    log.info(`File with hash ${hash} for user specified epoch {userSpecifiedEpoch} was already imported`);
    const controllerResponse: ControllerResponse = { responseMessages: [`File with hash ${hash} was already imported`], responseCode: 409 }
    return controllerResponse;
  }
  else {
    log.info(`Processing file ${hash}`);
    await sldb.insertBatch(ledgerJson, hash, userSpecifiedEpoch);
    log.info(`Finished processing file ${hash}`);
    const controllerResponse: ControllerResponse = { responseMessages: [`Received file and processing for hash ${hash}`] };
    return (controllerResponse);
  }
}