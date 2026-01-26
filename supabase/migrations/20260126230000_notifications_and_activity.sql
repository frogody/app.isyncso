-- ============================================================================
-- User Notifications and Activity Log Tables
-- Real-time notifications system for recruiters
-- NOTE: Using user_notifications to avoid conflict with existing notifications table
-- ============================================================================

-- User notifications table (separate from existing e-commerce notifications)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for user_notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON public.user_notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);

-- Activity log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON public.activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_candidate_id ON public.activity_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_campaign_id ON public.activity_log(campaign_id);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.user_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;
CREATE POLICY "System can insert notifications"
  ON public.user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS policies for activity_log
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;
CREATE POLICY "System can insert activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- ============================================================================
-- Helper function to create notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM public.users
  WHERE auth_id = p_user_id;

  INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, action_url, metadata)
  VALUES (p_user_id, v_org_id, p_type, p_title, p_message, p_action_url, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- Helper function to log activity
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_candidate_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM public.users
  WHERE auth_id = p_user_id;

  INSERT INTO public.activity_log (user_id, organization_id, type, description, candidate_id, campaign_id, metadata)
  VALUES (p_user_id, v_org_id, p_type, p_description, p_candidate_id, p_campaign_id, p_metadata)
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- ============================================================================
-- Update timestamps trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_user_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_user_notifications_updated_at ON public.user_notifications;
CREATE TRIGGER trigger_user_notifications_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_notifications_updated_at();

-- Grant permissions
GRANT ALL ON public.user_notifications TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;
