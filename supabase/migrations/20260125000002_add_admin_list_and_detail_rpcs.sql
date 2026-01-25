-- Migration: Add Admin List and Detail RPCs
-- Date: 2026-01-25
-- Description: Adds RPCs for listing users and getting user details for the admin portal.
-- 1. RPC: Admin List Users
CREATE OR REPLACE FUNCTION admin_list_users(
        page_num INTEGER DEFAULT 1,
        page_size INTEGER DEFAULT 50,
        search_email TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE caller_id UUID;
result JSONB;
p_offset INTEGER;
total_count INTEGER;
BEGIN -- Get caller ID
caller_id := auth.uid();
-- Check if caller is an admin
IF NOT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = caller_id
) THEN RETURN jsonb_build_object(
    'data',
    '[]'::jsonb,
    'error',
    'Unauthorized: Caller is not an admin'
);
END IF;
-- Calculate offset
p_offset := (page_num - 1) * page_size;
-- Get Total Count
SELECT COUNT(*) INTO total_count
FROM profiles
WHERE (
        search_email IS NULL
        OR email ILIKE '%' || search_email || '%'
    );
-- Get Data
SELECT jsonb_agg(t) INTO result
FROM (
        SELECT id,
            email,
            full_name,
            role,
            status,
            created_at,
            total_count AS total_count_field -- passing total count in each row simplifies frontend usage or we can return separate object
        FROM profiles
        WHERE (
                search_email IS NULL
                OR email ILIKE '%' || search_email || '%'
            )
        ORDER BY created_at DESC
        LIMIT page_size OFFSET p_offset
    ) t;
-- If no results, jsonb_agg returns null, fix it to []
IF result IS NULL THEN result := '[]'::jsonb;
END IF;
-- We construct the response to match the expected interface, but wait, the RPC usually returns just the data rows or a specific structure.
-- The frontend expects { data: [], error: null } wrapper in the client code, but the RPC itself returns the data.
-- However, looking at the previous RPCs, they return JSONB directly.
-- Let's stick to returning the list of users directly as JSONB, and let the frontend handle the count if possible, 
-- OR return a wrapper object { data: [...], count: N }. 
-- The `admin-rpc.ts` `adminListUsers` expects `data: AdminUserListItem[]`. 
-- If I return just the array, I lose the total count for pagination. 
-- Let's inject total_count into every row for simplicity as done in the query above (hacky but effective for small scale)
-- OR better, update the RPC signature to return a wrapper.
-- But `admin-rpc.ts` says: `const { data, error } = await supabase.rpc('admin_list_users', ...)`
-- usage: `return { data: data || [], error: null }`
-- This implies `data` from supabase client is the return value of the function.
-- So if the function returns `[{...}, {...}]`, `data` will be that array.
-- I will stick to the query above which selects `total_count` from variable but wait, I can't select variable in the subquery easily without a join or window function.
-- Improved Query with Window Function for Count
SELECT jsonb_agg(t) INTO result
FROM (
        SELECT id,
            email,
            full_name,
            role,
            status,
            created_at,
            COUNT(*) OVER() as total_count
        FROM profiles
        WHERE (
                search_email IS NULL
                OR email ILIKE '%' || search_email || '%'
            )
        ORDER BY created_at DESC
        LIMIT page_size OFFSET p_offset
    ) t;
IF result IS NULL THEN result := '[]'::jsonb;
END IF;
RETURN result;
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
-- 2. RPC: Admin Get User Detail
CREATE OR REPLACE FUNCTION admin_get_user_detail(target_user_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE caller_id UUID;
result JSONB;
BEGIN -- Get caller ID
caller_id := auth.uid();
-- Check if caller is an admin
IF NOT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = caller_id
) THEN RETURN jsonb_build_object(
    'error',
    'Unauthorized: Caller is not an admin'
);
END IF;
-- Fetch details
-- We need to join profiles with auth.users to get last_sign_in_at
SELECT jsonb_agg(t) INTO result
FROM (
        SELECT p.id AS user_id,
            p.email,
            p.full_name,
            p.role,
            p.status,
            p.created_at,
            u.last_sign_in_at AS last_login
        FROM profiles p
            LEFT JOIN auth.users u ON p.id = u.id
        WHERE p.id = target_user_id
    ) t;
IF result IS NULL THEN result := '[]'::jsonb;
END IF;
RETURN result;
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_list_users(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users(INTEGER, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_user_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_detail(UUID) TO service_role;