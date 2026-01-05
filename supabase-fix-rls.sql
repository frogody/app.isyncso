-- ============================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- ============================================

-- First, let's see what's in the users table
-- SELECT * FROM public.users LIMIT 5;

-- Check if the id column is UUID type
-- If not, this could be the issue

-- 1. Disable RLS temporarily to allow all operations
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on users table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- 3. Make sure the id column can match auth.uid()
-- First check if there's a user with this ID in auth.users
-- INSERT the current authenticated user if they don't exist
INSERT INTO public.users (id, email, full_name, onboarding_completed, created_at)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
    false,
    NOW()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, permissive policies
CREATE POLICY "Allow users to read own row"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow users to insert own row"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update own row"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Also fix user_app_configs table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_app_configs') THEN
        ALTER TABLE public.user_app_configs ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow users to read own configs" ON public.user_app_configs;
        DROP POLICY IF EXISTS "Allow users to insert own configs" ON public.user_app_configs;
        DROP POLICY IF EXISTS "Allow users to update own configs" ON public.user_app_configs;

        CREATE POLICY "Allow users to read own configs"
        ON public.user_app_configs FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);

        CREATE POLICY "Allow users to insert own configs"
        ON public.user_app_configs FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Allow users to update own configs"
        ON public.user_app_configs FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 7. Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_app_configs TO authenticated;

-- 8. Verify - this should show your policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
