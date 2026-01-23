-- ============================================================================
-- Admin Users View
-- Provides a comprehensive view of users for admin management
-- ============================================================================

-- Create a view for admin user management with aggregated data
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT
  u.id,
  u.auth_id,
  u.email,
  u.name,
  u.full_name,
  u.avatar_url,
  u.role,
  u.job_title,
  u.company_id,
  u.organization_id,
  u.department_id,
  u.credits,
  u.language,
  u.linkedin_url,
  u.experience_level,
  u.industry,
  u.onboarding_completed,
  u.created_at,
  u.updated_at,
  u.last_active_at,
  c.name as company_name,
  c.domain as company_domain,
  pa.role as platform_admin_role,
  pa.is_active as is_platform_admin,
  CASE
    WHEN u.last_active_at > NOW() - INTERVAL '30 days' THEN true
    ELSE false
  END as is_active_recently
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
LEFT JOIN public.platform_admins pa ON u.auth_id = pa.user_id;

-- Grant access to authenticated users (RLS will handle the rest)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Create function to get user stats for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
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
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users_30d', (SELECT COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '30 days'),
    'new_users_month', (SELECT COUNT(*) FROM users WHERE created_at > DATE_TRUNC('month', NOW())),
    'platform_admins', (SELECT COUNT(*) FROM platform_admins WHERE is_active = true),
    'users_by_role', (
      SELECT json_object_agg(COALESCE(role, 'unknown'), cnt)
      FROM (SELECT role, COUNT(*) as cnt FROM users GROUP BY role) r
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Create function to search users with pagination
CREATE OR REPLACE FUNCTION public.admin_search_users(
  p_search TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
  users_data JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM admin_users_view u
  WHERE (p_search IS NULL OR
         u.email ILIKE '%' || p_search || '%' OR
         u.name ILIKE '%' || p_search || '%' OR
         u.full_name ILIKE '%' || p_search || '%')
    AND (p_role IS NULL OR u.role = p_role)
    AND (p_company_id IS NULL OR u.company_id = p_company_id)
    AND (p_is_active IS NULL OR u.is_active_recently = p_is_active);

  -- Get paginated users
  SELECT json_agg(row_to_json(t))
  INTO users_data
  FROM (
    SELECT
      u.id,
      u.auth_id,
      u.email,
      u.name,
      u.full_name,
      u.avatar_url,
      u.role,
      u.job_title,
      u.company_id,
      u.company_name,
      u.platform_admin_role,
      u.is_platform_admin,
      u.is_active_recently,
      u.credits,
      u.onboarding_completed,
      u.created_at,
      u.last_active_at
    FROM admin_users_view u
    WHERE (p_search IS NULL OR
           u.email ILIKE '%' || p_search || '%' OR
           u.name ILIKE '%' || p_search || '%' OR
           u.full_name ILIKE '%' || p_search || '%')
      AND (p_role IS NULL OR u.role = p_role)
      AND (p_company_id IS NULL OR u.company_id = p_company_id)
      AND (p_is_active IS NULL OR u.is_active_recently = p_is_active)
    ORDER BY
      CASE WHEN p_sort_order = 'asc' THEN
        CASE p_sort_by
          WHEN 'email' THEN u.email
          WHEN 'name' THEN COALESCE(u.full_name, u.name)
          WHEN 'role' THEN u.role
          ELSE NULL
        END
      END ASC NULLS LAST,
      CASE WHEN p_sort_order = 'desc' OR p_sort_order IS NULL THEN
        CASE p_sort_by
          WHEN 'email' THEN u.email
          WHEN 'name' THEN COALESCE(u.full_name, u.name)
          WHEN 'role' THEN u.role
          ELSE NULL
        END
      END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN u.created_at END ASC,
      CASE WHEN p_sort_order = 'desc' OR p_sort_order IS NULL THEN u.created_at END DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  -- Build result
  SELECT json_build_object(
    'users', COALESCE(users_data, '[]'::json),
    'total', total_count,
    'limit', p_limit,
    'offset', p_offset,
    'has_more', (p_offset + p_limit) < total_count
  ) INTO result;

  RETURN result;
END;
$$;

-- Create function to get single user details for admin
CREATE OR REPLACE FUNCTION public.admin_get_user(p_user_id UUID)
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

  SELECT row_to_json(t) INTO result
  FROM (
    SELECT
      u.*,
      (SELECT json_agg(row_to_json(r)) FROM rbac_user_roles r WHERE r.user_id = u.auth_id) as rbac_roles,
      (SELECT json_agg(row_to_json(tm)) FROM team_members tm WHERE tm.user_id = u.auth_id) as team_memberships
    FROM admin_users_view u
    WHERE u.id = p_user_id OR u.auth_id = p_user_id
  ) t;

  RETURN result;
END;
$$;

-- Create function to update user as admin
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID,
  p_updates JSONB,
  p_admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  old_data JSONB;
  allowed_fields TEXT[] := ARRAY['role', 'job_title', 'credits', 'onboarding_completed'];
  update_field TEXT;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get old data for audit
  SELECT to_jsonb(u) INTO old_data
  FROM users u WHERE u.id = p_user_id OR u.auth_id = p_user_id;

  IF old_data IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update only allowed fields
  UPDATE users
  SET
    role = COALESCE((p_updates->>'role')::text, role),
    job_title = COALESCE((p_updates->>'job_title')::text, job_title),
    credits = COALESCE((p_updates->>'credits')::integer, credits),
    onboarding_completed = COALESCE((p_updates->>'onboarding_completed')::boolean, onboarding_completed),
    updated_at = NOW()
  WHERE id = p_user_id OR auth_id = p_user_id;

  -- Create audit log
  INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, previous_value, new_value, details)
  VALUES (
    p_admin_id,
    'user_updated',
    'users',
    p_user_id,
    old_data,
    p_updates,
    jsonb_build_object('updated_fields', (SELECT array_agg(key) FROM jsonb_object_keys(p_updates) AS key))
  );

  -- Return updated user
  SELECT row_to_json(t) INTO result
  FROM (SELECT * FROM admin_users_view WHERE id = p_user_id OR auth_id = p_user_id) t;

  RETURN result;
END;
$$;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Admin users view and functions created successfully';
END $$;
