## consensus

[/consensus](https://api.minastakes.com)

The /consensus endpoint returns the current (ish) network tip

```json
{
  "epoch": 70,
  "blockHeight": "327536",
  "globalSlotSinceGenesis": "506248",
  "slot": 6448,
  "stateHash": "3NL2ZHr2js7LLJM9q68b2FeEPgAYdWe4J3NoBuoNvtSr5cFm97EF",
  "parentHash": "3NLhLLvcDybQxmRmsuqc8jG4HPcdrFwnPNjphjMfRARmxi2KWApV",
  "ledgerHash": "jwpqdeRZXWMGsK9YRKVU5xATgutZctStQ8eBuGAVgypRBHH5V8v",
  "datetime": "2024-02-04T16:24:00.000Z",
  "messages": []
}
```

## staking-ledgers

A staking-ledger can be retrieved from the /staking-ledgers endpoint by hash or by epoch, and is filtered by block producer key.

[/staking-ledgers/epoch/[epochNumber]?key=[blockProducerKey]](http://api.minastakes.com/staking-ledgers/epoch/0?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L)  
[/staking-ledgers/[stakingLedgerHash]](http://api.minastakes.com/staking-ledger/jwuGkeeB2rxs2Cr679nZMVZpWms6QoEkcgt82Z2jsjB9X1MuJwW?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L)

```json
{
  "stakes": [
    {
      "publicKey": "B62qpjEJn5boKL7nqM7G49V4zY3jeE2M3czqG8FXJEbAADstvfF9T7Q",
      "stakingBalance": 66000,
      "untimedAfterSlot": 691200.000603229,
      "shareClass": { "shareClass": "Common", "shareOwner": "" }
    },
    {
      "publicKey": "B62qnr6wsfZxsxFk9xEZvsgKTLTmFmd9czVieRpEv4YnQmHUaVMMDTa",
      "stakingBalance": 44000,
      "untimedAfterSlot": 86400,
      "shareClass": { "shareClass": "Common", "shareOwner": "" }
    },
    {
      "publicKey": "B62qqLBQFF3oRGthJGnbZB9PEF8pvoxGcfBNUVtgXtH88VZE9KBoGKb",
      "stakingBalance": 502777.775,
      "untimedAfterSlot": 691200,
      "shareClass": { "shareClass": "NPS", "shareOwner": "MF" }
    },
    {
      "publicKey": "B62qjpzAChiHvZZqchLWcv9SAc52p23oCerTPPrZzFqksLTgwSBo8Ax",
      "stakingBalance": 900973.465,
      "untimedAfterSlot": 691200,
      "shareClass": { "shareClass": "NPS", "shareOwner": "MF" }
    },
    {
      "publicKey": "B62qnPhXw9uumnKzcC42zigqB8KS4LXRUzSNKR5EfFc3gs5ZVHmYgTu",
      "stakingBalance": 607904.75,
      "untimedAfterSlot": 691200,
      "shareClass": { "shareClass": "NPS", "shareOwner": "O1" }
    },
    {
      "publicKey": "B62qqYKsXdpf96KhFvJpeHwDCNE5iUZqcPtxca3WxL5HZQ2HyTj2g6K",
      "stakingBalance": 1693980.63775165,
      "untimedAfterSlot": 345600,
      "shareClass": { "shareClass": "NPS", "shareOwner": "O1" }
    },
    {
      "publicKey": "B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L",
      "stakingBalance": 0,
      "untimedAfterSlot": 0,
      "shareClass": { "shareClass": "Common", "shareOwner": "" }
    }
  ],
  "totalStakingBalance": 3815636.6277516503,
  "messages": []
}
```

## blocks

The blocks needed for payout calculation can be retrieved from the /blocks endpoint, filtered by block producer key and minimum and maximum block heights.

[/blocks?key=[blockProducerKey]&minHeight=[minBlockHeight]&maxHeight=[maxBlockHeight]](http://127.0.0.1:8080/blocks?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L&minHeight=1000&maxHeight=10000)

```json
{
  "blocks": [
    {
      "blockheight": "9971",
      "statehash": "3NKjrgosMJnYpEBeqDDmZJiojEBwKVQhf6cZVycy2Dhwf6yMGVac",
      "stakingledgerhash": "jx7buQVWFLsXTtzRgSxbYcT8EYLS8KCZbLrfDcJxMtyy4thw2Ee",
      "blockdatetime": "1618471260000",
      "slot": "14067",
      "globalslotsincegenesis": "14067",
      "creatorpublickey": "B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L",
      "winnerpublickey": "B62qnr6wsfZxsxFk9xEZvsgKTLTmFmd9czVieRpEv4YnQmHUaVMMDTa",
      "recevierpublickey": "B62qoigHEtJCoZ5ekbGHWyr9hYfc6fkZ2A41h9vvVZuvty9amzEz3yB",
      "coinbase": "720000000000",
      "feetransfertoreceiver": "413000000",
      "feetransferfromcoinbase": "0",
      "usercommandtransactionfees": "413000000"
    },
    {
      "blockheight": "9913",
      "statehash": "3NKaSJDxfDNefVEb3B4euaUSg9vMdaJMTssYZcd7seGcDDCw1TaW",
      "stakingledgerhash": "jx7buQVWFLsXTtzRgSxbYcT8EYLS8KCZbLrfDcJxMtyy4thw2Ee",
      "blockdatetime": "1618457040000",
      "slot": "13988",
      "globalslotsincegenesis": "13988",
      "creatorpublickey": "B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L",
      "winnerpublickey": "B62qjpzAChiHvZZqchLWcv9SAc52p23oCerTPPrZzFqksLTgwSBo8Ax",
      "recevierpublickey": "B62qqyZ86GsrRV96xuiStZhJW5D9fzFZvasE6aAToRH8PP2bU2TsM8V",
      "coinbase": "720000000000",
      "feetransfertoreceiver": "62000000",
      "feetransferfromcoinbase": "0",
      "usercommandtransactionfees": "62000000"
    }
  ],
  "messages": []
}
```
