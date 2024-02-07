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
}