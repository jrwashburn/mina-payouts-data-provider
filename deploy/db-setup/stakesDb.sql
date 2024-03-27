CREATE SEQUENCE staking_ledger_id_seq AS bigint START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE staking_ledger (
    id bigint NOT NULL DEFAULT nextval('staking_ledger_id_seq'),
    hash text NOT NULL,
    epoch integer NULL,
    public_key text NOT NULL,
    balance numeric(20, 10) NOT NULL,
    delegate_key text NOT NULL,
    token bigint NOT NULL,
    nonce bigint NULL,
    receipt_chain_hash text not null,
    voting_for text not null,
    timing_initial_minimum_balance numeric(20, 10) NULL,
    timing_cliff_time bigint NULL,
    timing_cliff_amount numeric(20, 10) NULL,
    timing_vesting_period bigint NULL,
    timing_vesting_increment numeric(20, 10) NULL,
    permissions_stake boolean NOT NULL,
    permissions_edit_state text NULL,
    permissions_send text NOT NULL,
    permissions_set_delegate text NOT NULL,
    permissions_set_permissions text NOT NULL,
    permissions_set_verification_key text NOT NULL
);

ALTER SEQUENCE staking_ledger_id_seq OWNED BY staking_ledger.id;
CREATE INDEX staking_ledger_delegate_key ON staking_ledger(delegate_key);
CREATE INDEX staking_ledger_hash ON staking_ledger(hash text_ops);
CREATE INDEX staking_ledger_public_key ON staking_ledger(public_key);
CREATE INDEX staking_ledger_epoch ON staking_ledger(epoch);

/* GRANT USAGE,SELECT,UPDATE ON staking_ledger TO YOUR_USER; */