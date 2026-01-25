-- Lock down permissive profiles SELECT policy.
-- Replace any broad "USING (true)" read with:
-- - user can read own profile
-- - admins can read all profiles (via SECURITY DEFINER `is_admin()` RPC)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove known-bad permissive policy name created by older migrations.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Ensure no stale permissive policy variants remain (defensive).
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_admin()
);

