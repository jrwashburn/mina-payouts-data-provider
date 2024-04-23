import { config } from 'dotenv';
import { Configuration } from '../models/configuration';

const configuration: Configuration = loadConfiguration();

function loadConfiguration(): Configuration {
  config();
  ensureEnvVarsPresent();
  const configuration: Configuration = {
    port: Number(process.env.API_PORT),

    slotsPerEpoch: Number(process.env.NUM_SLOTS_IN_EPOCH),

    ledgerUploadApiUser: String(process.env.LEDGER_UPLOAD_API_USER),
    ledgerUploadApiPassword: String(process.env.LEDGER_UPLOAD_API_PASSWORD),

    blockDbQueryConnectionSSL: process.env.BLOCK_DB_QUERY_REQUIRE_SSL === 'true',
    blockDbQueryCertificate: String(process.env.BLOCK_DB_QUERY_CERTIFICATE),
    blockDbQueryUser: String(process.env.BLOCK_DB_QUERY_USER),
    blockDbQueryPassword: String(process.env.BLOCK_DB_QUERY_PASSWORD),
    blockDbQueryHost: String(process.env.BLOCK_DB_QUERY_HOST),
    blockDbQueryPort: Number(process.env.BLOCK_DB_QUERY_PORT),
    blockDbQueryName: String(process.env.BLOCK_DB_QUERY_NAME),
    blockDbVersion: String(process.env.BLOCK_DB_VERSION),

    ledgerDbQueryConnectionSSL: process.env.LEDGER_DB_QUERY_REQUIRE_SSL === 'true',
    ledgerDbQueryCertificate: String(process.env.LEDGER_DB_QUERY_CERTIFICATE),
    ledgerDbQueryUser: String(process.env.LEDGER_DB_QUERY_USER),
    ledgerDbQueryPassword: String(process.env.LEDGER_DB_QUERY_PASSWORD),
    ledgerDbQueryHost: String(process.env.LEDGER_DB_QUERY_HOST),
    ledgerDbQueryPort: Number(process.env.LEDGER_DB_QUERY_PORT),
    ledgerDbQueryName: String(process.env.LEDGER_DB_QUERY_NAME),

    ledgerDbCommandConnectionSSL: process.env.LEDGER_DB_COMMAND_REQUIRE_SSL === 'true',
    ledgerDbCommandCertificate: String(process.env.LEDGER_DB_COMMAND_CERTIFICATE),
    ledgerDbCommandUser: String(process.env.LEDGER_DB_COMMAND_USER),
    ledgerDbCommandPassword: String(process.env.LEDGER_DB_COMMAND_PASSWORD),
    ledgerDbCommandHost: String(process.env.LEDGER_DB_COMMAND_HOST),
    ledgerDbCommandPort: Number(process.env.LEDGER_DB_COMMAND_PORT),
    ledgerDbCommandName: String(process.env.LEDGER_DB_COMMAND_NAME),

    checkNodes: (process.env.CHECK_NODES?.split(',') || []) as string[],

    logLevel: String(process.env.LOG_LEVEL) || 'info',

    //assume archive database block height is okay unless detected otherwise by the archiveDbRecencyChecker
    trustArchiveDatabaseHeight: process.env.TRUST_ARCHIVE_DATABASE_HEIGHT?.toLowerCase() === 'false' ? false : true,
    // schedule to check archive vs. node height every X minutes (default 2)
    archiveDbCheckInterval: !isNaN(Number(process.env.ARCHIVE_DB_CHECK_INTERVAL)) ? Number(process.env.ARCHIVE_DB_CHECK_INTERVAL) : 2,
    // threshold for archive db recency in block height (default 5)
    archiveDbRecencyThreshold: !isNaN(Number(process.env.ARCHIVE_DB_RECENCY_THRESHOLD)) ? Number(process.env.ARCHIVE_DB_RECENCY_THRESHOLD) : 5,
  }
  validateEnvVars(configuration);
  return configuration;
}

function ensureEnvVarsPresent() {
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

    'CHECK_NODES',

    'LOG_LEVEL',
  ];
  envVars.forEach((variable) => {
    if (!process.env[variable]) {
      const message = `Environment variable ${variable} is missing`;
      console.log(message);
      throw Error(message);
    }
  });
}

function validateEnvVars(configuration: Configuration): void {
  if (configuration.blockDbVersion != 'v1' && configuration.blockDbVersion != 'v2') {
    const message = `Environment variable BLOCK_DB_VERSION is expected to be "v1" or "v2"`;
    console.log(message);
    throw Error(message);
  }

  if (
    (isNaN(configuration.port) || configuration.port < 0 || configuration.port > 65535) ||
    (isNaN(configuration.blockDbQueryPort) || configuration.blockDbQueryPort < 0 || configuration.blockDbQueryPort > 65535) ||
    (isNaN(configuration.ledgerDbQueryPort) || configuration.ledgerDbQueryPort < 0 || configuration.ledgerDbQueryPort > 65535) ||
    (isNaN(configuration.ledgerDbCommandPort) || configuration.ledgerDbCommandPort < 0 || configuration.ledgerDbCommandPort > 65535)) {
    const message = `Ports must be a number between 1 and 65535`;
    console.log(message);
    throw Error(message);
  }

  if (isNaN(configuration.slotsPerEpoch) || configuration.slotsPerEpoch != 7140) {
    const message = `Environment variable NUM_SLOTS_IN_EPOCH is expected to be 7140`;
    console.log(message);
    throw Error(message);
  }

  const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/\S*)?$/;
  const nodes = configuration.checkNodes.join(',');
  nodes.split(',').forEach((node) => {
    if (!urlPattern.test(node.trim())) {
      const message = `CHECK_NODES environment variable must contain validly formed http[s]://fqdn:port[/path] but got "${node}"`;
      console.log(message);
      throw Error(message);
    }
  });
}
export default configuration;