-- App Store / Licensing Module Migration
-- Phase 5: Platform App Store Management
-- Note: Tables already exist, this migration adds helper functions and seed data

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Check if a company has access to an app
CREATE OR REPLACE FUNCTION public.company_has_app_access(p_company_id UUID, p_app_slug VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.app_licenses al
        JOIN public.platform_apps pa ON al.app_id = pa.id
        WHERE al.company_id = p_company_id
          AND pa.slug = p_app_slug
          AND al.status = 'active'
          AND (al.expires_at IS NULL OR al.expires_at > NOW())
    );
END;
$$;

-- Check if a user has access to an app
CREATE OR REPLACE FUNCTION public.user_has_app_access(p_user_id UUID, p_app_slug VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_has_company_license BOOLEAN;
    v_has_user_access BOOLEAN;
BEGIN
    -- Get user's company
    SELECT company_id INTO v_company_id FROM public.users WHERE id = p_user_id;

    IF v_company_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if company has license
    SELECT EXISTS (
        SELECT 1
        FROM public.app_licenses al
        JOIN public.platform_apps pa ON al.app_id = pa.id
        WHERE al.company_id = v_company_id
          AND pa.slug = p_app_slug
          AND al.status = 'active'
          AND (al.expires_at IS NULL OR al.expires_at > NOW())
    ) INTO v_has_company_license;

    IF NOT v_has_company_license THEN
        RETURN FALSE;
    END IF;

    -- Check if user has explicit access or if license has no user limit
    SELECT EXISTS (
        SELECT 1
        FROM public.app_licenses al
        JOIN public.platform_apps pa ON al.app_id = pa.id
        LEFT JOIN public.app_user_access aua ON al.id = aua.license_id AND aua.user_id = p_user_id
        WHERE al.company_id = v_company_id
          AND pa.slug = p_app_slug
          AND al.status = 'active'
          AND (al.expires_at IS NULL OR al.expires_at > NOW())
          AND (al.user_limit IS NULL OR aua.id IS NOT NULL)
    ) INTO v_has_user_access;

    RETURN v_has_user_access;
END;
$$;

-- Log app usage
CREATE OR REPLACE FUNCTION public.log_app_usage(
    p_app_slug VARCHAR,
    p_action VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_app_id UUID;
BEGIN
    -- Get current user info
    SELECT id, company_id INTO v_user_id, v_company_id
    FROM public.users WHERE auth_id = auth.uid();

    -- Get app id
    SELECT id INTO v_app_id FROM public.platform_apps WHERE slug = p_app_slug;

    IF v_app_id IS NOT NULL AND v_company_id IS NOT NULL THEN
        INSERT INTO public.app_usage_logs (app_id, company_id, user_id, action, metadata)
        VALUES (v_app_id, v_company_id, v_user_id, p_action, p_metadata);
    END IF;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.company_has_app_access(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_app_access(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_app_usage(VARCHAR, VARCHAR, JSONB) TO authenticated;
