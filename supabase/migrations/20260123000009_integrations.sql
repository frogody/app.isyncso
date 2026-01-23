-- Integrations Hub Module Migration
-- Phase 8: Integration Providers, Company Connections, Webhooks

-- ============================================================================
-- Integration Providers Table (available integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Provider Info
  category TEXT NOT NULL, -- 'crm', 'email', 'calendar', 'storage', 'communication', 'analytics', 'payment', 'ai'
  logo_url TEXT,
  website_url TEXT,
  docs_url TEXT,

  -- Authentication
  auth_type TEXT NOT NULL, -- 'oauth2', 'api_key', 'basic', 'webhook'
  oauth_config JSONB DEFAULT '{}', -- client_id placeholder, scopes, etc.

  -- Features
  features TEXT[], -- ['contacts_sync', 'email_send', 'calendar_read', etc.]

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Company Integrations Table (connected integrations per company)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.integration_providers(id) ON DELETE CASCADE,

  -- Connection Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disabled')),

  -- Credentials (encrypted in production)
  credentials JSONB DEFAULT '{}', -- access_token, refresh_token, api_key, etc.

  -- Configuration
  config JSONB DEFAULT '{}', -- provider-specific settings
  sync_settings JSONB DEFAULT '{}', -- what to sync, frequency, etc.

  -- Status Tracking
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INT DEFAULT 0,

  -- Audit
  connected_by UUID REFERENCES public.users(id),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, provider_id)
);

-- ============================================================================
-- Integration Sync Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.company_integrations(id) ON DELETE CASCADE,

  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'

  -- Stats
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  -- Error info
  error_message TEXT,
  error_details JSONB DEFAULT '{}'
);

-- ============================================================================
-- Webhooks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT, -- for signing payloads

  -- Events
  events TEXT[] NOT NULL, -- ['user.created', 'order.completed', etc.]

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  total_deliveries INT DEFAULT 0,
  successful_deliveries INT DEFAULT 0,
  failed_deliveries INT DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  last_status_code INT,

  -- Audit
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Webhook Deliveries Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Response
  status_code INT,
  response_body TEXT,
  response_time_ms INT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  attempts INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_integration_providers_category ON public.integration_providers(category);
CREATE INDEX IF NOT EXISTS idx_integration_providers_slug ON public.integration_providers(slug);
CREATE INDEX IF NOT EXISTS idx_company_integrations_company ON public.company_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_provider ON public.company_integrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_status ON public.company_integrations(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON public.integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON public.integration_sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_company ON public.webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON public.webhook_deliveries(created_at);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Integration Providers - Anyone can view active providers
CREATE POLICY "Anyone can view active providers" ON public.integration_providers
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Company Integrations - Platform admins full access
CREATE POLICY "Platform admins full access to integrations" ON public.company_integrations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.rbac_user_roles ur ON u.id = ur.user_id
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.hierarchy_level >= 100
    )
  );

-- Company Integrations - Companies can view own integrations
CREATE POLICY "Companies can view own integrations" ON public.company_integrations
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Sync Logs - Platform admins full access
CREATE POLICY "Platform admins full access to sync logs" ON public.integration_sync_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.rbac_user_roles ur ON u.id = ur.user_id
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.hierarchy_level >= 100
    )
  );

-- Webhooks - Platform admins full access
CREATE POLICY "Platform admins full access to webhooks" ON public.webhooks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.rbac_user_roles ur ON u.id = ur.user_id
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.hierarchy_level >= 100
    )
  );

-- Webhook Deliveries - Platform admins full access
CREATE POLICY "Platform admins full access to deliveries" ON public.webhook_deliveries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.rbac_user_roles ur ON u.id = ur.user_id
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.hierarchy_level >= 100
    )
  );

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.integration_providers TO authenticated;
GRANT ALL ON public.company_integrations TO authenticated;
GRANT ALL ON public.integration_sync_logs TO authenticated;
GRANT ALL ON public.webhooks TO authenticated;
GRANT ALL ON public.webhook_deliveries TO authenticated;

-- ============================================================================
-- Seed Integration Providers
-- ============================================================================

INSERT INTO public.integration_providers (name, slug, description, category, auth_type, features, logo_url, website_url, docs_url) VALUES
  ('Salesforce', 'salesforce', 'Sync contacts, leads, and opportunities with Salesforce CRM', 'crm', 'oauth2', ARRAY['contacts_sync', 'leads_sync', 'opportunities_sync'], 'https://logo.clearbit.com/salesforce.com', 'https://salesforce.com', 'https://developer.salesforce.com/docs'),
  ('HubSpot', 'hubspot', 'Connect with HubSpot for marketing and sales automation', 'crm', 'oauth2', ARRAY['contacts_sync', 'deals_sync', 'email_tracking'], 'https://logo.clearbit.com/hubspot.com', 'https://hubspot.com', 'https://developers.hubspot.com/docs'),
  ('Google Workspace', 'google-workspace', 'Integrate with Gmail, Calendar, and Drive', 'productivity', 'oauth2', ARRAY['email_send', 'calendar_sync', 'drive_storage'], 'https://logo.clearbit.com/google.com', 'https://workspace.google.com', 'https://developers.google.com/workspace'),
  ('Microsoft 365', 'microsoft-365', 'Connect with Outlook, Teams, and OneDrive', 'productivity', 'oauth2', ARRAY['email_send', 'calendar_sync', 'teams_messaging'], 'https://logo.clearbit.com/microsoft.com', 'https://microsoft.com/microsoft-365', 'https://docs.microsoft.com/en-us/graph'),
  ('Slack', 'slack', 'Send notifications and messages to Slack channels', 'communication', 'oauth2', ARRAY['send_messages', 'channel_notifications'], 'https://logo.clearbit.com/slack.com', 'https://slack.com', 'https://api.slack.com/docs'),
  ('Stripe', 'stripe', 'Process payments and manage subscriptions', 'payment', 'api_key', ARRAY['payments', 'subscriptions', 'invoicing'], 'https://logo.clearbit.com/stripe.com', 'https://stripe.com', 'https://stripe.com/docs'),
  ('Mailchimp', 'mailchimp', 'Email marketing and audience management', 'email', 'oauth2', ARRAY['email_campaigns', 'audience_sync', 'analytics'], 'https://logo.clearbit.com/mailchimp.com', 'https://mailchimp.com', 'https://mailchimp.com/developer'),
  ('Zapier', 'zapier', 'Connect with 5000+ apps via Zapier', 'automation', 'api_key', ARRAY['triggers', 'actions', 'automation'], 'https://logo.clearbit.com/zapier.com', 'https://zapier.com', 'https://zapier.com/developer'),
  ('OpenAI', 'openai', 'AI-powered features with GPT models', 'ai', 'api_key', ARRAY['text_generation', 'embeddings', 'chat'], 'https://logo.clearbit.com/openai.com', 'https://openai.com', 'https://platform.openai.com/docs'),
  ('Twilio', 'twilio', 'SMS and voice communication', 'communication', 'api_key', ARRAY['sms_send', 'voice_calls', 'verification'], 'https://logo.clearbit.com/twilio.com', 'https://twilio.com', 'https://www.twilio.com/docs')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Admin Functions
-- ============================================================================

-- Get integrations overview
CREATE OR REPLACE FUNCTION public.admin_get_integrations_overview()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total_providers', (SELECT COUNT(*) FROM integration_providers WHERE is_active = true),
    'total_connections', (SELECT COUNT(*) FROM company_integrations WHERE status = 'connected'),
    'error_connections', (SELECT COUNT(*) FROM company_integrations WHERE status = 'error'),
    'pending_connections', (SELECT COUNT(*) FROM company_integrations WHERE status = 'pending'),
    'total_webhooks', (SELECT COUNT(*) FROM webhooks WHERE is_active = true),
    'providers_by_category', (
      SELECT COALESCE(json_agg(json_build_object('category', category, 'count', cnt)), '[]'::json)
      FROM (SELECT category, COUNT(*) as cnt FROM integration_providers WHERE is_active = true GROUP BY category ORDER BY cnt DESC) t
    ),
    'connections_by_status', (
      SELECT COALESCE(json_agg(json_build_object('status', status, 'count', cnt)), '[]'::json)
      FROM (SELECT status, COUNT(*) as cnt FROM company_integrations GROUP BY status) t
    ),
    'recent_syncs', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT l.id, l.sync_type, l.status, l.records_processed, l.started_at, l.completed_at,
               p.name as provider_name, p.logo_url as provider_logo, c.name as company_name
        FROM integration_sync_logs l
        JOIN company_integrations ci ON l.integration_id = ci.id
        JOIN integration_providers p ON ci.provider_id = p.id
        JOIN companies c ON ci.company_id = c.id
        ORDER BY l.started_at DESC
        LIMIT 5
      ) t
    ),
    'top_providers', (
      SELECT COALESCE(json_agg(json_build_object('name', name, 'logo_url', logo_url, 'count', cnt)), '[]'::json)
      FROM (
        SELECT p.name, p.logo_url, COUNT(ci.id) as cnt
        FROM integration_providers p
        LEFT JOIN company_integrations ci ON ci.provider_id = p.id AND ci.status = 'connected'
        WHERE p.is_active = true
        GROUP BY p.id, p.name, p.logo_url
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    )
  );
END;
$$;

-- Get all providers
CREATE OR REPLACE FUNCTION public.admin_get_integration_providers(
  p_category TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        p.*,
        (SELECT COUNT(*) FROM company_integrations ci WHERE ci.provider_id = p.id AND ci.status = 'connected') as connected_count,
        (SELECT COUNT(*) FROM company_integrations ci WHERE ci.provider_id = p.id AND ci.status = 'error') as error_count
      FROM integration_providers p
      WHERE (p_category IS NULL OR p.category = p_category)
      ORDER BY p.name
    ) t
  );
END;
$$;

-- Get company integrations
CREATE OR REPLACE FUNCTION public.admin_get_company_integrations(
  p_company_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        ci.*,
        p.name as provider_name,
        p.slug as provider_slug,
        p.category as provider_category,
        p.logo_url as provider_logo,
        c.name as company_name,
        u.name as connected_by_name,
        (SELECT COUNT(*) FROM integration_sync_logs l WHERE l.integration_id = ci.id) as total_syncs,
        (SELECT MAX(started_at) FROM integration_sync_logs l WHERE l.integration_id = ci.id) as last_sync_started
      FROM company_integrations ci
      JOIN integration_providers p ON ci.provider_id = p.id
      JOIN companies c ON ci.company_id = c.id
      LEFT JOIN users u ON ci.connected_by = u.id
      WHERE (p_company_id IS NULL OR ci.company_id = p_company_id)
        AND (p_status IS NULL OR ci.status = p_status)
      ORDER BY ci.created_at DESC
    ) t
  );
END;
$$;

-- Create/update provider
CREATE OR REPLACE FUNCTION public.admin_upsert_provider(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    -- Update existing provider
    UPDATE integration_providers SET
      name = COALESCE(p_data->>'name', name),
      description = COALESCE(p_data->>'description', description),
      category = COALESCE(p_data->>'category', category),
      logo_url = COALESCE(p_data->>'logo_url', logo_url),
      website_url = COALESCE(p_data->>'website_url', website_url),
      docs_url = COALESCE(p_data->>'docs_url', docs_url),
      auth_type = COALESCE(p_data->>'auth_type', auth_type),
      oauth_config = COALESCE(p_data->'oauth_config', oauth_config),
      features = COALESCE((SELECT array_agg(x)::TEXT[] FROM jsonb_array_elements_text(p_data->'features') x), features),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      is_beta = COALESCE((p_data->>'is_beta')::BOOLEAN, is_beta),
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    -- Insert new provider
    INSERT INTO integration_providers (
      name, slug, description, category, logo_url, website_url, docs_url,
      auth_type, oauth_config, features, is_active, is_beta
    ) VALUES (
      p_data->>'name',
      p_data->>'slug',
      p_data->>'description',
      p_data->>'category',
      p_data->>'logo_url',
      p_data->>'website_url',
      p_data->>'docs_url',
      COALESCE(p_data->>'auth_type', 'api_key'),
      COALESCE(p_data->'oauth_config', '{}'),
      COALESCE((SELECT array_agg(x)::TEXT[] FROM jsonb_array_elements_text(p_data->'features') x), '{}'),
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      COALESCE((p_data->>'is_beta')::BOOLEAN, false)
    )
    RETURNING id INTO result_id;
  END IF;

  RETURN (SELECT row_to_json(p) FROM integration_providers p WHERE p.id = result_id);
END;
$$;

-- Get webhooks
CREATE OR REPLACE FUNCTION public.admin_get_webhooks(
  p_company_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        w.*,
        c.name as company_name,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM webhook_deliveries d WHERE d.webhook_id = w.id AND d.created_at > NOW() - INTERVAL '24 hours') as deliveries_24h,
        (SELECT COUNT(*) FROM webhook_deliveries d WHERE d.webhook_id = w.id AND d.status = 'failed' AND d.created_at > NOW() - INTERVAL '24 hours') as failed_24h
      FROM webhooks w
      LEFT JOIN companies c ON w.company_id = c.id
      LEFT JOIN users u ON w.created_by = u.id
      WHERE p_company_id IS NULL OR w.company_id = p_company_id
      ORDER BY w.created_at DESC
    ) t
  );
END;
$$;

-- Get webhook deliveries
CREATE OR REPLACE FUNCTION public.admin_get_webhook_deliveries(
  p_webhook_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT *
      FROM webhook_deliveries
      WHERE webhook_id = p_webhook_id
      ORDER BY created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Get sync logs for an integration
CREATE OR REPLACE FUNCTION public.admin_get_sync_logs(
  p_integration_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT *
      FROM integration_sync_logs
      WHERE integration_id = p_integration_id
      ORDER BY started_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.admin_get_integrations_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_integration_providers(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_company_integrations(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_provider(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_webhooks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_webhook_deliveries(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_sync_logs(UUID, INT) TO authenticated;
