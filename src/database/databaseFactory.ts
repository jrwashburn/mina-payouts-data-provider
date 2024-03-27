import { Pool, ClientConfig } from 'pg';
import configuration from '../configurations/environmentConfiguration';

function createConfig(user: string, host: string, database: string, password: string, port: number, certificate: string, useSSL: boolean): ClientConfig {
  return useSSL ? {
    user,
    host,
    database,
    password,
    port,
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
  return new Pool(config);
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
  return new Pool(config);
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
  return new Pool(config);
}