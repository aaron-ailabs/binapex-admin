-- Migration: Create a backend auditor RPC to inspect the system
-- This will help us identify RLS, Publication, and Schema issues

CREATE OR REPLACE FUNCTION public.audit_backend_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_tables jsonb;
    v_publications jsonb;
    v_policies jsonb;
    v_roles jsonb;
    v_missing jsonb;
BEGIN
    -- 1. Get all tables in public schema and their RLS status
    SELECT jsonb_agg(jsonb_build_object(
        'table_name', tablename,
        'row_security', rowsecurity
    )) INTO v_tables
    FROM pg_tables
    WHERE schemaname = 'public';

    -- 2. Get all tables in supabase_realtime publication
    SELECT jsonb_agg(jsonb_build_object(
        'table_name', tablename
    )) INTO v_publications
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime';

    -- 3. Get all RLS policies for public tables
    SELECT jsonb_agg(jsonb_build_object(
        'table_name', tablename,
        'policy_name', policyname,
        'permissive', permissive,
        'roles', roles,
        'cmd', cmd,
        'qual', qual,
        'with_check', with_check
    )) INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'public';

    -- 4. Get specific roles related to realtime and auth
    SELECT jsonb_agg(jsonb_build_object(
        'rolname', rolname,
        'rolsuper', rolsuper,
        'rolcanlogin', rolcanlogin
    )) INTO v_roles
    FROM pg_roles
    WHERE rolname IN ('authenticated', 'anon', 'service_role', 'supabase_realtime_admin', 'authenticator');

    SELECT COALESCE(jsonb_agg(x.table_name), '[]'::jsonb)
    INTO v_missing
    FROM (
      VALUES
        ('public.orders'),
        ('public.support_conversations'),
        ('public.support_messages'),
        ('public.admin_notifications'),
        ('public.admin_users')
    ) AS x(table_name)
    WHERE to_regclass(x.table_name) IS NULL;

    v_result := jsonb_build_object(
        'tables', v_tables,
        'realtime_publication', v_publications,
        'policies', v_policies,
        'roles', v_roles,
        'missing_tables', v_missing,
        'timestamp', now()
    );

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.reload_postgrest_schema();

CREATE OR REPLACE FUNCTION public.reload_postgrest_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
  RETURN jsonb_build_object('success', true, 'timestamp', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_realtime_publication(
  p_tables text[] DEFAULT ARRAY[
    'public.orders',
    'public.support_conversations',
    'public.support_messages',
    'public.admin_notifications',
    'public.trade_settlement_audit_logs'
  ]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table text;
  v_added text[] := ARRAY[]::text[];
  v_missing_tables text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
  END IF;

  FOREACH v_table IN ARRAY p_tables LOOP
    IF to_regclass(v_table) IS NULL THEN
      v_missing_tables := array_append(v_missing_tables, v_table);
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', v_table);
      v_added := array_append(v_added, v_table);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    WHEN others THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'added', v_added,
    'missing', v_missing_tables,
    'timestamp', now()
  );
END;
$$;

-- Grant execute to service role only (since it's a security definer and returns sensitive metadata)
-- Actually, we can grant it to authenticated if we want to debug from the client, 
-- but service role is safer.
GRANT EXECUTE ON FUNCTION public.audit_backend_system() TO service_role;
GRANT EXECUTE ON FUNCTION public.reload_postgrest_schema() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_realtime_publication(text[]) TO service_role;

-- Ensure admin can view all orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Admins can view all orders'
    ) THEN
        CREATE POLICY "Admins can view all orders" 
            ON public.orders 
            FOR SELECT 
            USING (public.is_admin());
    END IF;
END
$$;

-- Ensure admin can view all audit logs (already added in unification migration, but for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'trade_settlement_audit_logs' AND policyname = 'Admins can view all audit logs'
    ) THEN
        CREATE POLICY "Admins can view all audit logs" 
            ON public.trade_settlement_audit_logs 
            FOR SELECT 
            USING (public.is_admin());
    END IF;
END
$$;

-- Run Realtime publication check
SELECT public.ensure_realtime_publication();
