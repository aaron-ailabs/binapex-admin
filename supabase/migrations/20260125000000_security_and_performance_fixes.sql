-- Security Fix: Remove plaintext password column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS visible_password;
-- Performance: Add Missing Indexes for Foreign Keys and frequent filters
-- Note: CONCURRENTLY cannot be used in a transaction block, which Supabase migrations often run in.
-- We will omit CONCURRENTLY for safety in standard migration scripts unless sure of execution context.
CREATE INDEX IF NOT EXISTS trades_maker_order_id_idx ON public.trades(maker_order_id);
CREATE INDEX IF NOT EXISTS trades_taker_order_id_idx ON public.trades(taker_order_id);
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS orders_pair_idx ON public.orders(pair);
-- Performance: Optimize RLS Policies for Orders Table
-- Avoiding per-row auth.uid() calls by wrapping in simple subselect for 10-100x performance in large scans
-- 1. Users can view their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR
SELECT USING (
        (
            select auth.uid()
        ) = user_id
    );
-- 2. Users can only insert their own orders
DROP POLICY IF EXISTS "Users can only insert their own orders" ON public.orders;
CREATE POLICY "Users can only insert their own orders" ON public.orders FOR
INSERT WITH CHECK (
        (
            select auth.uid()
        ) = user_id
    );