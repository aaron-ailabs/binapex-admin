DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users'
    ) THEN
        CREATE TABLE public.admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id),
            UNIQUE(user_id)
        );
    END IF;
END
$$;

-- Fix is_admin to have a no-argument version that checks the current user
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
    );
$$;

-- Ensure is_admin(UUID) also exists and is consistent
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = p_user_id
    );
$$;

DROP FUNCTION IF EXISTS public.settle_binary_order(uuid, text, numeric, text, text);

-- Update settle_binary_order to use the no-argument is_admin() and ensure it's robust
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
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admin can settle orders');
  END IF;

  v_admin_id := auth.uid();

  -- Lock the order for update
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already settled');
  END IF;

  -- Calculate payout and profit
  IF p_outcome = 'WIN' THEN
    v_profit := v_order.amount * (v_order.payout_rate::DECIMAL / 100.0);
    v_payout := v_order.amount + v_profit;     
  ELSE
    v_profit := -v_order.amount;
    v_payout := 0;
  END IF;

  -- Update order status
  UPDATE public.orders
  SET status = p_outcome,
      exit_price = p_final_price,
      profit_loss = v_profit,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Credit wallet if WIN
  IF p_outcome = 'WIN' THEN
    UPDATE public.wallets
    SET available_balance = available_balance + v_payout,
        updated_at = NOW()
    WHERE user_id = v_order.user_id AND asset_symbol = 'USD';
    
    -- If wallets doesn't use available_balance but just balance, update accordingly
    -- Checking schema from consolidated... it uses available_balance
  END IF;

  -- Log the settlement
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
