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
    globalslot: 2507,
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
    minBlockHeight: '5076',
    maxBlockHeight: '10128',
  },
  stakingLedger: {
    stakes: [
      {
        publicKey: 'B62qiy8Z8XfQ9FrD6hGvEQrTHfRNRLX6nv3TDxVmLPfnPCRjMvZyAVG',
        stakingBalance: '495878.524316421',
        untimedAfterSlot: 0,
        shareClass: 'Common',
      },
      {
        publicKey: 'B62qrKTFzHMkCFsAUn3TKX6u3H1S6wyVnGFZmgx9J9EcqMMZA8j4e8Z',
        stakingBalance: '234567.123456789',
        untimedAfterSlot: 86400,
        shareClass: 'Common',
      },
      {
        publicKey: 'B62qpXcfjPMjt6jXHVRb1nF1RvYr6VEk5fVzs9YzfVZxPn7LgZWoTxL',
        stakingBalance: '123456.789012345',
        untimedAfterSlot: 691200,
        shareClass: 'Common',
      },
    ],
    totalStakingBalance: '1014850.336964028',
  },
};
