
CREATE OR REPLACE FUNCTION public.verify_admin_user_by_email(p_email text)
RETURNS boolean AS $$
DECLARE
    v_user_id UUID;
    v_is_admin boolean;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;

    -- If user not found, return false
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if the user ID exists in public.admin_users
    SELECT TRUE INTO v_is_admin
    FROM public.admin_users
    WHERE user_id = v_user_id;

    -- If no record found in admin_users, v_is_admin will be NULL, so default to FALSE
    RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.verify_admin_user_by_email(text) TO service_role;
