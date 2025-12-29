-- ============================================
-- UPDATE USER TRIGGER TO CAPTURE PASSWORD
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
DECLARE
  extracted_password text;
BEGIN
  -- Try to get visible_password from metadata
  extracted_password := new.raw_user_meta_data->>'visible_password';

  -- Default fallback if empty (usually for old users or different auth methods)
  -- But we don't want to overwrite if null, actually we do want to store what we have.
  
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    visible_password
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'user', -- Default role
    extracted_password -- Save the password passed in metadata
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    -- Only update visible_password if the new one is not null
    visible_password = COALESCE(EXCLUDED.visible_password, public.profiles.visible_password);

  RETURN new;
END;
$$;

-- Ensure trigger exists (idempotent check)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions explicitly just in case
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.profiles TO service_role;
