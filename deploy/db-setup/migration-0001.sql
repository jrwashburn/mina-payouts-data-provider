CREATE TABLE staking_ledger_fork1 AS
SELECT
id,
hash,
epoch,
public_key,
balance,
delegate_key,
token :: text as token,
nonce,
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

ALTER SEQUENCE staking_ledger_id_seq OWNED BY staking_ledger.id;

ALTER TABLE
  staking_ledger
ADD
  PRIMARY KEY (id);

CREATE SEQUENCE staking_ledger_id_new_seq START WITH 1;

SELECT
  setval(
    'staking_ledger_id_new_seq',
    (
      SELECT
        MAX(id)
      from
        staking_ledger
    )
  );

ALTER TABLE
  staking_ledger
ALTER COLUMN
  ID
SET
  DEFAULT NEXTVAL('staking_ledger_id_new_seq');

GRANT USAGE on staking_ledger_id_new_seq to YOUR_USER;

GRANT ALL ON staking_ledger TO YOUR_USER;