import * as sldb from '../database/stakingLedgerDb';
import * as db from '../database/blockArchiveDb';
import { ControllerResponse } from '../models/controller';
import { LedgerEntry } from '../models/stakes';

export async function uploadStakingLedger(ledgerJson: LedgerEntry[], hash: string, userSpecifiedEpoch: number | null) {
  console.log('uploadStakingLedger called for hash:', hash);
  const [isAlreadyImported, hashEpoch] = await sldb.hashExists(hash, userSpecifiedEpoch);
  if (isAlreadyImported) {
    if (hashEpoch === null) {
      try {
        const epochToUpdate = await db.getEpoch(hash, userSpecifiedEpoch);
        if (epochToUpdate > 0) {
          await sldb.updateEpoch(hash, epochToUpdate);
        }
      } catch (error) {
        console.error('Error updating epoch:', error);
      }
    }
    console.log(`File with hash ${hash} for user specified epoch {userSpecifiedEpoch} was already imported`);
    const controllerResponse: ControllerResponse = { responseMessages: [`File with hash ${hash} was already imported`], responseCode: 409 }
    return controllerResponse;
  }
  else {
    try {
      console.log(`Processing file ${hash}`);
      await loadData(ledgerJson, hash, userSpecifiedEpoch);
      console.log(`Finished processing file ${hash}`);
      const controllerResponse: ControllerResponse = { responseMessages: [`Received file and processing for hash ${hash}`] };
      return (controllerResponse);
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error('Error processing file');
    }
  }
}

async function loadData(ledger: LedgerEntry[], hash: string, userSpecifiedEpoch: number | null) {
  console.log('loadData called');
  try {
    await sldb.insertBatch(ledger, hash, userSpecifiedEpoch);
  } catch (error) {
    console.error('Error parsing json or inserting batch:', error);
    throw new Error('Error parsing json or inserting batch');
  }
}