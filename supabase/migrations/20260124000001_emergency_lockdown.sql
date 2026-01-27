-- EMERGENCY LOCKDOWN: Fix admin_users RLS leak
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- DROP all permissive policies if any
DROP POLICY IF EXISTS "admins_read_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "admins_insert_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "admins_delete_admin_users" ON public.admin_users;
-- CREATE strict policies
CREATE POLICY "admins_read_admin_users" ON public.admin_users FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.admin_users au
            WHERE au.user_id = auth.uid()
        )
    );
CREATE POLICY "admins_manage_admin_users" ON public.admin_users FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
    )
);