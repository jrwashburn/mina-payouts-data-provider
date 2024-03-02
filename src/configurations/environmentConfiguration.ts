import { config } from 'dotenv';
import { Configuration } from '../models/configuration';

const configuration: Configuration = loadConfiguration();

function loadConfiguration(): Configuration {
  config();
  validateEnv();
  const configuration: Configuration = {
    port: Number(process.env.API_PORT),

    slotsPerEpoch: Number(process.env.NUM_SLOTS_IN_EPOCH),

    ledgerUploadApiUser: String(process.env.LEDGER_UPLOAD_API_USER),
    ledgerUploadApiPassword: String(process.env.LEDGER_UPLOAD_API_PASSWORD),

    blockDbQueryConnectionSSL: Boolean(process.env.BLOCK_DB_QUERY_REQUIRE_SSL),
    blockDbQueryCertificate: String(process.env.BLOCK_DB_QUERY_CERTIFICATE),
    blockDbQueryUser: String(process.env.BLOCK_DB_QUERY_USER),
    blockDbQueryPassword: String(process.env.BLOCK_DB_QUERY_PASSWORD),
    blockDbQueryHost: String(process.env.BLOCK_DB_QUERY_HOST),
    blockDbQueryPort: Number(process.env.BLOCK_DB_QUERY_PORT),
    blockDbQueryName: String(process.env.BLOCK_DB_QUERY_NAME),
    blockDbVersion: String(process.env.BLOCK_DB_VERSION),

    ledgerDbQueryConnectionSSL: Boolean(process.env.LEDGER_DB_QUERY_REQUIRE_SSL),
    ledgerDbQueryCertificate: String(process.env.LEDGER_DB_QUERY_CERTIFICATE),
    ledgerDbQueryUser: String(process.env.LEDGER_DB_QUERY_USER),
    ledgerDbQueryPassword: String(process.env.LEDGER_DB_QUERY_PASSWORD),
    ledgerDbQueryHost: String(process.env.LEDGER_DB_QUERY_HOST),
    ledgerDbQueryPort: Number(process.env.LEDGER_DB_QUERY_PORT),
    ledgerDbQueryName: String(process.env.LEDGER_DB_QUERY_NAME),

    ledgerDbCommandConnectionSSL: Boolean(process.env.LEDGER_DB_COMMAND_REQUIRE_SSL),
    ledgerDbCommandCertificate: String(process.env.LEDGER_DB_COMMAND_CERTIFICATE),
    ledgerDbCommandUser: String(process.env.LEDGER_DB_COMMAND_USER),
    ledgerDbCommandPassword: String(process.env.LEDGER_DB_COMMAND_PASSWORD),
    ledgerDbCommandHost: String(process.env.LEDGER_DB_COMMAND_HOST),
    ledgerDbCommandPort: Number(process.env.LEDGER_DB_COMMAND_PORT),
    ledgerDbCommandName: String(process.env.LEDGER_DB_COMMAND_NAME),
  }
  return configuration;
}

function validateEnv() {
  const envVars = [
    'API_PORT',

    'NUM_SLOTS_IN_EPOCH',

    'LEDGER_UPLOAD_API_USER',
    'LEDGER_UPLOAD_API_PASSWORD',

    'BLOCK_DB_QUERY_REQUIRE_SSL',
    'BLOCK_DB_QUERY_USER',
    'BLOCK_DB_QUERY_PASSWORD',
    'BLOCK_DB_QUERY_HOST',
    'BLOCK_DB_QUERY_PORT',
    'BLOCK_DB_QUERY_NAME',
    'BLOCK_DB_VERSION',

    'LEDGER_DB_QUERY_REQUIRE_SSL',
    'LEDGER_DB_QUERY_USER',
    'LEDGER_DB_QUERY_PASSWORD',
    'LEDGER_DB_QUERY_HOST',
    'LEDGER_DB_QUERY_PORT',
    'LEDGER_DB_QUERY_NAME',

    'LEDGER_DB_COMMAND_REQUIRE_SSL',
    'LEDGER_DB_COMMAND_USER',
    'LEDGER_DB_COMMAND_PASSWORD',
    'LEDGER_DB_COMMAND_HOST',
    'LEDGER_DB_COMMAND_PORT',
    'LEDGER_DB_COMMAND_NAME',
  ];
  envVars.forEach((variable) => {
    if (!process.env[variable]) {
      const message = `Environment variable ${variable} is missing`;
      console.log(message);
      throw Error(message);
    }
  });
}

export default configuration;