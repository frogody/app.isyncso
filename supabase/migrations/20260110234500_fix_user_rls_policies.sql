-- Fix RLS policies to use auth_id instead of id
-- This resolves 406 errors during user onboarding/updates

-- Update handle_new_user trigger to set auth_id properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users table with auth_id set
  INSERT INTO public.users (id, auth_id, email, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.id,  -- Set auth_id to the same value as id (the auth.users.id)
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop and recreate the UPDATE policy with correct auth_id check
DROP POLICY IF EXISTS "Allow users to update own row" ON public.users;

CREATE POLICY "Allow users to update own row" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Drop and recreate the SELECT policy with correct auth_id check
DROP POLICY IF EXISTS "Allow users to read own row" ON public.users;

CREATE POLICY "Allow users to read own row" ON public.users
  FOR SELECT
  TO public
  USING (auth_id = auth.uid());

-- Fix existing users with NULL auth_id
-- This ensures any existing users can update their profiles
UPDATE public.users
SET auth_id = id
WHERE auth_id IS NULL AND id IS NOT NULL;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates users table entry with proper auth_id when new auth.users record is created';
COMMENT ON POLICY "Allow users to update own row" ON public.users IS 'Users can update their own profile using auth_id';
COMMENT ON POLICY "Allow users to read own row" ON public.users IS 'Users can read their own profile using auth_id';
