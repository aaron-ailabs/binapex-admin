-- Add expiry_at to orders if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS expiry_at TIMESTAMPTZ;

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to clean up stuck/small trades (Backup logic)
CREATE OR REPLACE FUNCTION auto_expire_small_trades()
RETURNS VOID AS $$
BEGIN
  -- Mark expired OPEN trades < $20 as LOSS if they haven't been resolved by Edge Function for > 5 minutes
  UPDATE public.orders
  SET status = 'LOSS',
      profit_loss = -size,
      closed_at = NOW()
  WHERE status = 'OPEN'
    AND size < 20
    AND expiry_at < (NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- Schedule the backup cron (Runs every 10 minutes)
SELECT cron.schedule(
  'auto_expire_small_trades_backup',
  '*/10 * * * *',
  $$SELECT auto_expire_small_trades()$$
);
