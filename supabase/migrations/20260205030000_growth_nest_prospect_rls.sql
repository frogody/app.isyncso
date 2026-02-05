-- Allow authenticated users to read platform-owned prospects from nest uploads.
-- These prospects have organization_id IS NULL because they're marketplace nest data
-- shared across organizations. Without this policy, the prospects() join in
-- growth_nest_items queries returns null due to existing org-scoped RLS.

CREATE POLICY "growth_nest_prospect_read" ON public.prospects
  FOR SELECT TO authenticated
  USING (source = 'nest_upload' AND organization_id IS NULL);
