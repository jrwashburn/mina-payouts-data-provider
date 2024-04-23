export interface Configuration {
  port: number,

  slotsPerEpoch: number,

  ledgerUploadApiUser: string,
  ledgerUploadApiPassword: string,

  blockDbQueryConnectionSSL: boolean,
  blockDbQueryCertificate: string,
  blockDbQueryUser: string,
  blockDbQueryPassword: string,
  blockDbQueryHost: string,
  blockDbQueryPort: number,
  blockDbQueryName: string,
  blockDbVersion: string,

  ledgerDbQueryConnectionSSL: boolean,
  ledgerDbQueryCertificate: string,
  ledgerDbQueryUser: string,
  ledgerDbQueryPassword: string,
  ledgerDbQueryHost: string,
  ledgerDbQueryPort: number,
  ledgerDbQueryName: string,

  ledgerDbCommandConnectionSSL: boolean,
  ledgerDbCommandCertificate: string,
  ledgerDbCommandUser: string,
  ledgerDbCommandPassword: string,
  ledgerDbCommandHost: string,
  ledgerDbCommandPort: number,
  ledgerDbCommandName: string,

  checkNodes: string[], // list of mina daemon enpoints exposing graphql interface in the form of http://<ip>:<port>,http://<ip>:<port>,...

  logLevel: string, // log level for the application

  trustArchiveDatabaseHeight: boolean, // whether to trust the archive db height or not at startup 
  archiveDbCheckInterval: number, // schedule to check archive vs. node height every X minutes 
  archiveDbRecencyThreshold: number, // threshold for archive db recency in block height 
}