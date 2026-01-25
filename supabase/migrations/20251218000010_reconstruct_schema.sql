-- Migration: Reconstruct Schema for Trading Engine (Refined)

-- 1. Rename and Modify orders table
ALTER TABLE IF EXISTS public.limit_orders RENAME TO orders;

-- Add 'pair' column first to migrate data
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pair VARCHAR(20);

-- Migrate data from trading_pairs if possible (Best effort)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'trading_pair_id') THEN
    UPDATE public.orders o
    SET pair = tp.symbol
    FROM public.trading_pairs tp
    WHERE o.trading_pair_id = tp.id;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Now drop the old column
ALTER TABLE public.orders DROP COLUMN IF EXISTS trading_pair_id CASCADE;

-- Other column modifications
ALTER TABLE public.orders 
  DROP COLUMN IF EXISTS remaining_amount,
  DROP COLUMN IF EXISTS total_fee,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS trigger_price DECIMAL(18, 8), -- For STOP_LIMIT
  ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(10, 6) DEFAULT 0.006, -- .6% default
  ALTER COLUMN status TYPE VARCHAR(20),
  ALTER COLUMN filled_amount SET DEFAULT 0.00;

-- Rename fee_percentage to fee_rate if exists
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fee_percentage') THEN
    ALTER TABLE public.orders RENAME COLUMN fee_percentage TO fee_rate;
  END IF;
END $$;

-- 2. Rename and Modify trades table
ALTER TABLE IF EXISTS public.executed_trades RENAME TO trades;

-- Reconstruct trades columns (Strict reset as requested or nullable mapping)
-- Since logic is completely changing to 'maker/taker', strict mapping is hard without context.
-- We will add the new columns and drop the old specific ones to match requirements.
ALTER TABLE public.trades
  DROP COLUMN IF EXISTS buy_order_id CASCADE,
  DROP COLUMN IF EXISTS sell_order_id CASCADE,
  DROP COLUMN IF EXISTS buyer_id,
  DROP COLUMN IF EXISTS seller_id,
  DROP COLUMN IF EXISTS trading_pair_id,
  DROP COLUMN IF EXISTS buyer_fee,
  DROP COLUMN IF EXISTS seller_fee;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS maker_order_id UUID REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS taker_order_id UUID REFERENCES public.orders(id),
  ALTER COLUMN executed_at SET DEFAULT NOW();

-- 3. Modify wallets table
-- Rename asset_symbol to asset to PRESERVE BALANCES
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'asset_symbol') THEN
    ALTER TABLE public.wallets RENAME COLUMN asset_symbol TO asset;
  END IF;
  
  -- If 'asset' doesn't exist yet but 'asset_symbol' didn't exist (fresh table?), add it.
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'asset') THEN
    ALTER TABLE public.wallets ADD COLUMN asset VARCHAR(20);
  END IF;
END $$;

-- Rename available_balance to balance
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'available_balance') THEN
    ALTER TABLE public.wallets RENAME COLUMN available_balance TO balance;
  END IF;
END $$;

ALTER TABLE public.wallets
  DROP COLUMN IF EXISTS total_balance; 

-- Update constraint (unique user+asset)
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS unique_user_asset;
-- Re-add constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_asset_key') THEN
        ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_asset_key UNIQUE (user_id, asset);
    END IF;
END $$;

-- 4. Create market_metrics table
CREATE TABLE IF NOT EXISTS public.market_metrics (
  pair VARCHAR(20) PRIMARY KEY,
  volume_24h DECIMAL(20, 8) DEFAULT 0,
  change_1h DECIMAL(10, 2) DEFAULT 0,
  change_24h DECIMAL(10, 2) DEFAULT 0,
  market_cap DECIMAL(20, 2) DEFAULT 0
);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only insert their own orders" ON public.orders;
CREATE POLICY "Users can only insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view OPEN orders" ON public.orders;
CREATE POLICY "Public can view OPEN orders" ON public.orders
  FOR SELECT USING (status = 'OPEN');

-- Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.orders, public.market_metrics;
COMMIT;
