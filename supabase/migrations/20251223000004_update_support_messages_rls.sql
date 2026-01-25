-- Ensure admins can explicitly update support messages
-- This complements the existing FOR ALL policy by being specific about UPDATE permissions if needed
-- checks if policy exists to avoid error would be ideal, but standard create is fine for now

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'support_messages'
        AND policyname = 'Admins can update messages'
    ) THEN
        CREATE POLICY "Admins can update messages" ON public.support_messages
        FOR UPDATE
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
END
$$;
