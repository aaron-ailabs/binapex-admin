
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, numeric);

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
  v_asset_id uuid;
  v_side text;
  v_use_profiles boolean;
BEGIN
  IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Allow service_role to bypass the user_id check
  IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  IF p_asset_symbol IS NULL OR length(trim(p_asset_symbol)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset symbol required');
  END IF;

  IF p_direction NOT IN ('UP', 'DOWN') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid direction');
  END IF;

  IF p_duration_seconds IS NULL OR p_duration_seconds <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid duration');
  END IF;

  IF p_strike_price IS NULL OR p_strike_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid strike price');
  END IF;

  v_side := CASE WHEN p_direction = 'UP' THEN 'buy' ELSE 'sell' END;

  RAISE NOTICE 'p_asset_symbol: %', p_asset_symbol;
  RAISE NOTICE 'Searching for asset with symbol: %', p_asset_symbol;
  SELECT id
  INTO v_asset_id
  FROM public.assets
  WHERE symbol = p_asset_symbol
     OR symbol = replace(p_asset_symbol, '-', '/')
     OR symbol = replace(p_asset_symbol, '/', '-')
  LIMIT 1;
  RAISE NOTICE 'Found v_asset_id: %', v_asset_id;

  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
  END IF;

  v_use_profiles := true;

  IF to_regclass('public.wallets') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'wallets'
         AND column_name = 'balance'
     ) THEN
    v_use_profiles := false;
  END IF;

  IF v_use_profiles THEN
    SELECT balance_usd
    INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.profiles
    SET balance_usd = balance_usd - p_amount
    WHERE id = p_user_id;
  ELSE
    SELECT balance
    INTO v_balance
    FROM public.wallets
    WHERE user_id = p_user_id AND asset = 'USD'
    FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND asset = 'USD';
  END IF;

  -- 3. Calculate Expiry
  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;

  -- 4. Insert into orders table
  INSERT INTO public.orders (
    user_id,
    asset_id,
    side,
    type,
    price,
    size,
    asset_symbol,
    direction,
    amount,
    strike_price,
    payout_rate,
    status,
    end_time,
    expiry_at,
    created_at
  ) VALUES (
    p_user_id,
    v_asset_id,
    v_side,
    'binary',
    p_strike_price,
    p_amount,
    p_asset_symbol,
    p_direction,
    p_amount,
    p_strike_price,
    p_payout_rate,
    'OPEN',
    v_expiry,
    v_expiry,
    NOW()
  ) RETURNING id INTO v_order_id;

  -- 5. Create Admin Notification for the trade
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
