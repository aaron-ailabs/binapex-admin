-- Migration: Fix Transactions RLS Policies for Admin Access
-- Date: 2026-01-12
-- Purpose: Ensure admins can view and manage all transactions (deposits/withdrawals)

-- Drop existing policies
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users create own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins update transactions" ON public.transactions;

-- 1. SELECT: Users can view own transactions, admins can view ALL transactions
CREATE POLICY "Users and admins view transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 2. INSERT: Users can create own transactions
CREATE POLICY "Users create own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Only admins can update transactions (for approval/rejection)
CREATE POLICY "Admins update transactions"
  ON public.transactions FOR UPDATE
  USING (public.is_admin());

-- 4. DELETE: Only admins can delete transactions (for cleanup)
CREATE POLICY "Admins delete transactions"
  ON public.transactions FOR DELETE
  USING (public.is_admin());

-- Add comment for documentation
COMMENT ON TABLE public.transactions IS 'All financial transactions including deposits, withdrawals, bonuses, and adjustments';
