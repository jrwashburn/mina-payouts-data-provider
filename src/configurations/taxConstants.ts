export const TAX_EXPORT_CONFIG = {
  CURRENCY_SYMBOL: 'MINA',
  NANOMINA_PER_MINA: 1_000_000_000,
  MAX_EXPORT_DAYS: 365, // 1 year
  ADDRESS_LENGTH: 55,
  MINA_TOKEN_ID: 1,
  MAX_ACCOUNTS_PER_REQUEST: 10,
  DEFAULT_PAYOUT_KEYWORDS: ['Payout'],
  // Base58-encoded hash representing an empty memo in Mina protocol
  // This value appears in the database when a transaction has no memo field
  // included to avoid decoding empty memos
  EMPTY_MEMO_HASH: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
} as const;
