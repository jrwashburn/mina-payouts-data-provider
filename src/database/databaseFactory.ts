import { Pool, PoolConfig } from 'pg';
import configuration from '../configurations/environmentConfiguration.js';

function createConfig(user: string, host: string, database: string, password: string, port: number, certificate: string, useSSL: boolean): PoolConfig {
  return useSSL ? {
    user,
    host,
    database,
    password,
    port,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10000,
    ssl: {
      ca: certificate,
      rejectUnauthorized: false,
    },
  } : {
    user,
    host,
    database,
    password,
    port,
  };
}

export function createBlockQueryPool() {
  const config = createConfig(
    configuration.blockDbQueryUser,
    configuration.blockDbQueryHost,
    configuration.blockDbQueryName,
    configuration.blockDbQueryPassword,
    configuration.blockDbQueryPort,
    configuration.blockDbQueryCertificate,
    configuration.blockDbQueryConnectionSSL,
  );
  const pool = new Pool(config);
  pool.on('error', (err) => {
    console.error(`Unexpected error on idle pg pool client for Block Query Pool ${err}`);
  });
  return pool;
}

export function createLedgerQueryPool() {
  const config = createConfig(
    configuration.ledgerDbQueryUser,
    configuration.ledgerDbQueryHost,
    configuration.ledgerDbQueryName,
    configuration.ledgerDbQueryPassword,
    configuration.ledgerDbQueryPort,
    configuration.ledgerDbQueryCertificate,
    configuration.ledgerDbQueryConnectionSSL,
  );
  const pool = new Pool(config);
  pool.on('error', (err) => {
    console.error(`Unexpected error on idle pg pool client for Ledger Query Pool ${err}`);
  });
  return pool;
}

export function createStakingLedgerCommandPool() {
  const config = createConfig(
    configuration.ledgerDbCommandUser,
    configuration.ledgerDbCommandHost,
    configuration.ledgerDbCommandName,
    configuration.ledgerDbCommandPassword,
    configuration.ledgerDbCommandPort,
    configuration.ledgerDbCommandCertificate,
    configuration.ledgerDbCommandConnectionSSL,
  );
  const pool = new Pool(config);
  pool.on('error', (err) => {
    console.error(`Unexpected error on idle pg pool client for Ledger Command Pool ${err}`);
  });
  return pool;
}