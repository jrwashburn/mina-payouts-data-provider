-- Test data setup for integration tests
-- This populates the test databases with sample data matching fixtures

-- Archive Database Setup (postgres-archive)
-- This would be run against the archive database

-- Note: The archive database schema is very large and complex
-- For basic integration testing, we just need the database to exist
-- Real block data can be synced from a Mina node if needed

-- Staking Ledger Database Setup (postgres-stakes)
-- This is run automatically by deploy/db-setup scripts

-- Sample staking ledger entry for testing
INSERT INTO public.staking_ledger (
  hash,
  epoch,
  delegate_key,
  public_key,
  balance,
  timing_initial_minimum_balance,
  timing_cliff_time,
  timing_cliff_amount,
  timing_vesting_period,
  timing_vesting_increment
) VALUES (
  'jwyody4XQNTnGxkXQEKf87AN27wXadAjYgnGLAtvHahDkn2uWDU',
  1,
  'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
  'B62qiy8Z8XfQ9FrD6hGvEQrTHfRNRLX6nv3TDxVmLPfnPCRjMvZyAVG',
  '495878524316421',
  '0',
  '0',
  '0',
  '0',
  '0'
) ON CONFLICT DO NOTHING;

INSERT INTO public.staking_ledger (
  hash,
  epoch,
  delegate_key,
  public_key,
  balance,
  timing_initial_minimum_balance,
  timing_cliff_time,
  timing_cliff_amount,
  timing_vesting_period,
  timing_vesting_increment
) VALUES (
  'jwyody4XQNTnGxkXQEKf87AN27wXadAjYgnGLAtvHahDkn2uWDU',
  1,
  'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
  'B62qrKTFzHMkCFsAUn3TKX6u3H1S6wyVnGFZmgx9J9EcqMMZA8j4e8Z',
  '234567123456789',
  '0',
  '86400',
  '100000000000',
  '1000',
  '50000000'
) ON CONFLICT DO NOTHING;

INSERT INTO public.staking_ledger (
  hash,
  epoch,
  delegate_key,
  public_key,
  balance,
  timing_initial_minimum_balance,
  timing_cliff_time,
  timing_cliff_amount,
  timing_vesting_period,
  timing_vesting_increment
) VALUES (
  'jwyody4XQNTnGxkXQEKf87AN27wXadAjYgnGLAtvHahDkn2uWDU',
  1,
  'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
  'B62qpXcfjPMjt6jXHVRb1nF1RvYr6VEk5fVzs9YzfVZxPn7LgZWoTxL',
  '123456789012345',
  '0',
  '691200',
  '50000000000',
  '2000',
  '25000000'
) ON CONFLICT DO NOTHING;
