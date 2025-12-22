-- Migration: Allow withdrawing bonus funds responsibly
-- 1. Updates request_withdrawal to use Bonus funds if Wallet balance is insufficient
-- 2. Records the funding source split in transaction metadata
-- 3. Updates reject_withdrawal to refund back to correct sources

CREATE OR REPLACE FUNCTION request_withdrawal(amount NUMERIC, bank_details JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet_balance numeric;
  v_locked numeric;
  v_bonus_balance numeric;
  
  v_deduct_wallet numeric;
  v_deduct_bonus numeric;
  v_new_metadata jsonb;
BEGIN
  -- 1. Check Balances & Lock Rows
  SELECT balance, locked_balance INTO v_wallet_balance, v_locked
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  SELECT bonus_balance INTO v_bonus_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  -- Handle nulls
  v_wallet_balance := COALESCE(v_wallet_balance, 0);
  v_bonus_balance := COALESCE(v_bonus_balance, 0);

  IF (v_wallet_balance + v_bonus_balance) < amount THEN
    RAISE EXCEPTION 'Insufficient Funds (Total Equity)';
  END IF;

  -- 2. Calculate Deduction Split
  -- Use Wallet Balance first (Real Money), then Bonus
  v_deduct_wallet := LEAST(v_wallet_balance, amount);
  v_deduct_bonus := amount - v_deduct_wallet;

  -- 3. Move Funds
  
  -- Update Wallet: Deduct used real funds, but increase Locked by FULL amount
  -- (We effectively "convert" the used bonus into a locked state in the wallet context for pending processing)
  UPDATE wallets
  SET balance = balance - v_deduct_wallet,
      locked_balance = locked_balance + amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Update Profile: Deduct used bonus
  IF v_deduct_bonus > 0 THEN
    UPDATE profiles
    SET bonus_balance = bonus_balance - v_deduct_bonus
    WHERE id = v_user_id;
  END IF;

  -- 4. Prepare Metadata with Funding Source info
  v_new_metadata := bank_details || jsonb_build_object(
    'funding_source', jsonb_build_object(
      'wallet', v_deduct_wallet,
      'bonus', v_deduct_bonus
    )
  );

  -- 5. Insert Transaction
  INSERT INTO transactions (user_id, amount, type, status, metadata)
  VALUES (v_user_id, amount, 'withdrawal', 'pending', v_new_metadata);

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
  v_metadata jsonb;
  
  v_refund_wallet numeric;
  v_refund_bonus numeric;
  v_funding_source jsonb;
BEGIN
  -- 1. Get Transaction Info & Lock
  SELECT amount, user_id, status, metadata INTO v_amount, v_user_id, v_status, v_metadata
  FROM transactions
  WHERE id = transaction_id
  FOR UPDATE;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- 2. Determine Refund Split
  v_funding_source := v_metadata->'funding_source';
  
  -- Use explicit numbers if present, otherwise default to "All Wallet" (backward compatibility)
  IF v_funding_source IS NOT NULL THEN
    v_refund_wallet := (v_funding_source->>'wallet')::numeric;
    v_refund_bonus := (v_funding_source->>'bonus')::numeric;
  ELSE
    v_refund_wallet := v_amount;
    v_refund_bonus := 0;
  END IF;

  -- Safety Check: Ensure split matches total
  IF (COALESCE(v_refund_wallet, 0) + COALESCE(v_refund_bonus, 0)) != v_amount THEN
     -- Fallback if math is off: refund all to wallet to be safe/user-friendly, or error?
     -- Let's stick to safe fallback: Refund to wallet
     v_refund_wallet := v_amount;
     v_refund_bonus := 0;
  END IF;

  -- 3. Update Transaction
  UPDATE transactions
  SET status = 'rejected',
      admin_notes = reason,
      updated_at = now()
  WHERE id = transaction_id;

  -- 4. Refund Funds
  
  -- Wallet: Unlock full amount, Refund specific wallet amount
  UPDATE wallets
  SET locked_balance = locked_balance - v_amount,
      balance = balance + v_refund_wallet,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Bonus: Refund specific bonus amount
  IF v_refund_bonus > 0 THEN
    UPDATE profiles
    SET bonus_balance = bonus_balance + v_refund_bonus
    WHERE id = v_user_id;
  END IF;

END;
$$;
