DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, integer);

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
  -- 1. Check Balance from public.wallets (USD)
  SELECT balance INTO v_balance 
  FROM public.wallets 
  WHERE user_id = p_user_id AND asset = 'USD';
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 2. Deduct Balance from Wallets
  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND asset = 'USD';

  -- 3. Calculate Expiry
  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;

  -- 4. Insert into orders table
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

-- 2. Redefine settle_binary_order to be robust and use wallets
CREATE OR REPLACE FUNCTION public.settle_binary_order(
    p_order_id uuid, 
    p_outcome text, 
    p_final_price numeric,
    p_rationale text DEFAULT NULL,
    p_supporting_document_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_payout DECIMAL;
  v_profit DECIMAL;
  v_admin_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admin can settle orders');
  END IF;

  v_admin_id := auth.uid();

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already settled');
  END IF;

  IF p_outcome = 'WIN' THEN
    v_profit := v_order.amount * (v_order.payout_rate::DECIMAL / 100.0);
    v_payout := v_order.amount + v_profit;     
  ELSE
    v_profit := -v_order.amount;
    v_payout := 0;
  END IF;

  UPDATE public.orders
  SET status = p_outcome,
      exit_price = p_final_price,
      profit_loss = v_profit,
      updated_at = NOW()
  WHERE id = p_order_id;

  IF p_outcome = 'WIN' THEN
    UPDATE public.wallets
    SET balance = balance + v_payout,
        updated_at = NOW()
    WHERE user_id = v_order.user_id AND asset = 'USD';
  END IF;

  INSERT INTO public.trade_settlement_audit_logs (
    order_id,
    user_id,
    admin_id,
    outcome,
    rationale,
    supporting_document_url,
    final_price
  )
  VALUES (
    v_order.id,
    v_order.user_id,
    v_admin_id,
    p_outcome,
    p_rationale,
    p_supporting_document_url,
    p_final_price
  );

  RETURN jsonb_build_object('success', true, 'payout', v_payout, 'profit', v_profit);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
