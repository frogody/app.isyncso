-- =============================================
-- Composio User Integrations Schema
-- Stores user connection references for Composio integrations
-- Tokens are managed by Composio, not stored here
-- =============================================

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  composio_connected_account_id TEXT NOT NULL,
  toolkit_slug TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'INITIATED', 'EXPIRED', 'FAILED')),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one connection per toolkit
  UNIQUE(user_id, toolkit_slug)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id
  ON public.user_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_integrations_toolkit
  ON public.user_integrations(toolkit_slug);

CREATE INDEX IF NOT EXISTS idx_user_integrations_status
  ON public.user_integrations(status);

CREATE INDEX IF NOT EXISTS idx_user_integrations_composio_id
  ON public.user_integrations(composio_connected_account_id);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies using optimized auth functions
-- Users can view their own integrations
CREATE POLICY "user_integrations_select_own" ON public.user_integrations
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

-- Users can insert their own integrations
CREATE POLICY "user_integrations_insert_own" ON public.user_integrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

-- Users can update their own integrations
CREATE POLICY "user_integrations_update_own" ON public.user_integrations
  FOR UPDATE TO authenticated
  USING (user_id = auth_uid())
  WITH CHECK (user_id = auth_uid());

-- Users can delete their own integrations
CREATE POLICY "user_integrations_delete_own" ON public.user_integrations
  FOR DELETE TO authenticated
  USING (user_id = auth_uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_integrations_updated_at();

-- =============================================
-- Composio Webhook Events Table
-- Stores incoming webhook events from Composio triggers
-- =============================================

CREATE TABLE IF NOT EXISTS public.composio_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_account_id TEXT NOT NULL,
  trigger_slug TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_composio_webhooks_user_id
  ON public.composio_webhook_events(user_id);

CREATE INDEX IF NOT EXISTS idx_composio_webhooks_trigger
  ON public.composio_webhook_events(trigger_slug);

CREATE INDEX IF NOT EXISTS idx_composio_webhooks_processed
  ON public.composio_webhook_events(processed);

CREATE INDEX IF NOT EXISTS idx_composio_webhooks_created_at
  ON public.composio_webhook_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.composio_webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own webhook events
CREATE POLICY "composio_webhooks_select_own" ON public.composio_webhook_events
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

-- =============================================
-- Composio Trigger Subscriptions Table
-- Tracks active trigger subscriptions
-- =============================================

CREATE TABLE IF NOT EXISTS public.composio_trigger_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_account_id TEXT NOT NULL,
  trigger_slug TEXT NOT NULL,
  composio_subscription_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'FAILED')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one subscription per trigger per connection
  UNIQUE(user_id, connected_account_id, trigger_slug)
);

-- Create indexes for trigger subscriptions
CREATE INDEX IF NOT EXISTS idx_composio_subs_user_id
  ON public.composio_trigger_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_composio_subs_trigger
  ON public.composio_trigger_subscriptions(trigger_slug);

CREATE INDEX IF NOT EXISTS idx_composio_subs_status
  ON public.composio_trigger_subscriptions(status);

-- Enable RLS
ALTER TABLE public.composio_trigger_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trigger subscriptions
CREATE POLICY "composio_subs_select_own" ON public.composio_trigger_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "composio_subs_insert_own" ON public.composio_trigger_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "composio_subs_update_own" ON public.composio_trigger_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth_uid())
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "composio_subs_delete_own" ON public.composio_trigger_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth_uid());

-- Create trigger for updated_at
CREATE TRIGGER trigger_composio_subs_updated_at
  BEFORE UPDATE ON public.composio_trigger_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_integrations_updated_at();

-- =============================================
-- Helper Functions
-- =============================================

-- Get user's active integration for a toolkit
CREATE OR REPLACE FUNCTION get_user_integration(
  p_user_id UUID,
  p_toolkit_slug TEXT
)
RETURNS public.user_integrations
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.user_integrations
  WHERE user_id = p_user_id
    AND toolkit_slug = p_toolkit_slug
    AND status = 'ACTIVE'
  LIMIT 1;
$$;

-- Update last_used_at timestamp
CREATE OR REPLACE FUNCTION update_integration_last_used(
  p_connected_account_id TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_integrations
  SET last_used_at = NOW()
  WHERE composio_connected_account_id = p_connected_account_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_integration(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_integration_last_used(TEXT) TO authenticated;

-- =============================================
-- Comments for Documentation
-- =============================================

COMMENT ON TABLE public.user_integrations IS
  'Stores user connection references for Composio integrations. Tokens are managed by Composio.';

COMMENT ON COLUMN public.user_integrations.composio_connected_account_id IS
  'The Composio connected account ID - used to execute tools and manage the connection';

COMMENT ON COLUMN public.user_integrations.toolkit_slug IS
  'The Composio toolkit slug (e.g., gmail, slack, hubspot)';

COMMENT ON COLUMN public.user_integrations.status IS
  'Connection status: ACTIVE, INACTIVE, PENDING, INITIATED, EXPIRED, FAILED';

COMMENT ON TABLE public.composio_webhook_events IS
  'Stores incoming webhook events from Composio triggers for processing';

COMMENT ON TABLE public.composio_trigger_subscriptions IS
  'Tracks active Composio trigger subscriptions for webhook notifications';
