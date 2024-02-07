import { Pool } from 'pg';
import configuration from '../configurations/environmentConfiguration';

export function createBlockQueryPool(useSSL: boolean) {
  if (useSSL) {

    return new Pool({
      user: configuration.blockDbQueryUser,
      host: configuration.blockDbQueryHost,
      database: configuration.blockDbQueryName,
      password: configuration.blockDbQueryPassword,
      port: configuration.blockDbQueryPort,
      ssl: {
        ca: configuration.blockDbQueryCertificate,
        rejectUnauthorized: false,
      },
    });
  }

  return new Pool({
    user: configuration.blockDbQueryUser,
    host: configuration.blockDbQueryHost,
    database: configuration.blockDbQueryName,
    password: configuration.blockDbQueryPassword,
    port: configuration.blockDbQueryPort,
  });
}

export function createLedgerQueryPool(useSSL: boolean) {
  if (useSSL) {
    return new Pool({
      user: configuration.ledgerDbQueryUser,
      host: configuration.ledgerDbQueryHost,
      database: configuration.ledgerDbQueryName,
      password: configuration.ledgerDbQueryPassword,
      port: configuration.ledgerDbQueryPort,
      ssl: {
        ca: configuration.ledgerDbQueryCertificate,
        rejectUnauthorized: false,
      },
    });
  }

  return new Pool({
    user: configuration.ledgerDbQueryUser,
    host: configuration.ledgerDbQueryHost,
    database: configuration.ledgerDbQueryName,
    password: configuration.ledgerDbQueryPassword,
    port: configuration.ledgerDbQueryPort,
  });
}

export function createStakingLedgerCommandPool(useSSL: boolean) {
  if (useSSL) {
    return new Pool({
      user: configuration.ledgerDbCommandUser,
      host: configuration.ledgerDbCommandHost,
      database: configuration.ledgerDbCommandName,
      password: configuration.ledgerDbCommandPassword,
      port: configuration.ledgerDbCommandPort,
      ssl: {
        ca: configuration.ledgerDbCommandCertificate,
        rejectUnauthorized: false,
      },
    });
  }

  return new Pool({
    user: configuration.ledgerDbCommandUser,
    host: configuration.ledgerDbCommandHost,
    database: configuration.ledgerDbCommandName,
    password: configuration.ledgerDbCommandPassword,
    port: configuration.ledgerDbCommandPort,
  });
}