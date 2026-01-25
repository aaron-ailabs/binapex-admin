-- Migration script: Move existing admins from profiles.role to admin_users table
-- Run this AFTER deploying the admin_users table migration

-- Step 1: Insert existing admins into admin_users table
INSERT INTO admin_users (user_id, created_by)
SELECT 
    p.id as user_id,
    p.id as created_by
FROM profiles p
WHERE p.role = 'admin'
  -- Only insert if not already exists
  AND NOT EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = p.id
  );

-- Step 2: Update RLS policies to use admin_users table instead of profiles.role
-- This is critical for RPCs like admin_list_users to work

-- 1. Profiles policy
DROP POLICY IF EXISTS "admins can view all profiles" ON profiles;
CREATE POLICY "admins can view all profiles" 
ON profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM admin_users au 
        WHERE au.user_id = auth.uid()
    )
);

-- 2. Audit logs policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM admin_users
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM admin_users
            WHERE user_id = auth.uid()
        )
    );
