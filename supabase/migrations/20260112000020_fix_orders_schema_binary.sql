-- Migration: Fix Orders Schema for Binary Trading Support
-- Date: 2026-01-12
-- Purpose: Add missing columns for binary options trading and migrate existing data

-- 1. Add missing binary trading columns
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

-- 2. Add constraint for direction
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_direction_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_direction_check
  CHECK (direction IS NULL OR direction IN ('UP', 'DOWN'));

-- 3. Update type constraint to include 'binary'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_type_check
  CHECK (type IN ('market', 'limit', 'binary', 'stop_limit'));

-- 4. Migrate existing data
-- Copy 'size' to 'amount' for binary trades if amount is null
UPDATE public.orders
SET amount = size
WHERE amount IS NULL
  AND type = 'binary'
  AND size IS NOT NULL;

-- Copy 'leverage' to 'payout_rate' for binary trades if payout_rate is null
UPDATE public.orders
SET payout_rate = leverage
WHERE payout_rate IS NULL
  AND type = 'binary'
  AND leverage IS NOT NULL;

-- Copy 'price' to 'strike_price' for binary trades if strike_price is null
UPDATE public.orders
SET strike_price = price
WHERE strike_price IS NULL
  AND type = 'binary'
  AND price IS NOT NULL;

-- Copy 'price' to 'entry_price' for binary trades if entry_price is null
UPDATE public.orders
SET entry_price = price
WHERE entry_price IS NULL
  AND type = 'binary'
  AND price IS NOT NULL;

-- Copy 'expiry_at' to 'end_time' if end_time is null
UPDATE public.orders
SET end_time = expiry_at
WHERE end_time IS NULL
  AND expiry_at IS NOT NULL;

-- 5. Get asset_symbol from asset_id (if assets table exists and asset_symbol is null)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
    UPDATE public.orders o
    SET asset_symbol = a.symbol
    FROM public.assets a
    WHERE o.asset_id = a.id
      AND o.asset_symbol IS NULL
      AND o.asset_id IS NOT NULL;
  END IF;
END $$;

-- 6. Map side to direction for binary trades
UPDATE public.orders
SET direction = CASE
  WHEN side = 'buy' THEN 'UP'
  WHEN side = 'sell' THEN 'DOWN'
  ELSE direction
END
WHERE type = 'binary'
  AND direction IS NULL
  AND side IS NOT NULL;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expiry_at ON public.orders(expiry_at) WHERE expiry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON public.orders(type, status);

-- 8. Add comment for documentation
COMMENT ON COLUMN public.orders.asset_symbol IS 'Trading symbol (e.g., BTC-USD) for binary options';
COMMENT ON COLUMN public.orders.direction IS 'UP or DOWN for binary options trades';
COMMENT ON COLUMN public.orders.amount IS 'Investment amount for binary options';
COMMENT ON COLUMN public.orders.payout_rate IS 'Payout percentage for winning binary trades';
COMMENT ON COLUMN public.orders.strike_price IS 'Entry price for binary options';
COMMENT ON COLUMN public.orders.entry_price IS 'Actual execution price';
COMMENT ON COLUMN public.orders.exit_price IS 'Settlement/close price';
COMMENT ON COLUMN public.orders.end_time IS 'When the binary option expires';
COMMENT ON COLUMN public.orders.profit_loss IS 'Calculated profit or loss after settlement';
COMMENT ON COLUMN public.orders.closed_at IS 'Timestamp when trade was settled';
