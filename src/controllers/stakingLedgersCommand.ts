import * as sldb from '../database/stakingLedgerDb';
import { ControllerResponse } from '../models/controller';

export async function uploadStakingLedger(file: Buffer, hash: string, nextEpoch: number | null) {
  const isAlreadyImported = await sldb.hashExists(hash);
  // eslint-disable-next-line prefer-const

  if (isAlreadyImported) {
    const controllerResponse: ControllerResponse = { responseMessages: [`File with hash ${hash} was already imported`], responseCode: 409 }
    return controllerResponse;
  }
  else {
    try {
      await loadData(file, hash, nextEpoch);
      console.log(`Finished processing file ${hash}`);
      const controllerResponse: ControllerResponse = { responseMessages: [`Received file and processing for hash ${hash}`] };
      return (controllerResponse);
    } catch (error) {
      const controllerResponse: ControllerResponse = { responseError: 'Error processing file', responseCode: 500 }
      return controllerResponse;
    }
  }
}

function loadData(ledger: Buffer, hash: string, nextepoch: number | null) {
  console.log('loadData called');
  const jsonData = ledger.toString('utf8');
  console.log('finished waiting for chunks');
  console.log('jsonData:', jsonData.slice(0, 100)); // log the first 100 characters
  try {
    const dataArray = JSON.parse(jsonData);
    sldb.insertBatch(dataArray, hash, nextepoch);
  } catch (error) {
    const controllerResponse: ControllerResponse = { responseError: 'Error parsing json or inserting batch', responseCode: 500 }
    return controllerResponse;
  }
}