
DROP FUNCTION IF EXISTS public.reload_postgrest_schema();

CREATE OR REPLACE FUNCTION public.reload_postgrest_schema()
RETURNS void AS $$
BEGIN
  -- This is a placeholder for the actual command to reload the schema.
  -- In a real Supabase environment, this would be:
  -- NOTIFY pgrst, 'reload schema';
  RAISE NOTICE 'PostgREST schema reload requested.';
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

-- Grant usage on the schema to the service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant select on the table to the service_role
GRANT SELECT ON TABLE public.admin_users TO service_role;

-- Reload the schema
SELECT public.reload_postgrest_schema();
