-- Migration: Fix transactions_type_check constraint to include 'withdrawal'

-- 1. Drop existing constraint
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Add updated constraint
ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('deposit', 'withdrawal', 'trade', 'transfer', 'bonus', 'fee'));

-- Note: Added 'bonus' and 'fee' just in case they are used elsewhere, better safe than sorry.
-- 'trade' and 'deposit' are definitely used. 'withdrawal' is what we need.
