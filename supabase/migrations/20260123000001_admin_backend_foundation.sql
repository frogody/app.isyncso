-- ============================================================================
-- Admin Backend Foundation
-- Core tables for platform administration, feature flags, and audit logging
-- ============================================================================

-- ============================================================================
-- 1. Platform Settings - Global platform configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_sensitive BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Feature Flags - Feature toggle system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  target_organizations UUID[] DEFAULT '{}',
  target_users UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_slug ON public.feature_flags(slug);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(is_enabled);

-- ============================================================================
-- 3. Admin Audit Logs - Comprehensive audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);

-- ============================================================================
-- 4. Platform Admins - Platform-level admin designation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'analyst')),
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON public.platform_admins(role);
CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON public.platform_admins(is_active);

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Check if current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
    AND is_active = TRUE
  )
$$;

-- Check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = TRUE
  )
$$;

-- Get current admin's role
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.platform_admins
  WHERE user_id = auth.uid()
  AND is_active = TRUE
  LIMIT 1
$$;

-- Check if a feature flag is enabled for a user/org
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_slug TEXT,
  p_user_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT * INTO v_flag
  FROM public.feature_flags
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if globally enabled
  IF v_flag.is_enabled AND v_flag.rollout_percentage = 100 THEN
    RETURN TRUE;
  END IF;

  -- Check if user is in target list
  IF v_user_id IS NOT NULL AND v_user_id = ANY(v_flag.target_users) THEN
    RETURN TRUE;
  END IF;

  -- Check if org is in target list
  IF p_org_id IS NOT NULL AND p_org_id = ANY(v_flag.target_organizations) THEN
    RETURN TRUE;
  END IF;

  -- Check rollout percentage (deterministic based on user_id)
  IF v_flag.is_enabled AND v_flag.rollout_percentage > 0 AND v_user_id IS NOT NULL THEN
    -- Use hash of user_id for deterministic rollout
    IF (('x' || substr(md5(v_user_id::text), 1, 8))::bit(32)::int % 100) < v_flag.rollout_percentage THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

-- Platform Settings Policies
CREATE POLICY "platform_settings_select_admin" ON public.platform_settings
FOR SELECT TO authenticated
USING (is_platform_admin());

CREATE POLICY "platform_settings_insert_super_admin" ON public.platform_settings
FOR INSERT TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "platform_settings_update_admin" ON public.platform_settings
FOR UPDATE TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

CREATE POLICY "platform_settings_delete_super_admin" ON public.platform_settings
FOR DELETE TO authenticated
USING (is_super_admin());

-- Feature Flags Policies
CREATE POLICY "feature_flags_select_admin" ON public.feature_flags
FOR SELECT TO authenticated
USING (is_platform_admin());

CREATE POLICY "feature_flags_insert_admin" ON public.feature_flags
FOR INSERT TO authenticated
WITH CHECK (is_platform_admin());

CREATE POLICY "feature_flags_update_admin" ON public.feature_flags
FOR UPDATE TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

CREATE POLICY "feature_flags_delete_super_admin" ON public.feature_flags
FOR DELETE TO authenticated
USING (is_super_admin());

-- Public read for checking if feature is enabled (non-sensitive)
CREATE POLICY "feature_flags_public_check" ON public.feature_flags
FOR SELECT TO authenticated
USING (TRUE);

-- Admin Audit Logs Policies
CREATE POLICY "audit_logs_select_admin" ON public.admin_audit_logs
FOR SELECT TO authenticated
USING (is_platform_admin());

CREATE POLICY "audit_logs_insert_admin" ON public.admin_audit_logs
FOR INSERT TO authenticated
WITH CHECK (is_platform_admin());

-- No update/delete for audit logs (immutable)

-- Platform Admins Policies
CREATE POLICY "platform_admins_select_admin" ON public.platform_admins
FOR SELECT TO authenticated
USING (is_platform_admin());

CREATE POLICY "platform_admins_insert_super_admin" ON public.platform_admins
FOR INSERT TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "platform_admins_update_super_admin" ON public.platform_admins
FOR UPDATE TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "platform_admins_delete_super_admin" ON public.platform_admins
FOR DELETE TO authenticated
USING (is_super_admin());

-- ============================================================================
-- 7. Triggers
-- ============================================================================

-- Auto-update updated_at on platform_settings
CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Auto-update updated_at on feature_flags
DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Auto-update updated_at on platform_admins
DROP TRIGGER IF EXISTS platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- ============================================================================
-- 8. Default Data
-- ============================================================================

-- Default Platform Settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
  ('platform_name', '"ISYNCSO"', 'Name of the platform', 'general'),
  ('platform_version', '"1.0.0"', 'Current platform version', 'general'),
  ('maintenance_mode', 'false', 'Enable maintenance mode to block user access', 'general'),
  ('default_trial_days', '14', 'Number of days for free trial', 'billing'),
  ('max_users_per_org', '100', 'Maximum users allowed per organization', 'limits'),
  ('ai_rate_limit_per_minute', '60', 'Maximum AI requests per minute per user', 'limits'),
  ('storage_limit_gb', '10', 'Default storage limit per organization in GB', 'limits'),
  ('support_email', '"support@isyncso.com"', 'Support contact email', 'general'),
  ('documentation_url', '"https://docs.isyncso.com"', 'Documentation URL', 'general'),
  ('enable_signup', 'true', 'Allow new user signups', 'auth')
ON CONFLICT (key) DO NOTHING;

-- Default Feature Flags
INSERT INTO public.feature_flags (name, slug, description, is_enabled, rollout_percentage) VALUES
  ('Admin Backend', 'admin_backend', 'Enable admin backend access', TRUE, 100),
  ('Data Marketplace', 'data_marketplace', 'Enable data marketplace feature', FALSE, 0),
  ('AI Usage Limits', 'ai_usage_limits', 'Enforce AI usage limits', FALSE, 0),
  ('Advanced Analytics', 'advanced_analytics', 'Enable advanced analytics dashboard', FALSE, 0),
  ('Multi-tenant Mode', 'multi_tenant', 'Enable multi-tenant organization mode', TRUE, 100),
  ('API Access', 'api_access', 'Enable API access for organizations', TRUE, 100),
  ('Custom Integrations', 'custom_integrations', 'Allow custom integration development', FALSE, 0),
  ('White Label', 'white_label', 'Enable white-label customization', FALSE, 0)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 9. Admin API Helper Functions
-- ============================================================================

-- Get all platform settings (for admin API)
CREATE OR REPLACE FUNCTION public.admin_get_settings(
  p_category TEXT DEFAULT NULL,
  p_include_sensitive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  key TEXT,
  value JSONB,
  description TEXT,
  category TEXT,
  is_sensitive BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  RETURN QUERY
  SELECT
    s.key,
    CASE WHEN s.is_sensitive AND NOT p_include_sensitive THEN '"[REDACTED]"'::jsonb ELSE s.value END,
    s.description,
    s.category,
    s.is_sensitive,
    s.updated_at
  FROM public.platform_settings s
  WHERE (p_category IS NULL OR s.category = p_category)
  ORDER BY s.category, s.key;
END;
$$;

-- Update a platform setting (for admin API)
CREATE OR REPLACE FUNCTION public.admin_update_setting(
  p_key TEXT,
  p_value JSONB,
  p_admin_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_value JSONB;
  v_admin_id UUID;
BEGIN
  v_admin_id := COALESCE(p_admin_id, auth.uid());

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  -- Get old value for audit log
  SELECT value INTO v_old_value FROM public.platform_settings WHERE key = p_key;

  -- Update the setting
  UPDATE public.platform_settings
  SET value = p_value, updated_by = v_admin_id, updated_at = NOW()
  WHERE key = p_key;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Create audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, resource_type, resource_id, old_value, new_value)
  VALUES (v_admin_id, 'update', 'platform_setting', p_key, jsonb_build_object('value', v_old_value), jsonb_build_object('value', p_value));

  RETURN TRUE;
END;
$$;

-- Get audit logs with pagination (for admin API)
CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_resource_type TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  admin_email TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.admin_id,
    l.admin_email,
    l.action,
    l.resource_type,
    l.resource_id,
    l.old_value,
    l.new_value,
    l.ip_address,
    l.metadata,
    l.created_at
  FROM public.admin_audit_logs l
  WHERE (p_resource_type IS NULL OR l.resource_type = p_resource_type)
    AND (p_admin_id IS NULL OR l.admin_id = p_admin_id)
    AND (p_action IS NULL OR l.action = p_action)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create audit log entry (for admin API)
CREATE OR REPLACE FUNCTION public.admin_create_audit_log(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_admin_email TEXT;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  -- Get admin email
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.admin_audit_logs (
    admin_id, admin_email, action, resource_type, resource_id,
    old_value, new_value, ip_address, user_agent, metadata
  ) VALUES (
    auth.uid(), v_admin_email, p_action, p_resource_type, p_resource_id,
    p_old_value, p_new_value, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
