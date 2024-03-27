export const getStakingLedgersQuery = `SELECT 
		public_key,
		balance, 
		delegate_key,
		timing_initial_minimum_balance, 
		timing_cliff_time, 
		timing_cliff_amount, 
		timing_vesting_period, 
		timing_vesting_increment 
		FROM public.staking_ledger
		WHERE hash = $1 AND delegate_key = $2`;

export const getStakingLedgersByEpochQuery = `SELECT 
		public_key, 
		balance, 
		delegate_key, 
		timing_initial_minimum_balance, 
		timing_cliff_time, 
		timing_cliff_amount, 
		timing_vesting_period, 
		timing_vesting_increment 
		FROM public.staking_ledger
		WHERE delegate_key = $1 AND epoch = $2`;

export const hashExistsQuery = 'select count(*) from staking_ledger where hash=$1'

export const updateEpochQuery = `UPDATE staking_ledger SET epoch = $1 WHERE hash = $2 and epoch is null`;

export const hashExistsForEpochQuery = 'select count(*) from staking_ledger where hash=$1 and epoch=$2';

export const getEpochFromHashQuery = 'select max(epoch) as epoch from staking_ledger where hash = $1';

export const getInsertIntoStakingLedgersQuery = (values: string[]): string => {
  return `INSERT INTO staking_ledger(
				id,
				hash,
				epoch,
				public_key,
				balance,
				delegate_key, 
				token,
				nonce,
				receipt_chain_hash,
				voting_for,
				timing_initial_minimum_balance,
				timing_cliff_time,
				timing_cliff_amount,
				timing_vesting_period,
				timing_vesting_increment,
				permissions_stake,
				permissions_edit_state,
				permissions_send,
				permissions_set_delegate,
				permissions_set_permissions,
				permissions_set_verification_key ) VALUES ${values.join(', ')}`
}