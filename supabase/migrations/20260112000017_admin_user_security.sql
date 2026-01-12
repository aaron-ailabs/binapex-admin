-- =============================================
-- ADMIN USER SECURITY ENHANCEMENTS
-- =============================================
-- 1. ADD VISIBLE PASSWORD COLUMN (If not exists)
-- This stores the plaintext password for Admin viewing as requested.
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'visible_password'
) THEN
ALTER TABLE public.profiles
ADD COLUMN visible_password TEXT;
END IF;
END $$;
-- 2. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    -- Nullable if action is generic
    action VARCHAR(50) NOT NULL,
    -- e.g. 'PASSWORD_RESET', 'USER_BAN', 'USER_UPDATE'
    details JSONB,
    -- Previous values, new values, reasoning, etc.
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- 3. ENSURE PROFILES HAVE ROLE (Already in schema but good to verify)
-- Just a comment/check. 'role' column acts as our RBAC base.