CREATE OR REPLACE FUNCTION public.execute_binary_trade(
  p_user_id UUID,
  p_amount DECIMAL,
  p_asset_symbol TEXT,
  p_direction TEXT, -- 'UP' or 'DOWN'
  p_duration_seconds INTEGER,
  p_strike_price DECIMAL,
  p_payout_rate DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_balance DECIMAL;
  v_order_id UUID;
  v_side TEXT;
  v_expiry TIMESTAMPTZ;
BEGIN
  -- 1. Check Balance
  SELECT balance_usd INTO v_balance FROM public.profiles WHERE id = p_user_id;
  
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 2. Deduct Balance
  UPDATE public.profiles 
  SET balance_usd = balance_usd - p_amount 
  WHERE id = p_user_id;

  -- 3. Calculate Expiry
  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;
  
  -- Map direction to side for compatibility
  v_side := CASE WHEN p_direction = 'UP' THEN 'buy' ELSE 'sell' END;

  -- 4. Insert Order
  INSERT INTO public.orders (
    user_id,
    symbol,
    side, -- 'buy' (UP) or 'sell' (DOWN)
    type, -- 'binary' or 'market'? I'll use 'market' as placeholder or 'binary' if enum supports
    size, -- Investment Amount
    entry_price,
    leverage, -- Storing payout rate here as discussed
    status, -- 'OPEN'
    expiry_at,
    created_at
  ) VALUES (
    p_user_id,
    p_asset_symbol,
    v_side,
    'market', -- Using 'market' as it's closest to standard order types
    p_amount,
    p_strike_price,
    p_payout_rate,
    'OPEN',
    v_expiry,
    NOW()
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('success', true, 'order', jsonb_build_object(
    'id', v_order_id,
    'status', 'OPEN',
    'expiry_at', v_expiry
  ));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
