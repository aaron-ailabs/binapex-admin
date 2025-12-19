-- Phase 1: Database Safety Checks
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS locked_balance NUMERIC DEFAULT 0;

ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS non_negative_balance;
ALTER TABLE wallets
  ADD CONSTRAINT non_negative_balance CHECK (balance >= 0);

-- Update Transactions Status Constraint to include 'completed' and 'rejected' (if not already compatible)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed', 'cancelled'));


-- Phase 2: Request Withdrawal RPC
CREATE OR REPLACE FUNCTION request_withdrawal(amount NUMERIC, bank_details JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_locked numeric;
BEGIN
  -- 1. Check Balance & Lock Row
  SELECT balance, locked_balance INTO v_balance, v_locked
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance < amount THEN
    RAISE EXCEPTION 'Insufficient Funds';
  END IF;

  -- 2. Move Funds (Atomic)
  UPDATE wallets
  SET balance = balance - amount,
      locked_balance = locked_balance + amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- 3. Insert Transaction
  INSERT INTO transactions (user_id, amount, type, status, metadata)
  VALUES (v_user_id, amount, 'withdrawal', 'pending', bank_details);

END;
$$;


-- Phase 3: Admin Approval RPCs
CREATE OR REPLACE FUNCTION approve_withdrawal(transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount numeric;
  v_user_id uuid;
  v_status text;
BEGIN
  -- 1. Get Transaction Info & Lock
  SELECT amount, user_id, status INTO v_amount, v_user_id, v_status
  FROM transactions
  WHERE id = transaction_id
  FOR UPDATE;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- 2. Update Transaction
  UPDATE transactions
  SET status = 'completed',
      updated_at = now()
  WHERE id = transaction_id;

  -- 3. Burn Locked Funds (They leave the system)
  UPDATE wallets
  SET locked_balance = locked_balance - v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;


CREATE OR REPLACE FUNCTION reject_withdrawal(transaction_id UUID, reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount numeric;
  v_user_id uuid;
  v_status text;
BEGIN
  -- 1. Get Transaction Info & Lock
  SELECT amount, user_id, status INTO v_amount, v_user_id, v_status
  FROM transactions
  WHERE id = transaction_id
  FOR UPDATE;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- 2. Update Transaction
  UPDATE transactions
  SET status = 'rejected',
      admin_notes = reason,
      updated_at = now()
  WHERE id = transaction_id;

  -- 3. Refund Locked Funds (Back to Balance)
  UPDATE wallets
  SET locked_balance = locked_balance - v_amount,
      balance = balance + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;
