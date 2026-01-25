DROP FUNCTION IF EXISTS public.request_new_deposit(numeric, text, uuid);

-- Create RPC for trader deposit submission
-- This matches the trader app server action `submitDeposit` which calls:
--   supabase.rpc("request_new_deposit", { p_amount, p_receipt_url, p_bank_id })
--
-- Deposit requests are represented as rows in `public.transactions` with:
--   type = 'deposit', status = 'pending', amount, receipt_url
--
-- Admin approval uses existing `approve_deposit(transaction_id, admin_id)` which updates
-- the same `transactions` row + credits wallets.

CREATE OR REPLACE FUNCTION public.request_new_deposit(
  p_amount numeric,
  p_receipt_url text,
  p_bank_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tx_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount IS NULL OR p_amount < 50 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  IF p_receipt_url IS NULL OR length(trim(p_receipt_url)) = 0 THEN
    RAISE EXCEPTION 'Receipt URL required';
  END IF;

  INSERT INTO public.transactions (
    user_id,
    amount,
    type,
    status,
    receipt_url,
    metadata
  )
  VALUES (
    v_user_id,
    p_amount,
    'deposit',
    'pending',
    p_receipt_url,
    jsonb_build_object(
      'platform_bank_account_id', p_bank_id
    )
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

