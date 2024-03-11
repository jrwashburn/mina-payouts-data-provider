import configuration from '../configurations/environmentConfiguration';

//Berkeley changes for user_commands and internal_commands:
// type is now command_type
// fee is now a string and needs to be cast to integer
// blocks.global_slot is now global_slot_since_hard_fork
// blocks.timestamp is now text 
// snarked ledger hash.value is now text

const getBlocksQueryv1 = `
WITH block_range AS (
  SELECT min(id) AS min_id, max(id) AS max_id
  FROM blocks
  WHERE height >= $2 and height <= $3
)
SELECT
  b.id AS id,
  b.height AS blockheight,
  b.state_hash AS statehash,
  slh.value AS stakingLedgerhash,
  b.timestamp AS blockdatetime,
  b.global_slot AS slot,
  b.global_slot_since_genesis AS globalslotsincegenesis,
  pkc.value AS creatorpublickey,
  pkw.value AS winnerpublickey,
  pk.value AS recevierpublickey,
  coalesce(bif.coinbase, 0) AS coinbase,
  coalesce(bif2.feeTransferToReceiver, 0) AS feetransfertoreceiver,
  coalesce(bif.feeTransferFromCoinbase, 0) AS feetransferfromcoinbase,
  coalesce(btf.userCommandTransactionFees, 0) AS usercommandtransactionfees
FROM
  blocks b
  INNER JOIN public_keys pkc ON b.creator_id = pkc.id
  INNER JOIN public_keys pkw ON b.block_winner_id = pkw.id
  INNER JOIN epoch_data ed ON b.staking_epoch_data_id = ed.id
  INNER JOIN snarked_ledger_hashes slh ON ed.ledger_hash_id = slh.id
  LEFT JOIN (
    SELECT
      bic.block_id,
      sum(
        CASE
          WHEN ic.type = 'coinbase' THEN coalesce(ic.fee, 0)
          ELSE 0
        END
      ) AS coinbase,
      sum(
        CASE
          WHEN ic.type = 'fee_transfer_via_coinbase' THEN coalesce(ic.fee, 0)
          ELSE 0
        END
      ) AS feeTransferFromCoinbase,
      max(
        CASE
          WHEN ic.type = 'coinbase' THEN ic.receiver_id
          ELSE NULL
        END
      ) AS coinbaseReceiverId
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    WHERE bic.block_id >= (SELECT min_id FROM block_range) AND bic.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      bic.block_id
  ) bif ON b.id = bif.block_id
  LEFT JOIN public_keys pk on pk.id = bif.coinbaseReceiverId
  LEFT JOIN (
    SELECT
      bic.block_id,
      sum(
        CASE
          WHEN ic.type = 'fee_transfer' THEN coalesce(ic.fee, 0)
          ELSE 0
        END
      ) AS feeTransferToReceiver,
      ic.receiver_id
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    WHERE bic.block_id >= (SELECT min_id FROM block_range) AND bic.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      bic.block_id,
      ic.receiver_id
  ) bif2 ON b.id = bif2.block_id
    AND bif2.receiver_id = bif.coinbaseReceiverId
  LEFT JOIN (
    SELECT
      buc.block_id,
      sum(coalesce(uc.fee, 0)) AS userCommandTransactionFees
    FROM
      blocks_user_commands buc
    INNER JOIN user_commands uc ON buc.user_command_id = uc.id
    WHERE
      buc.status = 'applied' and buc.block_id >= (SELECT min_id FROM block_range) AND buc.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      buc.block_id
  ) btf ON b.id = btf.block_id
WHERE
  EXISTS (
    WITH RECURSIVE chain AS (
      SELECT
        id,
        state_hash,
        parent_id,
        creator_id,
        snarked_ledger_hash_id,
        ledger_hash,
        height,
        timestamp
      FROM
        blocks b
      WHERE
        b.height = ( select MAX(height) from blocks )
      UNION
      ALL
      SELECT
        b.id,
        b.state_hash,
        b.parent_id,
        b.creator_id,
        b.snarked_ledger_hash_id,
        b.ledger_hash,
        b.height,
        b.timestamp
      FROM
        blocks b
        INNER JOIN chain ON b.id = chain.parent_id
    )
    SELECT
        1
    FROM
        chain c
    WHERE c.id = b.id
  )
AND pkc.value = $1
AND b.height >= $2
AND b.height <= $3
ORDER BY b.height DESC
`;

const getBlocksQueryv2 = `
WITH block_range AS (
  SELECT min(id) AS min_id, max(id) AS max_id
  FROM blocks
  WHERE height >= $2 and height <= $3
)
SELECT
  b.id AS id,
  b.height AS blockheight,
  b.state_hash AS statehash,
  slh.value AS stakingLedgerhash,
  b.timestamp AS blockdatetime,
  b.global_slot_since_hard_fork AS slot,
  b.global_slot_since_genesis AS globalslotsincegenesis,
  pkc.value AS creatorpublickey,
  pkw.value AS winnerpublickey,
  pk.value AS recevierpublickey,
  coalesce(bif.coinbase, 0) AS coinbase,
  coalesce(bif2.feeTransferToReceiver, 0) AS feetransfertoreceiver,
  coalesce(bif.feeTransferFromCoinbase, 0) AS feetransferfromcoinbase,
  coalesce(btf.userCommandTransactionFees, 0) AS usercommandtransactionfees
FROM
  blocks b
  INNER JOIN public_keys pkc ON b.creator_id = pkc.id
  INNER JOIN public_keys pkw ON b.block_winner_id = pkw.id
  INNER JOIN epoch_data ed ON b.staking_epoch_data_id = ed.id
  INNER JOIN snarked_ledger_hashes slh ON ed.ledger_hash_id = slh.id
  LEFT JOIN (
    SELECT
      bic.block_id,
      sum(
        CASE
          WHEN ic.command_type = 'coinbase' THEN coalesce(cast(ic.fee as bigint), 0)
          ELSE 0
        END
      ) AS coinbase,
      sum(
        CASE
          WHEN ic.command_type = 'fee_transfer_via_coinbase' THEN coalesce(cast(ic.fee as bigint), 0)
          ELSE 0
        END
      ) AS feeTransferFromCoinbase,
      max(
        CASE
          WHEN ic.command_type = 'coinbase' THEN ic.receiver_id
          ELSE NULL
        END
      ) AS coinbaseReceiverId
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    WHERE bic.block_id >= (SELECT min_id FROM block_range) AND bic.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      bic.block_id
  ) bif ON b.id = bif.block_id
  LEFT JOIN public_keys pk on pk.id = bif.coinbaseReceiverId
  LEFT JOIN (
    SELECT
      bic.block_id,
      sum(
        CASE
          WHEN ic.command_type = 'fee_transfer' THEN coalesce(cast(ic.fee as bigint), 0)
          ELSE 0
        END
      ) AS feeTransferToReceiver,
      ic.receiver_id
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    WHERE bic.block_id >= (SELECT min_id FROM block_range) AND bic.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      bic.block_id,
      ic.receiver_id
  ) bif2 ON b.id = bif2.block_id
    AND bif2.receiver_id = bif.coinbaseReceiverId
  LEFT JOIN (
    SELECT
      buc.block_id,
      sum(coalesce(cast(uc.fee as bigint), 0)) AS userCommandTransactionFees
    FROM
      blocks_user_commands buc
    INNER JOIN user_commands uc ON buc.user_command_id = uc.id
    WHERE
      buc.status = 'applied' and buc.block_id >= (SELECT min_id FROM block_range) AND buc.block_id <= (SELECT max_id FROM block_range)
    GROUP BY
      buc.block_id
  ) btf ON b.id = btf.block_id
WHERE
  EXISTS (
    WITH RECURSIVE chain AS (
      SELECT
        id,
        state_hash,
        parent_id,
        creator_id,
        snarked_ledger_hash_id,
        ledger_hash,
        height,
        timestamp
      FROM
        blocks b
      WHERE
        b.height = ( select MAX(height) from blocks )
      UNION
      ALL
      SELECT
        b.id,
        b.state_hash,
        b.parent_id,
        b.creator_id,
        b.snarked_ledger_hash_id,
        b.ledger_hash,
        b.height,
        b.timestamp
      FROM
        blocks b
        INNER JOIN chain ON b.id = chain.parent_id
    )
    SELECT
        1
    FROM
        chain c
    WHERE c.id = b.id
  )
AND pkc.value = $1
AND b.height >= $2
AND b.height <= $3
ORDER BY b.height DESC
`;

export const getBlocksQuery =
  configuration.blockDbVersion === 'v1' ?
    getBlocksQueryv1
    : getBlocksQueryv2;

export const getNullParentsQuery = `
    SELECT height FROM blocks WHERE parent_id is null AND height >= $1 AND height <= $2 and height > 1
`;

const getLastestBlockQueryv1 = `
SELECT 
height as blockheight, 
global_slot_since_genesis as globalslotsincegenesis,
global_slot as globalslot,
state_hash as statehash,
parent_hash as parenthash,
ledger_hash as ledgerhash,
to_char(to_timestamp("timestamp" / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '.' || 
    LPAD((("timestamp" % 1000)::text), 3, '0') || 'Z' as datetime
FROM blocks
WHERE id in (SELECT MAX(id) FROM blocks)`

const getLastestBlockQueryv2 = `
SELECT 
height as blockheight, 
global_slot_since_genesis as globalslotsincegenesis,
global_slot_since_hard_fork as globalslot,
state_hash as statehash,
parent_hash as parenthash,
ledger_hash as ledgerhash,
to_char(to_timestamp(cast ("timestamp" as bigint) / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '.' || 
    LPAD(((cast("timestamp" as bigint) % 1000)::text), 3, '0') || 'Z' as datetime
FROM blocks
WHERE id in (SELECT MAX(id) FROM blocks);`

export const getLastestBlockQuery =
  configuration.blockDbVersion === 'v1' ?
    getLastestBlockQueryv1
    : getLastestBlockQueryv2;


const getMinMaxBlocksInSlotRangeQueryFork0 = `
SELECT min(height) as epochminblockheight, max(height) as epochmaxblockheight
FROM
blocks b
WHERE
  EXISTS (
    WITH RECURSIVE chain AS (
      SELECT id, b.parent_id
      FROM blocks b
      WHERE b.height = ( select MAX(height) from blocks )
      UNION ALL
      SELECT b.id, b.parent_id
      FROM blocks b
      INNER JOIN chain ON b.id = chain.parent_id
    )
    SELECT
      1
    FROM
      chain c
    WHERE c.id = b.id
  )
AND b.global_slot_since_genesis >= CAST($1 AS INTEGER)
AND b.global_slot_since_genesis <= CAST($2 AS INTEGER)
AND b.global_slot_since_genesis = b.global_slot_since_hard_fork`;

const getMinMaxBlocksInSlotRangeQueryFork1 = `
SELECT min(height) as epochminblockheight, max(height) as epochmaxblockheight
FROM
blocks b
WHERE
  EXISTS (
    WITH RECURSIVE chain AS (
      SELECT id, b.parent_id
      FROM blocks b
      WHERE b.height = ( select MAX(height) from blocks )
      UNION ALL
      SELECT b.id, b.parent_id
      FROM blocks b
      INNER JOIN chain ON b.id = chain.parent_id
    )
    SELECT
      1
    FROM
      chain c
    WHERE c.id = b.id
  )
AND b.global_slot_since_hard_fork >= CAST($1 AS INTEGER)
AND b.global_slot_since_hard_fork <= CAST($2 AS INTEGER)
AND b.global_slot_since_hard_fork < b.global_slot_since_genesis`;

export const getMinMaxBlocksInSlotRangeQuery = (fork: number): string => {
  let query = getMinMaxBlocksInSlotRangeQueryFork0;
  if (fork == 1) { query = getMinMaxBlocksInSlotRangeQueryFork1; }
  return query;
}

export const getEpochQuery = `
SELECT MIN(b.global_slot_since_hard_fork), MAX(b.global_slot_since_hard_fork)
FROM blocks b
INNER JOIN epoch_data ed ON b.staking_epoch_data_id = ed.id
INNER JOIN snarked_ledger_hashes slh ON ed.ledger_hash_id = slh.id
WHERE slh.value = $1
`;

export const getHeightMissingQuery = `
SELECT h as height
FROM (SELECT h::int FROM generate_series(CAST($1 as INTEGER) , CAST($2 as INTEGER)) h
LEFT JOIN blocks b
ON h = b.height where b.height is null) as v
`;

