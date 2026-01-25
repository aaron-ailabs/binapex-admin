-- Migration: Admin User Management RPCs
-- Date: 2026-01-25
-- Description: Adds RPCs for updating user roles and freezing/unfreezing accounts.
-- 1. RPC: Admin Update User Role
CREATE OR REPLACE FUNCTION admin_update_user_role(target_user_id UUID, new_role TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE caller_id UUID;
is_super BOOLEAN;
result JSONB;
BEGIN -- Get caller ID
caller_id := auth.uid();
-- Check if caller is an admin
-- We assume anyone in admin_users table is an admin with permission to manage users for now.
-- TODO: Refine for Super Admin if distinction exists in admin_users schema.
IF NOT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = caller_id
) THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'Unauthorized: Caller is not an admin'
);
END IF;
-- Update profiles table
UPDATE profiles
SET role = new_role,
    updated_at = NOW()
WHERE id = target_user_id;
-- Return success
RETURN jsonb_build_object(
    'success',
    true,
    'message',
    'User role updated successfully'
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
-- 2. RPC: Admin Freeze User
CREATE OR REPLACE FUNCTION admin_freeze_user(
        target_user_id UUID,
        should_freeze BOOLEAN
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE caller_id UUID;
new_status TEXT;
BEGIN -- Get caller ID
caller_id := auth.uid();
-- Check if caller is an admin
IF NOT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = caller_id
) THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'Unauthorized: Caller is not an admin'
);
END IF;
-- Determine new status
IF should_freeze THEN new_status := 'frozen';
ELSE new_status := 'active';
-- or 'verified'? Assuming 'active' is the standard non-frozen state.
END IF;
-- Update profiles table
UPDATE profiles
SET status = new_status,
    updated_at = NOW()
WHERE id = target_user_id;
RETURN jsonb_build_object(
    'success',
    true,
    'message',
    'User status updated to ' || new_status
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_freeze_user(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_freeze_user(UUID, BOOLEAN) TO service_role;