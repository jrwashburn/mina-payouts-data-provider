import * as sldb from '../database/stakingLedgerDb';
import { ControllerResponse } from '../models/controller';

export async function uploadStakingLedger(file: Buffer, hash: string, nextEpoch: number | null) {
  console.log('uploadStakingLedger called for hash:', hash);
  const isAlreadyImported = await sldb.hashExists(hash);
  if (isAlreadyImported) {
    console.log(`File with hash ${hash} was already imported`);
    const controllerResponse: ControllerResponse = { responseMessages: [`File with hash ${hash} was already imported`], responseCode: 409 }
    return controllerResponse;
  }
  else {
    try {
      console.log(`Processing file ${hash}`);
      await loadData(file, hash, nextEpoch);
      console.log(`Finished processing file ${hash}`);
      const controllerResponse: ControllerResponse = { responseMessages: [`Received file and processing for hash ${hash}`] };
      return (controllerResponse);
    } catch (error) {
      console.error('Error processing file:', error);
      const controllerResponse: ControllerResponse = { responseError: 'Error processing file', responseCode: 500 }
      return controllerResponse;
    }
  }
}

async function loadData(ledger: Buffer, hash: string, nextepoch: number | null) {
  console.log('loadData called');
  try {
    const jsonData = ledger.toString('utf8');
    console.log('jsonData:', jsonData.slice(0, 100)); // log the first 100 characters
    const dataArray = JSON.parse(jsonData);
    await sldb.insertBatch(dataArray, hash, nextepoch);
  } catch (error) {
    console.error('Error parsing json or inserting batch:', error);
    const controllerResponse: ControllerResponse = { responseError: 'Error parsing json or inserting batch', responseCode: 500 }
    return controllerResponse;
  }
}