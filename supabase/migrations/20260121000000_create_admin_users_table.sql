-- Create admin_users table for dedicated admin access control
-- This table removes the dependency on profiles.role for admin authorization

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can read all admin_users records
CREATE POLICY "admins_read_admin_users"
ON admin_users
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
    )
);

-- Only admins can insert new admin_users (via admin app)
CREATE POLICY "admins_insert_admin_users"
ON admin_users
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
    )
);

-- Only admins can delete admin_users (via admin app)
CREATE POLICY "admins_delete_admin_users"
ON admin_users
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
    )
);

-- Create index for performance
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);

-- Create function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = $1
    );
$$;

-- Create function to get user role (for backward compatibility during migration)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        CASE
            WHEN EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN 'admin'
            ELSE 'trader'
        END;
$$;

-- Migration note: After deploying this migration, you should:
-- 1. Manually insert existing admins into admin_users table
-- 2. Update admin app to use admin_users table instead of profiles.role
-- 3. Update trader app to remove admin role checks (already done)
-- 4. Eventually remove profiles.role column (after full migration)

-- Example: Insert existing admins (run manually after deployment)
-- INSERT INTO admin_users (user_id, created_by)
-- SELECT id, id FROM profiles WHERE role = 'admin';
