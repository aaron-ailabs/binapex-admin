-- Temporary migration to seed admin user and check state
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- 1. Find the admin user ID
    SELECT id INTO v_admin_id FROM auth.users WHERE email IN ('admin88@binapex.my', 'e2e_polished@binapex.test');
    
    IF v_admin_id IS NOT NULL THEN
        -- 2. Add to admin_users
        INSERT INTO public.admin_users (user_id)
        VALUES (v_admin_id)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Admin user (ID: %) added to admin_users table.', v_admin_id;
    ELSE
        RAISE NOTICE 'No matching admin user found in auth.users.';
    END IF;
END
$$;
