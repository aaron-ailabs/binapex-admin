-- ============================================
-- ENABLE RLS ON PROFILES AND GRANT ADMIN ACCESS
-- ============================================

-- 1. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. "Public View Basic Creds" (Actually, better to be strict)
-- Only allow users to see their own profile.
-- Admin can see everyone.

DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
-- Removing general public read, replacing with stricter version.

DROP POLICY IF EXISTS "Users View Own Profile" ON public.profiles;
CREATE POLICY "Users View Own Profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" 
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. ADMIN FULL ACCESS
DROP POLICY IF EXISTS "Admin Full Access Profiles" ON public.profiles;
CREATE POLICY "Admin Full Access Profiles" 
ON public.profiles FOR ALL 
USING (public.is_admin());

-- 4. INSERT
-- Usually handled by Trigger on Auth, but if manual insert needed:
DROP POLICY IF EXISTS "Users Insert Own Profile" ON public.profiles;
CREATE POLICY "Users Insert Own Profile" 
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Helper function is_admin() must be accessible
-- Usually GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
