-- ============================================
-- TRADER PORTAL SYNC FIX - CONSOLIDATED
-- ============================================
-- Date: 2026-01-12
-- Apply this single file to fix all sync issues
-- between trader portal and admin portal
-- ============================================

BEGIN;

-- ============================================
-- 1. FIX ORDERS SCHEMA FOR BINARY TRADING
-- ============================================

-- Add missing binary trading columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS amount DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS payout_rate DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS strike_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS entry_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS exit_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profit_loss DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Add constraint for direction
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_direction_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_direction_check
  CHECK (direction IS NULL OR direction IN ('UP', 'DOWN'));

-- Update type constraint to include 'binary'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_type_check
  CHECK (type IN ('market', 'limit', 'binary', 'stop_limit'));

-- Migrate existing data
UPDATE public.orders SET amount = size
WHERE amount IS NULL AND type = 'binary' AND size IS NOT NULL;

UPDATE public.orders SET payout_rate = leverage
WHERE payout_rate IS NULL AND type = 'binary' AND leverage IS NOT NULL;

UPDATE public.orders SET strike_price = price
WHERE strike_price IS NULL AND type = 'binary' AND price IS NOT NULL;

UPDATE public.orders SET entry_price = price
WHERE entry_price IS NULL AND type = 'binary' AND price IS NOT NULL;

UPDATE public.orders SET end_time = expiry_at
WHERE end_time IS NULL AND expiry_at IS NOT NULL;

-- Get asset_symbol from asset_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
    UPDATE public.orders o SET asset_symbol = a.symbol
    FROM public.assets a
    WHERE o.asset_id = a.id AND o.asset_symbol IS NULL AND o.asset_id IS NOT NULL;
  END IF;
END $$;

-- Map side to direction
UPDATE public.orders
SET direction = CASE WHEN side = 'buy' THEN 'UP' WHEN side = 'sell' THEN 'DOWN' ELSE direction END
WHERE type = 'binary' AND direction IS NULL AND side IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expiry_at ON public.orders(expiry_at) WHERE expiry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON public.orders(type, status);

-- ============================================
-- 2. CREATE SETTLEMENT AUDIT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.trade_settlement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('WIN', 'LOSS')),
  rationale TEXT,
  supporting_document_url TEXT,
  final_price DECIMAL(18,8),
  payout_amount DECIMAL(18,8),
  profit_loss DECIMAL(18,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trade_settlement_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view settlement logs" ON public.trade_settlement_audit_logs;
CREATE POLICY "Admins can view settlement logs"
  ON public.trade_settlement_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create settlement logs" ON public.trade_settlement_audit_logs;
CREATE POLICY "Admins can create settlement logs"
  ON public.trade_settlement_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own settlement logs" ON public.trade_settlement_audit_logs;
CREATE POLICY "Users can view own settlement logs"
  ON public.trade_settlement_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_settlement_audit_order_id ON public.trade_settlement_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_user_id ON public.trade_settlement_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_admin_id ON public.trade_settlement_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_created_at ON public.trade_settlement_audit_logs(created_at DESC);

-- ============================================
-- 3. FIX ORDERS RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view OPEN orders" ON public.orders;
DROP POLICY IF EXISTS "Users View Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Users Create Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Users Cancel Own Orders" ON public.orders;

-- Create new policies with admin access
CREATE POLICY "Users and admins can view orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders, admins can update all"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- ============================================
-- 4. FIX TRANSACTIONS TYPE CONSTRAINT
-- ============================================

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'deposit', 'withdraw', 'withdrawal', 'bonus', 'commission',
    'balance_adjustment', 'trade_profit', 'trade_loss',
    'referral_bonus', 'cashback'
  ));

-- ============================================
-- 5. FIX TRANSACTIONS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users create own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins delete transactions" ON public.transactions;

CREATE POLICY "Users and admins view transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users create own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update transactions"
  ON public.transactions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins delete transactions"
  ON public.transactions FOR DELETE
  USING (public.is_admin());

-- ============================================
-- 6. FIX BINARY TRADE RPC FUNCTIONS
-- ============================================

-- Drop old versions
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.execute_binary_trade(uuid, numeric, text, text, integer, numeric, integer);

-- Create corrected execute_binary_trade
CREATE OR REPLACE FUNCTION public.execute_binary_trade(
  p_user_id UUID, p_amount DECIMAL, p_asset_symbol TEXT,
  p_direction TEXT, p_duration_seconds INTEGER,
  p_strike_price DECIMAL, p_payout_rate DECIMAL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id UUID;
  v_expiry TIMESTAMPTZ;
  v_balance DECIMAL;
BEGIN
  SELECT balance INTO v_balance FROM public.wallets
  WHERE user_id = p_user_id AND asset = 'USD';

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.wallets SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND asset = 'USD';

  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;

  INSERT INTO public.orders (
    user_id, asset_symbol, direction, amount, strike_price,
    entry_price, payout_rate, type, status, expiry_at, end_time, created_at
  ) VALUES (
    p_user_id, p_asset_symbol, p_direction, p_amount, p_strike_price,
    p_strike_price, p_payout_rate, 'binary', 'OPEN', v_expiry, v_expiry, NOW()
  ) RETURNING id INTO v_order_id;

  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (p_user_id, 'trade',
    concat('New Binary Trade: ', p_asset_symbol, ' ', p_direction, ' $', p_amount, ' by user ', p_user_id));

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'expiry_at', v_expiry);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create corrected settle_binary_order
CREATE OR REPLACE FUNCTION public.settle_binary_order(
  p_order_id UUID, p_outcome TEXT, p_final_price DECIMAL,
  p_rationale TEXT DEFAULT NULL, p_supporting_document_url TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    RETURN jsonb_build_object('success', false, 'error', 'Order already settled or cancelled');
  END IF;

  IF v_order.type != 'binary' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only settle binary orders');
  END IF;

  IF p_outcome = 'WIN' THEN
    v_profit := v_order.amount * (v_order.payout_rate::DECIMAL / 100.0);
    v_payout := v_order.amount + v_profit;
  ELSE
    v_profit := -v_order.amount;
    v_payout := 0;
  END IF;

  UPDATE public.orders SET status = p_outcome, exit_price = p_final_price,
    profit_loss = v_profit, closed_at = NOW() WHERE id = p_order_id;

  IF p_outcome = 'WIN' THEN
    UPDATE public.wallets SET balance = balance + v_payout, updated_at = NOW()
    WHERE user_id = v_order.user_id AND asset = 'USD';
  END IF;

  INSERT INTO public.trade_settlement_audit_logs (
    order_id, user_id, admin_id, outcome, rationale,
    supporting_document_url, final_price, payout_amount, profit_loss, created_at
  ) VALUES (
    v_order.id, v_order.user_id, v_admin_id, p_outcome, p_rationale,
    p_supporting_document_url, p_final_price, v_payout, v_profit, NOW()
  );

  RETURN jsonb_build_object('success', true, 'payout', v_payout, 'profit', v_profit);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create get_settlement_logs function
CREATE OR REPLACE FUNCTION public.get_settlement_logs(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, order_id UUID, user_id UUID, admin_id UUID, outcome TEXT,
  rationale TEXT, supporting_document_url TEXT, final_price DECIMAL,
  payout_amount DECIMAL, profit_loss DECIMAL, created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.is_admin() THEN
    IF p_user_id IS NULL THEN
      RETURN QUERY SELECT * FROM public.trade_settlement_audit_logs ORDER BY created_at DESC;
    ELSE
      RETURN QUERY SELECT * FROM public.trade_settlement_audit_logs
      WHERE trade_settlement_audit_logs.user_id = p_user_id ORDER BY created_at DESC;
    END IF;
  ELSE
    RETURN QUERY SELECT * FROM public.trade_settlement_audit_logs
    WHERE trade_settlement_audit_logs.user_id = auth.uid() ORDER BY created_at DESC;
  END IF;
END;
$$;

-- ============================================
-- 7. ENABLE REAL-TIME SYNC
-- ============================================

-- Add tables to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trade_settlement_audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_settlement_audit_logs;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  END IF;
END $$;

-- Enable replica identity
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.trade_settlement_audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.wallets REPLICA IDENTITY FULL;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these after applying the migration to verify:
-- SELECT COUNT(*) FROM orders;
-- SELECT * FROM orders WHERE type = 'binary' LIMIT 5;
-- SELECT * FROM trade_settlement_audit_logs LIMIT 5;
-- SELECT * FROM pg_policies WHERE tablename = 'orders';
