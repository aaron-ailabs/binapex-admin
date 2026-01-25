-- Migration script: Move existing admins from profiles.role to admin_users table
-- Run this AFTER deploying the admin_users table migration
-- This script is idempotent (safe to run multiple times)

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

-- Step 2: Log the migration
INSERT INTO audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
)
SELECT
    auth.uid() as admin_id,
    'migrate_admin_users' as action,
    'system' as target_type,
    NULL as target_id,
    jsonb_build_object(
        'migrated_count', (
            SELECT COUNT(*) FROM profiles WHERE role = 'admin'
        ),
        'timestamp', NOW()
    ) as details,
    'migration_script' as ip_address;

-- Step 3: Verify the migration
SELECT
    'Total admins in profiles' as metric,
    COUNT(*) as count
FROM profiles
WHERE role = 'admin'
UNION ALL
SELECT
    'Total admins in admin_users' as metric,
    COUNT(*) as count
FROM admin_users;

-- Step 4: Optional - Remove role column from profiles (after verification)
-- ALTER TABLE profiles DROP COLUMN role;

-- Step 5: Optional - Update RLS policies to remove role dependency
-- DROP POLICY IF EXISTS "admins can view all profiles" ON profiles;
-- CREATE POLICY "admins can view all profiles"
-- ON profiles FOR SELECT
-- USING (
--     EXISTS (
--         SELECT 1 FROM admin_users au
--         WHERE au.user_id = auth.uid()
--     )
-- );
