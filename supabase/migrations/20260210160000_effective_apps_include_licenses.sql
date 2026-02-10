-- Update get_user_effective_apps to be license-driven
-- ALL users (including admins) only see apps their company has licensed
-- Base apps (Dashboard, CRM, Products, Projects, Inbox) are handled in frontend nav

CREATE OR REPLACE FUNCTION public.get_user_effective_apps(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_team_apps TEXT[];
  v_license_apps TEXT[];
  v_all_apps TEXT[];
BEGIN
  -- Get user's company_id
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE id = p_user_id;

  -- Get apps from team memberships
  SELECT ARRAY_AGG(DISTINCT taa.app_name) INTO v_team_apps
  FROM public.team_members tm
  JOIN public.team_app_access taa ON tm.team_id = taa.team_id
  WHERE tm.user_id = p_user_id
  AND taa.is_enabled = true;

  -- Get apps from active company licenses (maps platform_apps.slug to sidebar app id)
  IF v_company_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT LOWER(pa.slug)) INTO v_license_apps
    FROM public.app_licenses al
    JOIN public.platform_apps pa ON al.app_id = pa.id
    WHERE al.company_id = v_company_id
    AND al.status = 'active';
  END IF;

  -- Union both sources
  v_team_apps := COALESCE(v_team_apps, ARRAY[]::TEXT[]);
  v_license_apps := COALESCE(v_license_apps, ARRAY[]::TEXT[]);

  SELECT ARRAY_AGG(DISTINCT app) INTO v_all_apps
  FROM unnest(v_team_apps || v_license_apps) AS app;

  RETURN COALESCE(v_all_apps, ARRAY[]::TEXT[]);
END;
$$;

-- Also update user_has_app_access to check licenses (no admin override)
CREATE OR REPLACE FUNCTION public.user_has_app_access(p_user_id UUID, p_app_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Check team_app_access
  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_app_access taa ON tm.team_id = taa.team_id
    WHERE tm.user_id = p_user_id
    AND taa.app_name = p_app_name
    AND taa.is_enabled = true
  ) THEN
    RETURN true;
  END IF;

  -- Check company licenses
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE id = p_user_id;

  IF v_company_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.app_licenses al
      JOIN public.platform_apps pa ON al.app_id = pa.id
      WHERE al.company_id = v_company_id
      AND al.status = 'active'
      AND LOWER(pa.slug) = LOWER(p_app_name)
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;
