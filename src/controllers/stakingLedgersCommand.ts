import * as sldb from '../database/stakingLedgerDb';
import { HttpError } from '../models/routes';

export async function uploadStakingLedger(file: Buffer, hash: string, nextEpoch: number | null) {

  const isAlreadyImported = await sldb.hashExists(hash);
  // eslint-disable-next-line prefer-const
  let messages: string[] = [];

  if (isAlreadyImported) {
    throw new HttpError(`File with hash ${hash} was already imported`, 409);
  }
  else {
    try {
      await loadData(file, hash, nextEpoch);
      console.log(`Finished processing file ${hash}`);
      messages.push(`Received file and processing for hash ${hash}`);
      return (messages);
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
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
    console.error('Error parsing JSON:', error);
    throw error;
  }
}