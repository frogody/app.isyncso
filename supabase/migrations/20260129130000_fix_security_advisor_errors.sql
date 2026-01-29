-- Fix 5 Supabase Security Advisor errors
-- 1. client_folders: RLS policies exist but RLS not enabled
-- 2-4. Three views using SECURITY DEFINER instead of INVOKER

-- Enable RLS on client_folders (policies already exist but are dormant)
ALTER TABLE public.client_folders ENABLE ROW LEVEL SECURITY;

-- Switch views from SECURITY DEFINER to SECURITY INVOKER
ALTER VIEW public.crm_companies_with_contacts SET (security_invoker = on);
ALTER VIEW public.admin_users_view SET (security_invoker = on);
ALTER VIEW public.admin_organizations_view SET (security_invoker = on);
