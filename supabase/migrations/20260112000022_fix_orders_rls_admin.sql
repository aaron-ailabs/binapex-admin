-- Migration: Fix Orders RLS Policies for Admin Access
-- Date: 2026-01-12
-- Purpose: Allow admins to view, update, and manage all orders (including binary trades from trader portal)

-- Drop existing restrictive policies that block admin access
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view OPEN orders" ON public.orders;
DROP POLICY IF EXISTS "Users View Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Users Create Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Users Cancel Own Orders" ON public.orders;

-- Create new policies with admin access using is_admin() function

-- 1. SELECT: Users can view own orders, admins can view ALL orders
CREATE POLICY "Users and admins can view orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 2. INSERT: Users can create own orders
CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update own orders, admins can update ALL orders
CREATE POLICY "Users can update own orders, admins can update all"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

-- 4. DELETE: Only admins can delete orders
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- Add comment for documentation
COMMENT ON TABLE public.orders IS 'Unified orders table for market orders, limit orders, and binary options trades';
