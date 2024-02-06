# mina-payouts-data-provider

Data provider API for mina-pool-payouts
This application provides an API to that provides the data needed by [mina-pool-payouts](https://github.com/jrwashburn/mina-pool-payout)

The API exposes resources for staking-ledgers, blocks, and consensus (current tip).

Example return values can be seen [here](https://github.com/jrwashburn/mina-payouts-data-provider/blob/deployment/APIExamples.md)

The application assumes the availability of a mina archive database as well as a mina stakes database that is maintained separately. The stakes database can be created using the script in /database-setup/stakesDB.sql. The staking ledger for each epoch must be extracted from a mina node and uploaded to the staking-ledgers endpoint each epoch (or in advance.)

## consensus

[/consensus](https://api.minastakes.com/consensus)

The /consensus endpoint returns the current (ish) network tip

## staking-ledgers

A staking-ledger can be retrieved from the /staking-ledgers endpoint by hash or by epoch, and is filtered by block producer key.

[/staking-ledgers/epoch/[epochNumber]?key=[blockProducerKey]](http://api.minastakes.com/staking-ledgers/epoch/0?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L)  
[/staking-ledgers/[stakingLedgerHash]](http://api.minastakes.com/staking-ledgers/jwuGkeeB2rxs2Cr679nZMVZpWms6QoEkcgt82Z2jsjB9X1MuJwW?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L)

A staking-ledger can also be uploaded to the /staking-ledgers endpoign by posting the ledger to it's hash.

POST /staking-ledgers/[stakingLedgerHash] -- see example below in the maintenance section.

## blocks

The blocks needed for payout calculation can be retrieved from the /blocks endpoint, filtered by block producer key and minimum and maximum block heights.

[/blocks?key=[blockProducerKey]&minHeight=[minBlockHeight]&maxHeight=[maxBlockHeight]](http://api.minastakes.com/blocks?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L&minHeight=1000&maxHeight=10000)

# Deployment

## create container images

Mac version for local testing  
`docker build -f ./deploy/Dockerfile.mac -t [registry]mppdp-mac:v1.3.0 .`  
Linux version for k8s deployment  
`docker build -f ./deploy/Dockerfile.linux -t [registry]mppdp-linux:v1.3.0 .`  


## tag and upload to container registry

`docker tag [registry]/mppdp:v1.3.0 [cloud registry]/[repo]/mppdp:v1.3.0`  
`docker push [registry]/[repo]/mppdp:v1.3.0`  

## apply k8s deployment

Create secrets for db password and basic auth for ledgers upload.  

### database secrets  
There are three database specifications - read users for the mina archive database and the staking ledgers database, and a separate connection for the user that writes the staking ledgers to the database. It is assumed that each has a client certificate as well; if there is not a client certificate in place, change the *REQUIRE_SSL variables from "true" to "false" for each database connection. (e.g. LEDGER_DB_QUERY_REQUIRE_SSL="false")  

The environment variable validation will not check for the presence of the certificate; the application will crash if ssl is set to true but no certificate is provided for any connection.  

`kubectl create secret generic block-db-query-password --from-literal BLOCK_DB_QUERY_PASSWORD=[Password]`   
`kubectl create secret generic block-db-query-certificate --from-literal BLOCK_DB_QUERY_CERTIFICATE=[CERTIFICATE]`  
`kubectl create secret generic ledger-db-query-password --from-literal LEDGER_DB_QUERY_PASSWORD=[Password]`    
`kubectl create secret generic ledger-db-query-certificate --from-literal LEDGER_DB_QUERY_CERTIFICATE=[CERTIFICATE]`  
`kubectl create secret generic ledger-db-command-password --from-literal LEDGER_DB_COMMAND_PASSWORD=[Password]`  
`kubectl create secret generic ledger-db-command-certificate --from-literal LEDGER_DB_COMMAND_CERTIFICATE=[CERTIFICATE]`  

### upload user basic auth secret
The staking-ledgers POST endpoint uses basic authentication to authenticate the user posting the ledger.  
`kubectl create secret generic ledger-upload-password --from-literal LEDGER_UPLOAD_PASSWORD=[Password]`  

### deploy to k8s cluster  
Apply deployment  
`kubectl apply -f ./deploy/deployment.yaml`  

# Maintenance

Staking ledgers must be kept up to date each epoch. The /staking-ledgers endpoint also accepts a form post to get a staking ledger file and apply it. This is on an endpoing that has basic authentication.

The ledgers can be posted via script - for example:

curl -u "mppdpsl:mppdpsl-password" -X POST -H "Content-Type: multipart/form-data" -F "jsonFile=@./jwV7BsK9rBf5uRWqMZmWKVAUcEcd7pDAo9NCFTrvSvXRjHCwypF.json" http://api.minastakes.com/staking-ledgers/jwV7BsK9rBf5uRWqMZmWKVAUcEcd7pDAo9NCFTrvSvXRjHCwypF
