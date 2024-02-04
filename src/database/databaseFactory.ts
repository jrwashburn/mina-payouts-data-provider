import { Pool } from 'pg';
import configuration from '../configurations/environmentConfiguration';

export function createPool(useSSL : boolean){
  if(useSSL){

    return new Pool({
      user: configuration.dbUser,
      host: configuration.dbHost,
      database: configuration.dbName,
      password: configuration.dbPassword,
      port: configuration.dbPort,
      ssl: {
        ca: configuration.dbCertificate,
      },
    });
  }

  return new Pool({
    user: configuration.dbUser,
    host: configuration.dbHost,
    database: configuration.dbName,
    password: configuration.dbPassword,
    port: configuration.dbPort,
  });
}

export function createLedgerPool(useSSL : boolean){
  if(useSSL){
    return new Pool({
      user: configuration.slDbUser,
      host: configuration.slDbHost,
      database: configuration.slDbName,
      password: configuration.slDbPassword,
      port: configuration.slDbPort,
      ssl: {
        ca: configuration.slDbCertificate,
      },
    });
  }

  return new Pool({
    user: configuration.slDbUser,
    host: configuration.slDbHost,
    database: configuration.slDbName,
    password: configuration.slDbPassword,
    port: configuration.slDbPort,
  });
}