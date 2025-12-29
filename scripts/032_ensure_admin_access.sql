-- ============================================
-- ADMIN ACCESS & RLS ENFORCEMENT FIX
-- ============================================

-- 1. Ensure public.is_admin() function exists and is robust
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has the 'admin' role in public.profiles
  -- OR via helper RPC 'get_user_role' logic if implemented
  -- Here we check profiles directly as it's the source of truth for our RBAC
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 2. HARDEN RLS POLICIES ON profiles
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Strict Policies
-- A. VIEW: Admin sees ALL; User sees OWN
DROP POLICY IF EXISTS "Admin Full View Profiles" ON public.profiles;
CREATE POLICY "Admin Full View Profiles" 
ON public.profiles FOR SELECT 
USING (public.is_admin());

DROP POLICY IF EXISTS "Users View Own Profile" ON public.profiles;
CREATE POLICY "Users View Own Profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id AND NOT public.is_admin()); -- Optimization: Admin uses above policy

-- B. UPDATE: Admin updates ALL; User updates OWN
DROP POLICY IF EXISTS "Admin Full Update Profiles" ON public.profiles;
CREATE POLICY "Admin Full Update Profiles" 
ON public.profiles FOR UPDATE
USING (public.is_admin());

DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" 
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- C. INSERT: Admin inserts ANY; User inserts OWN
DROP POLICY IF EXISTS "Admin Full Insert Profiles" ON public.profiles;
CREATE POLICY "Admin Full Insert Profiles" 
ON public.profiles FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users Insert Own Profile" ON public.profiles;
CREATE POLICY "Users Insert Own Profile" 
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- D. DELETE: Admin DELETE ANY
DROP POLICY IF EXISTS "Admin Full Delete Profiles" ON public.profiles;
CREATE POLICY "Admin Full Delete Profiles" 
ON public.profiles FOR DELETE
USING (public.is_admin());

-- 4. Verify Columns (Idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visible_password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawal_password TEXT;

-- 5. Grant Permissions (just in case)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
