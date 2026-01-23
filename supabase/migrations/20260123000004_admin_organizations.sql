-- ============================================================================
-- Admin Organizations View and Functions
-- Provides comprehensive organization management for platform admins
-- ============================================================================

-- Create a view for admin organization management with aggregated data
CREATE OR REPLACE VIEW public.admin_organizations_view AS
SELECT
  c.id,
  c.organization_id,
  c.name,
  c.domain,
  c.industry,
  c.size,
  c.revenue,
  c.description,
  c.logo_url,
  c.website,
  c.linkedin_url,
  c.location,
  c.tags,
  c.enrichment_data,
  c.created_date,
  c.updated_date,
  c.enriched_at,
  -- User counts
  (SELECT COUNT(*) FROM public.users u WHERE u.company_id = c.id) as total_users,
  (SELECT COUNT(*) FROM public.users u WHERE u.company_id = c.id AND u.last_active_at > NOW() - INTERVAL '30 days') as active_users,
  -- Owner info (user with role 'owner' or first admin)
  (SELECT json_build_object(
    'id', u.id,
    'name', u.name,
    'email', u.email,
    'avatar_url', u.avatar_url
   )
   FROM public.users u
   WHERE u.company_id = c.id AND u.role IN ('owner', 'super_admin', 'admin')
   ORDER BY CASE u.role WHEN 'owner' THEN 1 WHEN 'super_admin' THEN 2 ELSE 3 END
   LIMIT 1) as owner,
  -- Subscription info
  (SELECT json_build_object(
    'plan_name', s.plan_name,
    'status', s.status,
    'next_billing_date', s.next_billing_date,
    'billing_cycle', s.billing_cycle
   )
   FROM public.subscriptions s
   WHERE s.company_id = c.id AND s.status = 'active'
   LIMIT 1) as subscription,
  -- CRM stats
  (SELECT COUNT(*) FROM public.prospects p WHERE p.organization_id = c.id) as total_prospects,
  (SELECT COUNT(*) FROM public.customers cu WHERE cu.company_id = c.id) as total_customers,
  -- Determine active status (has users who logged in recently)
  CASE
    WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.company_id = c.id AND u.last_active_at > NOW() - INTERVAL '90 days')
    THEN true
    ELSE false
  END as is_active
FROM public.companies c;

-- Grant access to authenticated users (admin check happens in edge function)
GRANT SELECT ON public.admin_organizations_view TO authenticated;

-- Function to get organization stats for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_get_org_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  SELECT json_build_object(
    'total_organizations', (SELECT COUNT(*) FROM companies),
    'active_organizations', (
      SELECT COUNT(DISTINCT c.id)
      FROM companies c
      WHERE EXISTS (
        SELECT 1 FROM users u
        WHERE u.company_id = c.id
        AND u.last_active_at > NOW() - INTERVAL '90 days'
      )
    ),
    'new_this_month', (SELECT COUNT(*) FROM companies WHERE created_date > DATE_TRUNC('month', NOW())),
    'with_subscription', (SELECT COUNT(DISTINCT company_id) FROM subscriptions WHERE status = 'active'),
    'by_industry', (
      SELECT json_object_agg(COALESCE(industry, 'Unknown'), cnt)
      FROM (SELECT industry, COUNT(*) as cnt FROM companies GROUP BY industry ORDER BY cnt DESC LIMIT 10) i
    ),
    'by_size', (
      SELECT json_object_agg(COALESCE(size, 'Unknown'), cnt)
      FROM (SELECT size, COUNT(*) as cnt FROM companies GROUP BY size) s
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get single organization details
CREATE OR REPLACE FUNCTION public.admin_get_organization(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  SELECT row_to_json(o) INTO result
  FROM admin_organizations_view o
  WHERE o.id = p_org_id;

  RETURN result;
END;
$$;

-- Function to get organization users
CREATE OR REPLACE FUNCTION public.admin_get_organization_users(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  SELECT json_agg(json_build_object(
    'id', u.id,
    'auth_id', u.auth_id,
    'name', u.name,
    'full_name', u.full_name,
    'email', u.email,
    'role', u.role,
    'job_title', u.job_title,
    'avatar_url', u.avatar_url,
    'last_active_at', u.last_active_at,
    'created_at', u.created_at,
    'is_active', CASE WHEN u.last_active_at > NOW() - INTERVAL '30 days' THEN true ELSE false END
  )) INTO result
  FROM users u
  WHERE u.company_id = p_org_id
  ORDER BY u.created_at DESC;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Function to update organization as admin
CREATE OR REPLACE FUNCTION public.admin_update_organization(
  p_org_id UUID,
  p_updates JSONB,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  old_data JSONB;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get old data for audit
  SELECT to_jsonb(c) INTO old_data
  FROM companies c WHERE c.id = p_org_id;

  IF old_data IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Update organization
  UPDATE companies
  SET
    name = COALESCE((p_updates->>'name')::text, name),
    domain = COALESCE((p_updates->>'domain')::text, domain),
    industry = COALESCE((p_updates->>'industry')::text, industry),
    size = COALESCE((p_updates->>'size')::text, size),
    revenue = COALESCE((p_updates->>'revenue')::text, revenue),
    description = COALESCE((p_updates->>'description')::text, description),
    website = COALESCE((p_updates->>'website')::text, website),
    linkedin_url = COALESCE((p_updates->>'linkedin_url')::text, linkedin_url),
    location = COALESCE((p_updates->>'location')::text, location),
    updated_date = NOW()
  WHERE id = p_org_id;

  -- Create audit log if admin_id provided
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, previous_value, new_value, details)
    VALUES (
      p_admin_id,
      'organization_updated',
      'companies',
      p_org_id,
      old_data,
      p_updates,
      jsonb_build_object('updated_fields', (SELECT array_agg(key) FROM jsonb_object_keys(p_updates) AS key))
    );
  END IF;

  -- Return updated organization
  SELECT admin_get_organization(p_org_id) INTO result;

  RETURN result;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_created_date ON public.companies(created_date);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Admin organizations view and functions created successfully';
END $$;
