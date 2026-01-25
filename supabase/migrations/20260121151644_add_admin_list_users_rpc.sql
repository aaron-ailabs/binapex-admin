-- Create RPC function to list users for admin dashboard
DROP FUNCTION IF EXISTS admin_list_users(INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION admin_list_users(
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    total_count_val INTEGER;
BEGIN
    -- Check if caller is admin
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can list users';
    END IF;

    -- Calculate total count with filter
    SELECT COUNT(*) INTO total_count_val
    FROM profiles p
    WHERE (search_email IS NULL OR p.email ILIKE '%' || search_email || '%');

    -- Return the user list
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.status,
        p.created_at,
        total_count_val
    FROM profiles p
    WHERE (search_email IS NULL OR p.email ILIKE '%' || search_email || '%')
    ORDER BY p.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION admin_list_users(INTEGER, INTEGER, TEXT) TO authenticated;
