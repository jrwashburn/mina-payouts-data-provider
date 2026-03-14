# mina-payouts-data-provider

Data provider API for mina-pool-payouts
This application provides an API to that provides the data needed by [mina-pool-payouts](https://github.com/jrwashburn/mina-pool-payout)

The API exposes resources for staking-ledgers, blocks, and consensus (current tip).

Example return values can be seen [here](https://github.com/jrwashburn/mina-payouts-data-provider/blob/main/APIExamples.md)

The application assumes the availability of a mina archive database as well as a mina stakes database that is maintained separately. The stakes database can be created using the script in /deploy/db-setup/stakesDB.sql. The staking ledger for each epoch must be extracted from a mina node and uploaded to the staking-ledgers endpoint each epoch (or in advance.)

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

## tax-export

WARNING: this feature is new and has not been tested by uploading data to the various providers.
WARNING: this is a new feature that has not been thoroughly tested across a large set of keys and scenarios.
WARNING: use at your own risk and please verify the results. PRs welcome.

The /tax-export endpoint provides transaction history for tax reporting purposes. It exports all transaction types (block production, SNARK fees, payments, zkApp transactions, delegations, and fee transfers) in formats compatible with popular cryptocurrency tax software.

### Supported Formats
- **koinly** - CSV format for Koinly tax software
- **ledgible** - CSV format for Ledgible tax software
- **accointing** - XLSX format for Accointing (now Crypto.com Tax) software
- **json** - JSON format for custom processing

### GET /tax-export (Simple Interface)

For a single account with basic configuration:

```
GET /tax-export?key=[publicKey]&startDate=YYYYMMDD&endDate=YYYYMMDD&format=[format]
```

**Required Parameters:**
- `key` - Mina public key (55 characters)
- `startDate` - Start date in YYYYMMDD format
- `endDate` - End date in YYYYMMDD format (max 365 days from start)

**Optional Parameters:**
- `format` - Output format: `koinly`, `ledgible`, `accointing`, or `json` (default: json)
- `payoutKeyword` - Keyword to identify pool payouts in transaction memos (default: "Payout")
- `payoutAccount` - Public key of the payout source account for pool payout detection

**Example:**
```
/tax-export?key=B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L&startDate=20240101&endDate=20241231&format=koinly
```

### POST /tax-export (Advanced Interface)

For multiple accounts or custom payout detection:

```
POST /tax-export
Content-Type: application/json

{
  "accounts": ["publicKey1", "publicKey2", ...],
  "startDate": "YYYYMMDD",
  "endDate": "YYYYMMDD",
  "format": "koinly",
  "payoutConfig": {
    "memoKeywords": ["Payout", "Reward"],
    "payoutAccounts": ["B62q..."]
  }
}
```

**Required Fields:**
- `accounts` - Array of Mina public keys (1-10 accounts)
- `startDate` - Start date in YYYYMMDD format
- `endDate` - End date in YYYYMMDD format (max 365 days)

**Optional Fields:**
- `format` - Output format (default: json)
- `payoutConfig` - Payout detection configuration
  - `memoKeywords` - Array of keywords to identify pool payouts in memos
  - `payoutAccounts` - Array of public keys for payout source accounts

### Transaction Types Included

The export includes all transaction types affecting the account balance or requiring tax reporting:

- **Block Production** - Coinbase rewards from producing blocks
- **SNARK Fees** - Compensation for SNARK work
- **Payments** - Sent and received payments (with memo support)
- **Fee Transfers** - Fee transfers received
- **zkApp Transactions** - Smart contract interactions with balance changes
- **Delegations** - Stake delegation transactions (fee only)
- **Account Creation Fees** - Fees paid when receiving payment that creates a new account

### Pool Payout Detection

Pool payout detection **only applies to inbound (received) transactions**. Outbound (sent) transactions are never classified as pool payouts.

Received transactions can be automatically classified as pool payouts based on:
1. **Memo keywords** (e.g., "Payout") - useful for pools that include keywords in payment memos
2. **Source account** (e.g., pool's payout wallet address) - useful for identifying all payments from a specific pool

This helps distinguish staking pool payouts from other income for proper tax categorization.

**Transaction types that support pool payout detection:**
- Payments received (regular payments)
- Fee transfers received
- zkApp transactions with positive balance changes

**Transaction types that never have pool payout flag:**
- Payments sent (outbound)
- Block production rewards (coinbase)
- SNARK work fees
- Delegations
- Account creation fees

### Limitations

- Maximum 10 accounts per request
- Maximum 365-day date range per request
- Dates must be in strict YYYYMMDD format

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

## Staking Ledgers  

### Database  

The staking ledgers are stored in a database instead of using json files. The databse must be created when the projec is deployed and is assumed to be an external dependency similar to the archive databsae. The scripts to create the database are in /deploy/db-setup/StakesDB.sql. The script simple creates the single empty table used by this process. The ledgers can be stored by uploading them to the API.  

### Uploading Staking Ledgers  
Staking ledgers must be kept up to date each epoch. The /staking-ledgers endpoint also accepts a form post to get a staking ledger file and apply it. This is on an endpoing that has basic authentication.  

The ledgers can be posted via script - for example:  

curl -u "mppdpsl:mppdpsl-password" -X POST -H "Content-Type: multipart/form-data" -F "jsonFile=@./jwV7BsK9rBf5uRWqMZmWKVAUcEcd7pDAo9NCFTrvSvXRjHCwypF.json" http://api.minastakes.com/staking-ledgers/jwV7BsK9rBf5uRWqMZmWKVAUcEcd7pDAo9NCFTrvSvXRjHCwypF  

When a ledger is being posted for an epoch that has not started yet, the api cannot determine the epoch; so additional parameters are supported to supply a user-specified epoch number with a query string parameter. For example: http://api.minastakes.com/staking-ledgers/[hash]]?userSpecifiedEpoch=[n]  
