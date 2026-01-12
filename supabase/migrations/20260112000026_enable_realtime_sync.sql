-- Migration: Enable Real-time Sync for Admin Portal
-- Date: 2026-01-12
-- Purpose: Ensure orders and transactions are in realtime publication for instant admin portal updates

-- Add tables to supabase_realtime publication if not already added
DO $$
BEGIN
  -- Check if publication exists, create if not
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add orders table to realtime (safe - won't error if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Add transactions table to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
END $$;

-- Add trade_settlement_audit_logs to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trade_settlement_audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_settlement_audit_logs;
  END IF;
END $$;

-- Add admin_notifications to realtime (if exists)
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

-- Add wallets to realtime for balance updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  END IF;
END $$;

-- Enable replica identity for proper realtime updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.trade_settlement_audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.wallets REPLICA IDENTITY FULL;

-- Add comment for documentation
COMMENT ON PUBLICATION supabase_realtime IS 'Real-time publication for instant admin portal updates';
