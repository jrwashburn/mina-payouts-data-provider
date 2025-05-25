ALTER TABLE
  staking_ledger
ALTER COLUMN
  balance TYPE NUMERIC(29, 10);

ALTER TABLE
  staking_ledger
ALTER COLUMN
  timing_initial_minimum_balance TYPE NUMERIC(29, 10);

ALTER TABLE
  staking_ledger
ALTER COLUMN
  timing_cliff_amount TYPE NUMERIC(29, 10);

ALTER TABLE
  staking_ledger
ALTER COLUMN
  timing_vesting_increment TYPE NUMERIC(29, 10);