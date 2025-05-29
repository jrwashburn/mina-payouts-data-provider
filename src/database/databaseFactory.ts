import { Pool, PoolConfig } from 'pg';
import configuration from '../configurations/environmentConfiguration.js';
import { Configuration } from '../models/configuration.js';

export function createConfig(user: string, host: string, database: string, password: string, port: number, certificate: string, useSSL: boolean): PoolConfig {
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

export function createBlockQueryPool(config: Configuration = configuration) {
  const poolConfig = createConfig(
    config.blockDbQueryUser,
    config.blockDbQueryHost,
    config.blockDbQueryName,
    config.blockDbQueryPassword,
    config.blockDbQueryPort,
    config.blockDbQueryCertificate,
    config.blockDbQueryConnectionSSL,
  );
  const pool = new Pool(poolConfig);
  pool.on('error', (err: Error) => {
    console.error(`Unexpected error on idle pg pool client for Block Query Pool ${err}`);
  });
  return pool;
}

export function createLedgerQueryPool(config: Configuration = configuration) {
  const poolConfig = createConfig(
    config.ledgerDbQueryUser,
    config.ledgerDbQueryHost,
    config.ledgerDbQueryName,
    config.ledgerDbQueryPassword,
    config.ledgerDbQueryPort,
    config.ledgerDbQueryCertificate,
    config.ledgerDbQueryConnectionSSL,
  );
  const pool = new Pool(poolConfig);
  pool.on('error', (err: Error) => {
    console.error(`Unexpected error on idle pg pool client for Ledger Query Pool ${err}`);
  });
  return pool;
}

export function createStakingLedgerCommandPool(config: Configuration = configuration) {
  const poolConfig = createConfig(
    config.ledgerDbCommandUser,
    config.ledgerDbCommandHost,
    config.ledgerDbCommandName,
    config.ledgerDbCommandPassword,
    config.ledgerDbCommandPort,
    config.ledgerDbCommandCertificate,
    config.ledgerDbCommandConnectionSSL,
  );
  const pool = new Pool(poolConfig);
  pool.on('error', (err: Error) => {
    console.error(`Unexpected error on idle pg pool client for Ledger Command Pool ${err}`);
  });
  return pool;
}
