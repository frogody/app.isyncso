-- ============================================
-- Fix RLS policies that incorrectly used auth_id instead of id
-- The auth_id column was NULL for all users, causing RLS to block all operations
-- ============================================

-- Fix users UPDATE policy
DROP POLICY IF EXISTS "Allow users to update own row" ON public.users;
CREATE POLICY "Allow users to update own row" ON public.users
FOR UPDATE TO authenticated
USING (auth_uid() = id)
WITH CHECK (auth_uid() = id);

-- Fix get_user_organization_id function
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT organization_id FROM users WHERE id = public.auth_uid() LIMIT 1 $$;

-- Fix user_belongs_to_org function
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM users WHERE id = public.auth_uid() AND organization_id = org_id) $$;

-- Add company INSERT policy for new users during onboarding
CREATE POLICY IF NOT EXISTS "Authenticated users can create companies" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix existing users who have NULL auth_id
UPDATE public.users SET auth_id = id WHERE auth_id IS NULL;
