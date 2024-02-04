# mina-payouts-data-provider

Data provider API for mina-pool-payouts
This application provides an API to that provides the data needed by [mina-pool-payouts](https://github.com/jrwashburn/mina-pool-payout)

The API exposes resources for staking-ledgers, blocks, and consensus (current tip).

Example return values can be seen [here](https://github.com/jrwashburn/mina-payouts-data-provider/blob/deployment/APIExamples.md)

## consensus

[/consensus](https://api.minastakes.com)

The /consensus endpoint returns the current (ish) network tip

## staking-ledgers

A staking-ledger can be retrieved from the /staking-ledgers endpoint by hash or by epoch, and is filtered by block producer key.

[/staking-ledgers/epoch/[epochNumber]?key=[blockProducerKey]](http://api.minastakes.com/staking-ledgers/epoch/0?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L)  
[/staking-ledgers/[stakingLedgerHash]](http://api.minastakes.com/staking-ledger/jwuGkeeB2rxs2Cr679nZMVZpWms6QoEkcgt82Z2jsjB9X1MuJwW?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L)

## blocks

The blocks needed for payout calculation can be retrieved from the /blocks endpoint, filtered by block producer key and minimum and maximum block heights.

[/blocks?key=[blockProducerKey]&minHeight=[minBlockHeight]&maxHeight=[maxBlockHeight]](http://127.0.0.1:8080/blocks?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L&minHeight=1000&maxHeight=10000)

# Deployment

## create container images

Mac version for local testing  
`docker build -f Dockerfile.mac -t mppdp-mac .`  
Linux version for k8s deployment  
`docker build -f Dockerfile.linux -t mppdp-linux .`

## examples

curl -u "mppdpsl:mppdpsl-password" -X POST -H "Content-Type: multipart/form-data" -F "jsonFile=@./jwV7BsK9rBf5uRWqMZmWKVAUcEcd7pDAo9NCFTrvSvXRjHCwypF.json" http://localhost:8080/staking-ledger/jwV7BsK9rBf5uRWqMZmWKVAUcEcd7pDAo9NCFTrvSvXRjHCwypF
