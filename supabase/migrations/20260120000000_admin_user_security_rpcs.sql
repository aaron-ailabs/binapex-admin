-- ============================================
-- ADMIN USER SECURITY RPC FUNCTIONS
-- Created: 2026-01-20
-- Purpose: Implements secure admin-only functions for user password reset and ban management
-- ============================================

-- Function 1: admin_reset_user_password
-- Allows admins to reset a user's password securely
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    v_caller_profile RECORD;
BEGIN
    -- 1. Verify caller is admin
    SELECT role INTO v_caller_profile
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_profile.role IS NULL OR v_caller_profile.role != 'admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Forbidden: Admin access required'
        );
    END IF;

    -- 2. Verify target user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- 3. Update user password in auth.users
    -- Note: This uses Supabase's encrypted_password field
    UPDATE auth.users
    SET
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password reset successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.admin_reset_user_password IS
'Admin-only function to reset a user password. Verifies caller has admin role before proceeding.';


-- Function 2: admin_ban_user
-- Allows admins to ban/unban users with duration
CREATE OR REPLACE FUNCTION public.admin_ban_user(
    target_user_id UUID,
    duration_hours INTEGER  -- NULL means unban
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    v_caller_profile RECORD;
    v_ban_until TIMESTAMPTZ;
BEGIN
    -- 1. Verify caller is admin
    SELECT role INTO v_caller_profile
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_profile.role IS NULL OR v_caller_profile.role != 'admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Forbidden: Admin access required'
        );
    END IF;

    -- 2. Verify target user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- 3. Calculate ban expiry time
    IF duration_hours IS NULL THEN
        -- Unban - set to NULL
        v_ban_until := NULL;
    ELSE
        -- Ban for specified duration
        v_ban_until := NOW() + (duration_hours || ' hours')::INTERVAL;
    END IF;

    -- 4. Ensure banned_until column exists, add if not
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'banned_until'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN banned_until TIMESTAMPTZ DEFAULT NULL;

        CREATE INDEX IF NOT EXISTS idx_profiles_banned_until
        ON public.profiles(banned_until)
        WHERE banned_until IS NOT NULL;
    END IF;

    -- 5. Update user ban status
    UPDATE public.profiles
    SET
        banned_until = v_ban_until,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- 6. If banning, also disable their auth session
    IF duration_hours IS NOT NULL THEN
        -- Update auth.users to mark account as banned
        UPDATE auth.users
        SET
            banned_until = v_ban_until,
            updated_at = NOW()
        WHERE id = target_user_id;
    ELSE
        -- Unbanning - clear the ban
        UPDATE auth.users
        SET
            banned_until = NULL,
            updated_at = NOW()
        WHERE id = target_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN duration_hours IS NULL THEN 'User unbanned successfully'
            ELSE format('User banned until %s', v_ban_until::TEXT)
        END,
        'banned_until', v_ban_until
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID, INTEGER) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.admin_ban_user IS
'Admin-only function to ban or unban a user. Pass NULL for duration_hours to unban. Verifies caller has admin role before proceeding.';
