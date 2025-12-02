/**
 * Mock Database Module for Testing
 *
 * This module provides mock implementations of database functions
 * for use in integration tests. Instead of mocking with jest.spyOn,
 * we provide fixture data that can be imported by tests.
 *
 * The actual database mocking happens at the application level where
 * the database modules are initialized.
 */

/**
 * Fixtures and mock data for testing
 */
export const fixtures = {
  consensus: {
    epoch: 36,
    blockHeight: '495414',
    globalslotsincegenesis: '824027',
    globalslot: 824027,
    slot: 2507,
    stateHash: '3NKTSb6Z1Ee5SFcHjsy776egZTQ2sDyVbr9RrGEmajZw1mveVDs5',
    parentHash: '3NLFuD5qTBEEZ34UFoJSCTNU6YDgFCXEU2n1krExXUdC5SEYCcEF',
    ledgerHash: 'jxCiaABvp2uskGRPpMbm2HGujN5MiE2kPMnMR8icipcMcNqNRxo',
    statehash: '3NKTSb6Z1Ee5SFcHjsy776egZTQ2sDyVbr9RrGEmajZw1mveVDs5',
    blockheight: 495414,
    datetime: '2025-11-27T17:21:00.000Z',
    messages: [],
  },
  blocks: [
    {
      blockheight: 1013,
      statehash: '3NKz3LCxcvwTt2T95vzkBoLj26KRJMhzLeLrC9sM7tFwGTN9XDRM',
      stakingledgerhash: 'jx7buQVWFLsXTtzRgSxbYcT8EYLS8KCZbLrfDcJxMtyy4thw2Ee',
      blockdatetime: 1616420520000,
      slot: 2674,
      globalslotsincegenesis: 2674,
      creatorpublickey: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      winnerpublickey: 'B62qnPhXw9uumnKzcC42zigqB8KS4LXRUzSNKR5EfFc3gs5ZVHmYgTu',
      receiverpublickey: 'B62qoigHEtJCoZ5ekbGHWyr9hYfc6fkZ2A41h9vvVZuvty9amzEz3yB',
      coinbase: 720000000000,
      feetransfertoreceiver: 0,
      feetransferfromcoinbase: 0,
      usercommandtransactionfees: 0,
    },
    {
      blockheight: 1025,
      statehash: '3NLW8XnqRVZqZYUX4VbC1ZcABqQELVVfaYk1Yw8Mu1cBQHqx5aMz',
      stakingledgerhash: 'jxGm5RXVfzfqQ2rP5hs9Q5VqXRr5q9fP3GyEZG4tP8VqXmVKVz4',
      blockdatetime: 1616421120000,
      slot: 2685,
      globalslotsincegenesis: 2685,
      creatorpublickey: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      winnerpublickey: 'B62qnPhXw9uumnKzcC42zigqB8KS4LXRUzSNKR5EfFc3gs5ZVHmYgTu',
      receiverpublickey: 'B62qoigHEtJCoZ5ekbGHWyr9hYfc6fkZ2A41h9vvVZuvty9amzEz3yB',
      coinbase: 720000000000,
      feetransfertoreceiver: 100000000,
      feetransferfromcoinbase: 50000000,
      usercommandtransactionfees: 150000000,
    },
    {
      blockheight: 1875,
      statehash: '3NK2X5V8sXGX7DzF7UfZfVZqBjVcJQe3ZJzHq8TpkZ4pVfV8XqMN',
      stakingledgerhash: 'jx9k3L5vQwRmN2sT4vZp8X6Yb1Cc9DdE3FfGhIjKlMn5OpQrSt',
      blockdatetime: 1616424720000,
      slot: 2847,
      globalslotsincegenesis: 2847,
      creatorpublickey: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      winnerpublickey: 'B62qnPhXw9uumnKzcC42zigqB8KS4LXRUzSNKR5EfFc3gs5ZVHmYgTu',
      receiverpublickey: 'B62qoigHEtJCoZ5ekbGHWyr9hYfc6fkZ2A41h9vvVZuvty9amzEz3yB',
      coinbase: 720000000000,
      feetransfertoreceiver: 0,
      feetransferfromcoinbase: 0,
      usercommandtransactionfees: 0,
    },
  ],
  epoch: {
    minBlockHeight: 5076,
    maxBlockHeight: 10128,
  },
  stakingLedger: {
    ledgerEntries: [
      {
        pk: 'B62qkWU8KTP44FSD43HdJcs8PGkTqbG9N7PF87idheAaHy8jL2JAXnj',
        balance: 495878.02184605,
        delegate: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      },
      {
        pk: 'B62qmNbNedwwDB3bLUzgeN6gAYXmnY4U9WBS6Ze92HghtU7x3v7a2sS',
        balance: 277339.092797069,
        delegate: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      },
      {
        pk: 'B62qoigHEtJCoZ5ekbGHWyr9hYfc6fkZ2A41h9vvVZuvty9amzEz3yB',
        balance: 109006.526205449,
        delegate: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      },
      {
        pk: 'B62qnr6wsfZxsxFk9xEZvsgKTLTmFmd9czVieRpEv4YnQmHUaVMMDTa',
        balance: 64934.280982264,
        delegate: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
        timing: {
          initial_minimum_balance: 44000,
          cliff_time: 86400,
          cliff_amount: 44000,
          vesting_period: 1,
          vesting_increment: 0,
        },
      },
      {
        pk: 'B62qpjEJn5boKL7nqM7G49V4zY3jeE2M3czqG8FXJEbAADstvfF9T7Q',
        balance: 21505.000756681,
        delegate: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
        timing: {
          initial_minimum_balance: 66000,
          cliff_time: 172800,
          cliff_amount: 16500,
          vesting_period: 1,
          vesting_increment: 0.095486111,
        },
      },
    ],
    totalStakingBalance: 968662.921691513,
  },
};
