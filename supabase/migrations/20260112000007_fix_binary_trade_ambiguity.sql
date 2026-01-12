-- Drop both potentially conflicting signatures to ensure a clean slate
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, integer);

-- Create the single canonical version
CREATE OR REPLACE FUNCTION public.execute_binary_trade(
    p_user_id uuid, 
    p_amount numeric, 
    p_asset_symbol text, 
    p_direction text, 
    p_duration_seconds integer, 
    p_strike_price numeric, 
    p_payout_rate numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_expiry timestamp with time zone;
  v_balance numeric;
BEGIN
  -- Check balance in wallets table (unified approach)
  SELECT balance INTO v_balance 
  FROM public.wallets 
  WHERE user_id = p_user_id AND asset = 'USD';
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct balance
  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND asset = 'USD';

  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;

  -- Insert order
  INSERT INTO public.orders (
    user_id,
    asset_symbol,
    direction,
    amount,
    strike_price,
    payout_rate,
    status,
    end_time,
    expiry_at,
    type,
    created_at
  ) VALUES (
    p_user_id,
    p_asset_symbol,
    p_direction,
    p_amount,
    p_strike_price,
    p_payout_rate,
    'OPEN',
    v_expiry,
    v_expiry,
    'binary',
    NOW()
  ) RETURNING id INTO v_order_id;

  -- Notify admin
  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (
    p_user_id,
    'trade',
    concat('New Binary Trade: ', p_asset_symbol, ' ', p_direction, ' $', p_amount, ' by user ', p_user_id)
  );

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'expiry_at', v_expiry);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
