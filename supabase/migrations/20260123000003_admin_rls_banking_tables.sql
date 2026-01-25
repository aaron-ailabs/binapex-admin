-- Admin read access for banking tables (deposits/withdrawals)
-- Existing policies only allow the owning user. Admin UI reads these tables directly.
-- Admin membership is checked via SECURITY DEFINER RPC `public.is_admin()`.

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Deposits: admins can read all
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;
CREATE POLICY "Admins can view all deposits" ON public.deposits
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Withdrawals: admins can read all
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals
FOR SELECT
TO authenticated
USING (public.is_admin());

