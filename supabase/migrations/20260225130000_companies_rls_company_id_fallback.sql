-- Fix companies RLS: add company_id-based access fallback
-- Users with company_id set on their profile can access their company
-- even if organization_id is null

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.users WHERE id = auth.uid() $$;

-- Allow users to access their own company via company_id
CREATE POLICY "Users can access own company" ON public.companies
FOR ALL TO authenticated
USING (id = get_user_company_id())
WITH CHECK (id = get_user_company_id());

-- Update INSERT policy to also allow company_id-based org matching
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (organization_id = auth_organization_id() OR organization_id = get_user_company_id());
