CREATE TABLE staking_ledger_fork1 AS
SELECT
  id,
  hash,
  epoch,
  public_key,
  balance,
  delegate_key,
  token :: text as token,
  receipt_chain_hash,
  voting_for,
  timing_initial_minimum_balance,
  timing_cliff_time,
  timing_cliff_amount,
  timing_vesting_period,
  timing_vesting_increment
FROM
  staking_ledger;

ALTER TABLE
  staking_ledger RENAME TO staking_ledger_backup;

ALTER TABLE
  staking_ledger_fork1 RENAME TO staking_ledger;

/* GRANT ALL ON TABLE staking_ledger to YOUR USER; */