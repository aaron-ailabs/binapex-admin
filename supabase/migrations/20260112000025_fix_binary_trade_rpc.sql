-- Migration: Fix Binary Trade RPC Functions
-- Date: 2026-01-12
-- Purpose: Update execute_binary_trade and settle_binary_order to use correct column names

-- 1. DROP old versions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, integer);

-- 2. CREATE corrected execute_binary_trade function
CREATE OR REPLACE FUNCTION public.execute_binary_trade(
  p_user_id UUID,
  p_amount DECIMAL,
  p_asset_symbol TEXT,
  p_direction TEXT,
  p_duration_seconds INTEGER,
  p_strike_price DECIMAL,
  p_payout_rate DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_expiry TIMESTAMPTZ;
  v_balance DECIMAL;
BEGIN
  -- 1. Check balance from wallets (USD asset)
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id AND asset = 'USD';

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 2. Deduct balance from wallet
  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND asset = 'USD';

  -- 3. Calculate expiry time
  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;

  -- 4. Insert order with ALL required columns for binary trading
  INSERT INTO public.orders (
    user_id,
    asset_symbol,
    direction,
    amount,
    strike_price,
    entry_price,
    payout_rate,
    type,
    status,
    expiry_at,
    end_time,
    created_at
  ) VALUES (
    p_user_id,
    p_asset_symbol,
    p_direction,
    p_amount,
    p_strike_price,
    p_strike_price, -- entry_price same as strike_price initially
    p_payout_rate,
    'binary',
    'OPEN',
    v_expiry,
    v_expiry,
    NOW()
  ) RETURNING id INTO v_order_id;

  -- 5. Create admin notification
  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (
    p_user_id,
    'trade',
    concat('New Binary Trade: ', p_asset_symbol, ' ', p_direction, ' $', p_amount, ' by user ', p_user_id)
  );

  -- 6. Return success with order details
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'expiry_at', v_expiry
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. CREATE corrected settle_binary_order function
CREATE OR REPLACE FUNCTION public.settle_binary_order(
  p_order_id UUID,
  p_outcome TEXT,
  p_final_price DECIMAL,
  p_rationale TEXT DEFAULT NULL,
  p_supporting_document_url TEXT DEFAULT NULL
)
RETURNS JSONB
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
  -- 1. Check admin permission
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admin can settle orders');
  END IF;

  v_admin_id := auth.uid();

  -- 2. Get order details with row lock
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already settled or cancelled');
  END IF;

  IF v_order.type != 'binary' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only settle binary orders');
  END IF;

  -- 3. Calculate payout based on outcome
  IF p_outcome = 'WIN' THEN
    v_profit := v_order.amount * (v_order.payout_rate::DECIMAL / 100.0);
    v_payout := v_order.amount + v_profit;
  ELSE
    v_profit := -v_order.amount;
    v_payout := 0;
  END IF;

  -- 4. Update order status
  UPDATE public.orders
  SET status = p_outcome,
      exit_price = p_final_price,
      profit_loss = v_profit,
      closed_at = NOW()
  WHERE id = p_order_id;

  -- 5. Credit balance back to user if WIN
  IF p_outcome = 'WIN' THEN
    UPDATE public.wallets
    SET balance = balance + v_payout,
        updated_at = NOW()
    WHERE user_id = v_order.user_id AND asset = 'USD';
  END IF;

  -- 6. Create audit log entry
  INSERT INTO public.trade_settlement_audit_logs (
    order_id,
    user_id,
    admin_id,
    outcome,
    rationale,
    supporting_document_url,
    final_price,
    payout_amount,
    profit_loss,
    created_at
  ) VALUES (
    v_order.id,
    v_order.user_id,
    v_admin_id,
    p_outcome,
    p_rationale,
    p_supporting_document_url,
    p_final_price,
    v_payout,
    v_profit,
    NOW()
  );

  -- 7. Return success with settlement details
  RETURN jsonb_build_object(
    'success', true,
    'payout', v_payout,
    'profit', v_profit
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Add function to get settlement logs for a specific user (for API/UI)
CREATE OR REPLACE FUNCTION public.get_settlement_logs(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  user_id UUID,
  admin_id UUID,
  outcome TEXT,
  rationale TEXT,
  supporting_document_url TEXT,
  final_price DECIMAL,
  payout_amount DECIMAL,
  profit_loss DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If admin, can view all logs; if user, only their own
  IF public.is_admin() THEN
    IF p_user_id IS NULL THEN
      RETURN QUERY
      SELECT * FROM public.trade_settlement_audit_logs
      ORDER BY created_at DESC;
    ELSE
      RETURN QUERY
      SELECT * FROM public.trade_settlement_audit_logs
      WHERE trade_settlement_audit_logs.user_id = p_user_id
      ORDER BY created_at DESC;
    END IF;
  ELSE
    -- Regular users can only see their own logs
    RETURN QUERY
    SELECT * FROM public.trade_settlement_audit_logs
    WHERE trade_settlement_audit_logs.user_id = auth.uid()
    ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 5. Add comments for documentation
COMMENT ON FUNCTION public.execute_binary_trade IS 'Execute a binary options trade - deducts balance and creates OPEN order';
COMMENT ON FUNCTION public.settle_binary_order IS 'Settle a binary options trade as WIN or LOSS - admin only';
COMMENT ON FUNCTION public.get_settlement_logs IS 'Get settlement audit logs - filtered by user for non-admins';
