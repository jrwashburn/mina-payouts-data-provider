import type { Pool } from 'pg';
import {
  BlockRewardRow,
  SnarkFeeRow,
  FeeTransferRow,
  PaymentRow,
  ZkAppRow,
  DelegationRow,
} from '../models/taxExport.js';

/**
 * Query block production rewards (coinbase) received by the specified accounts
 * Reports on the coinbase receiver, not the block creator. When a block producer
 * sends their coinbase to a different wallet, the reward is reported on the
 * receiver's account for tax purposes.
 * Only returns canonical chain blocks
 */
export async function queryBlockProduction(
  pool: Pool,
  accountKeys: string[],
  startTimestamp: string,
  endTimestamp: string,
): Promise<BlockRewardRow[]> {
  const query = `
    SELECT
      b.height,
      b.state_hash,
      b.timestamp,
      pk_receiver.value as receiver_key,
      CAST(ic.fee AS BIGINT) as total_reward
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic ON bic.internal_command_id = ic.id
    INNER JOIN blocks b ON bic.block_id = b.id
    INNER JOIN public_keys pk_receiver ON ic.receiver_id = pk_receiver.id
    WHERE pk_receiver.value = ANY($1)
      AND CAST(b.timestamp AS BIGINT) >= $2
      AND CAST(b.timestamp AS BIGINT) < $3
      AND b.chain_status = 'canonical'
      AND ic.command_type = 'coinbase'
    ORDER BY b.timestamp;
  `;

  const result = await pool.query(query, [accountKeys, startTimestamp, endTimestamp]);
  return result.rows;
}

/**
 * Query mining transaction fees
 * Identified as fee_transfer or fee_transfer_via_coinbase where receiver == coinbase receiver
 * Only returns canonical chain blocks
 */
export async function queryMiningFees(
  pool: Pool,
  accountKeys: string[],
  startTimestamp: string,
  endTimestamp: string,
): Promise<FeeTransferRow[]> {
  const query = `
    SELECT
      b.height,
      b.state_hash,
      b.timestamp,
      pk_receiver.value as receiver_key,
      CAST(ic_fee.fee AS BIGINT) as amount,
      ic_fee.hash as tx_hash
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic_fee ON bic.internal_command_id = ic_fee.id
    INNER JOIN blocks b ON bic.block_id = b.id
    INNER JOIN public_keys pk_receiver ON ic_fee.receiver_id = pk_receiver.id
    -- Find the coinbase receiver for this block
    INNER JOIN blocks_internal_commands bic_coinbase ON bic_coinbase.block_id = b.id
    INNER JOIN internal_commands ic_coinbase ON bic_coinbase.internal_command_id = ic_coinbase.id
      AND ic_coinbase.command_type = 'coinbase'
    WHERE pk_receiver.value = ANY($1)
      AND CAST(b.timestamp AS BIGINT) >= $2
      AND CAST(b.timestamp AS BIGINT) < $3
      AND b.chain_status = 'canonical'
      AND ic_fee.command_type IN ('fee_transfer', 'fee_transfer_via_coinbase')
      AND ic_fee.receiver_id = ic_coinbase.receiver_id
    ORDER BY b.timestamp;
  `;

  const result = await pool.query(query, [accountKeys, startTimestamp, endTimestamp]);
  return result.rows;
}

/**
 * Query SNARK work fees
 * Identified as fee_transfer or fee_transfer_via_coinbase where receiver != coinbase receiver
 * Only returns canonical chain blocks
 */
export async function querySnarkFees(
  pool: Pool,
  accountKeys: string[],
  startTimestamp: string,
  endTimestamp: string,
): Promise<SnarkFeeRow[]> {
  const query = `
    SELECT
      b.height,
      b.state_hash,
      b.timestamp,
      pk_receiver.value as receiver_key,
      CAST(ic_fee.fee AS BIGINT) as amount,
      ic_fee.hash as tx_hash
    FROM blocks_internal_commands bic
    INNER JOIN internal_commands ic_fee ON bic.internal_command_id = ic_fee.id
    INNER JOIN blocks b ON bic.block_id = b.id
    INNER JOIN public_keys pk_receiver ON ic_fee.receiver_id = pk_receiver.id
    -- Find the coinbase receiver for this block
    INNER JOIN blocks_internal_commands bic_coinbase ON bic_coinbase.block_id = b.id
    INNER JOIN internal_commands ic_coinbase ON bic_coinbase.internal_command_id = ic_coinbase.id
      AND ic_coinbase.command_type = 'coinbase'
    WHERE pk_receiver.value = ANY($1)
      AND CAST(b.timestamp AS BIGINT) >= $2
      AND CAST(b.timestamp AS BIGINT) < $3
      AND b.chain_status = 'canonical'
      AND ic_fee.command_type IN ('fee_transfer', 'fee_transfer_via_coinbase')
      AND ic_fee.receiver_id != ic_coinbase.receiver_id
    ORDER BY b.timestamp;
  `;

  const result = await pool.query(query, [accountKeys, startTimestamp, endTimestamp]);
  return result.rows;
}

/**
 * Query payment transactions (sent or received)
 * Only returns canonical chain blocks
 */
export async function queryPayments(
  pool: Pool,
  accountKeys: string[],
  startTimestamp: string,
  endTimestamp: string,
): Promise<PaymentRow[]> {
  const query = `
    SELECT
      b.height,
      uc.hash as tx_hash,
      b.timestamp,
      pk_source.value as from_key,
      pk_receiver.value as to_key,
      CAST(uc.amount AS BIGINT) as amount,
      CAST(uc.fee AS BIGINT) as fee,
      uc.memo,
      CAST(ac.creation_fee AS BIGINT) as account_creation_fee
    FROM blocks_user_commands buc
    INNER JOIN user_commands uc ON buc.user_command_id = uc.id
    INNER JOIN blocks b ON buc.block_id = b.id
    INNER JOIN public_keys pk_source ON uc.source_id = pk_source.id
    INNER JOIN public_keys pk_receiver ON uc.receiver_id = pk_receiver.id
    LEFT JOIN accounts_created ac ON ac.block_id = b.id
      AND ac.account_identifier_id IN (
        SELECT ai2.id FROM account_identifiers ai2
        INNER JOIN public_keys pk2 ON ai2.public_key_id = pk2.id
        WHERE pk2.value = ANY($1)
      )
    WHERE (pk_source.value = ANY($1) OR pk_receiver.value = ANY($1))
      AND CAST(b.timestamp AS BIGINT) >= $2
      AND CAST(b.timestamp AS BIGINT) < $3
      AND b.chain_status = 'canonical'
      AND uc.command_type = 'payment'
    ORDER BY b.timestamp;
  `;

  const result = await pool.query(query, [accountKeys, startTimestamp, endTimestamp]);
  return result.rows;
}

/**
 * Query zkApp transactions with balance changes for the specified accounts
 * Only includes:
 * - Canonical chain blocks
 * - Applied transactions (excludes failed)
 * - MINA token (token_id = 1)
 * - Non-zero balance changes
 * Aggregates multiple account updates per transaction
 */
export async function queryZkApps(
  pool: Pool,
  accountKeys: string[],
  startTimestamp: string,
  endTimestamp: string,
): Promise<ZkAppRow[]> {
  const query = `
    WITH user_zkapp_balances AS (
      SELECT
        zk.id as zkapp_cmd_id,
        zk.hash as tx_hash,
        b.height,
        b.timestamp,
        zk.memo,
        pk_fee_payer.value as fee_payer,
        CAST(zfp.fee AS BIGINT) as fee,
        pk_account.value as account_key,
        CAST(zaub.balance_change AS BIGINT) as balance_change
      FROM blocks b
      INNER JOIN blocks_zkapp_commands bzk ON b.id = bzk.block_id
      INNER JOIN zkapp_commands zk ON bzk.zkapp_command_id = zk.id
      INNER JOIN zkapp_fee_payer_body zfp ON zk.zkapp_fee_payer_body_id = zfp.id
      INNER JOIN public_keys pk_fee_payer ON zfp.public_key_id = pk_fee_payer.id
      CROSS JOIN LATERAL unnest(zk.zkapp_account_updates_ids) AS au_id
      INNER JOIN zkapp_account_update zau ON zau.id = au_id
      INNER JOIN zkapp_account_update_body zaub ON zau.body_id = zaub.id
      INNER JOIN account_identifiers ai ON zaub.account_identifier_id = ai.id
      INNER JOIN public_keys pk_account ON ai.public_key_id = pk_account.id
      WHERE pk_account.value = ANY($1)
        AND CAST(b.timestamp AS BIGINT) >= $2
        AND CAST(b.timestamp AS BIGINT) < $3
        AND b.chain_status = 'canonical'
        AND bzk.status = 'applied'
        AND ai.token_id = 1
        AND zaub.balance_change != '0'
    )
    SELECT
      zkapp_cmd_id,
      tx_hash,
      height,
      timestamp,
      memo,
      fee_payer,
      fee,
      account_key,
      SUM(balance_change) as net_balance_change
    FROM user_zkapp_balances
    GROUP BY zkapp_cmd_id, tx_hash, height, timestamp, memo, fee_payer, fee, account_key
    ORDER BY timestamp, zkapp_cmd_id;
  `;

  const result = await pool.query(query, [accountKeys, startTimestamp, endTimestamp]);
  return result.rows;
}

/**
 * Query delegation transactions
 * Only returns canonical chain blocks
 */
export async function queryDelegations(
  pool: Pool,
  accountKeys: string[],
  startTimestamp: string,
  endTimestamp: string,
): Promise<DelegationRow[]> {
  const query = `
    SELECT
      b.height,
      uc.hash as tx_hash,
      b.timestamp,
      pk_source.value as source_key,
      pk_delegate.value as delegate_key,
      CAST(uc.fee AS BIGINT) as fee,
      uc.memo
    FROM blocks_user_commands buc
    INNER JOIN user_commands uc ON buc.user_command_id = uc.id
    INNER JOIN blocks b ON buc.block_id = b.id
    INNER JOIN public_keys pk_source ON uc.source_id = pk_source.id
    INNER JOIN public_keys pk_delegate ON uc.receiver_id = pk_delegate.id
    WHERE pk_source.value = ANY($1)
      AND CAST(b.timestamp AS BIGINT) >= $2
      AND CAST(b.timestamp AS BIGINT) < $3
      AND b.chain_status = 'canonical'
      AND uc.command_type = 'delegation'
    ORDER BY b.timestamp;
  `;

  const result = await pool.query(query, [accountKeys, startTimestamp, endTimestamp]);
  return result.rows;
}
