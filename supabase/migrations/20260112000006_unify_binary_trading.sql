DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS asset_symbol text,
      ADD COLUMN IF NOT EXISTS direction text,
      ADD COLUMN IF NOT EXISTS amount numeric,
      ADD COLUMN IF NOT EXISTS strike_price numeric,
      ADD COLUMN IF NOT EXISTS payout_rate numeric,
      ADD COLUMN IF NOT EXISTS end_time timestamptz,
      ADD COLUMN IF NOT EXISTS expiry_at timestamptz,
      ADD COLUMN IF NOT EXISTS exit_price numeric,
      ADD COLUMN IF NOT EXISTS profit_loss numeric;

    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_type_check
      CHECK (type IN ('market', 'limit', 'stop_limit', 'binary', 'MARKET', 'LIMIT', 'STOP_LIMIT', 'BINARY'));
  END IF;

  -- Create trade_settlement_audit_logs if it doesn't exist
  IF to_regclass('public.trade_settlement_audit_logs') IS NULL THEN
    CREATE TABLE public.trade_settlement_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid REFERENCES public.orders(id),
      user_id uuid REFERENCES auth.users(id),
      admin_id uuid REFERENCES auth.users(id),
      outcome text,
      rationale text,
      supporting_document_url text,
      final_price numeric,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE public.trade_settlement_audit_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can view all audit logs" 
      ON public.trade_settlement_audit_logs 
      FOR SELECT 
      TO authenticated 
      USING (public.is_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = $1)'
    INTO v_is_admin
    USING auth.uid();

    IF v_is_admin THEN
      RETURN true;
    END IF;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name = 'role'
     ) THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = $1 AND role = ''admin'')'
    INTO v_is_admin
    USING auth.uid();

    RETURN v_is_admin;
  END IF;

  RETURN false;
END;
$$;

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
  v_asset_id uuid;
  v_side text;
  v_use_profiles boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF auth.uid() <> p_user_id AND NOT public.is_admin() THEN
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
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
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
  v_credit_amount numeric;
  v_use_profiles boolean;
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

  v_credit_amount := CASE WHEN p_outcome = 'WIN' THEN v_payout ELSE 0 END;

  UPDATE public.orders
  SET status = p_outcome,
      exit_price = p_final_price,
      profit_loss = v_profit,
      updated_at = NOW()
  WHERE id = p_order_id;

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

  IF v_credit_amount > 0 THEN
    IF v_use_profiles THEN
      UPDATE public.profiles
      SET balance_usd = balance_usd + v_credit_amount
      WHERE id = v_order.user_id;
    ELSE
      UPDATE public.wallets
      SET balance = balance + v_credit_amount,
          updated_at = NOW()
      WHERE user_id = v_order.user_id;
    END IF;
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

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    CREATE POLICY "Users can view own orders"
      ON public.orders
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
    CREATE POLICY "Users can create orders"
      ON public.orders
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Public can view OPEN orderbook orders" ON public.orders;
    CREATE POLICY "Public can view OPEN orderbook orders"
      ON public.orders
      FOR SELECT
      TO anon, authenticated
      USING (status = 'OPEN' AND type <> 'binary');

    DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
    CREATE POLICY "Admin can view all orders"
      ON public.orders
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
