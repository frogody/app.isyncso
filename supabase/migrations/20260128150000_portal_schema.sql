-- Migration: Client Portal Schema
-- Date: 2026-01-28
-- Description: Creates all tables for the Notion-like client portal system

-- =============================================================================
-- PORTAL CLIENTS (External clients who log in)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited', 'blocked')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(organization_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_clients_organization ON public.portal_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_portal_clients_email ON public.portal_clients(email);
CREATE INDEX IF NOT EXISTS idx_portal_clients_auth_user ON public.portal_clients(auth_user_id);

-- RLS
ALTER TABLE public.portal_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_clients_org_view" ON public.portal_clients
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "portal_clients_org_manage" ON public.portal_clients
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id())
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "portal_clients_self_view" ON public.portal_clients
  FOR SELECT TO authenticated
  USING (auth_user_id = auth_uid());

-- =============================================================================
-- CLIENT PROJECT ACCESS (Permissions for client-project relationships)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'approve', 'edit')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  UNIQUE(client_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_project_access_client ON public.client_project_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_project ON public.client_project_access(project_id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_org ON public.client_project_access(organization_id);

-- RLS
ALTER TABLE public.client_project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_project_access_org_manage" ON public.client_project_access
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id())
  WITH CHECK (organization_id = auth_company_id());

-- =============================================================================
-- PORTAL SETTINGS (Per-organization branding and configuration)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  portal_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#06b6d4',
  accent_color TEXT DEFAULT '#10b981',
  background_color TEXT DEFAULT '#09090b',
  welcome_message TEXT,
  login_background_url TEXT,
  footer_text TEXT,
  custom_domain TEXT,
  enable_comments BOOLEAN DEFAULT true,
  enable_approvals BOOLEAN DEFAULT true,
  enable_notifications BOOLEAN DEFAULT true,
  enable_file_sharing BOOLEAN DEFAULT true,
  require_approval_for_downloads BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_settings_org_view" ON public.portal_settings
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "portal_settings_org_manage" ON public.portal_settings
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id())
  WITH CHECK (organization_id = auth_company_id());

-- Public read for portal theming (clients need to see branding)
CREATE POLICY "portal_settings_public_read" ON public.portal_settings
  FOR SELECT TO anon
  USING (true);

-- =============================================================================
-- PORTAL COMMENTS (Threaded comments on projects, tasks, milestones, files)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  milestone_id TEXT, -- Milestones are stored as JSONB in projects, so we use text ID
  file_id TEXT, -- Files are stored as JSONB in projects.attachments
  parent_comment_id UUID REFERENCES public.portal_comments(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('team', 'client')),
  author_client_id UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_comments_project ON public.portal_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_portal_comments_task ON public.portal_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_portal_comments_parent ON public.portal_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_portal_comments_org ON public.portal_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_portal_comments_created ON public.portal_comments(created_at DESC);

-- RLS
ALTER TABLE public.portal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_comments_org_view" ON public.portal_comments
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "portal_comments_org_create" ON public.portal_comments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "portal_comments_own_update" ON public.portal_comments
  FOR UPDATE TO authenticated
  USING (author_user_id = auth_uid() OR organization_id = auth_company_id());

CREATE POLICY "portal_comments_own_delete" ON public.portal_comments
  FOR DELETE TO authenticated
  USING (author_user_id = auth_uid() OR organization_id = auth_company_id());

-- =============================================================================
-- PORTAL APPROVALS (Workflow approvals for deliverables, milestones, invoices)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('deliverable', 'milestone', 'invoice', 'document', 'design', 'content')),
  reference_id TEXT, -- ID of the related item (task_id, milestone_id, file_id, etc.)
  reference_type TEXT, -- Type of the related item
  reference_data JSONB DEFAULT '{}'::jsonb, -- Snapshot of the item being approved
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  decided_by UUID,
  decided_by_client_id UUID REFERENCES public.portal_clients(id),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  revision_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_approvals_project ON public.portal_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_portal_approvals_status ON public.portal_approvals(status);
CREATE INDEX IF NOT EXISTS idx_portal_approvals_org ON public.portal_approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_portal_approvals_due ON public.portal_approvals(due_date);

-- RLS
ALTER TABLE public.portal_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_approvals_org_view" ON public.portal_approvals
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "portal_approvals_org_manage" ON public.portal_approvals
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id())
  WITH CHECK (organization_id = auth_company_id());

-- =============================================================================
-- PORTAL ACTIVITY (Activity log for all portal actions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT, -- 'project', 'task', 'comment', 'approval', 'file', 'milestone'
  entity_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_activity_org ON public.portal_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_project ON public.portal_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_created ON public.portal_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_activity_type ON public.portal_activity(action_type);

-- RLS
ALTER TABLE public.portal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_activity_org_view" ON public.portal_activity
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "portal_activity_org_create" ON public.portal_activity
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

-- =============================================================================
-- PORTAL NOTIFICATIONS (In-app and email notifications)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('team', 'client')),
  recipient_client_id UUID REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'comment', 'approval_request', 'approval_decision', 'file_upload', 'milestone', 'mention'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- URL to navigate to
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  related_entity_type TEXT,
  related_entity_id TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_emailed BOOLEAN DEFAULT false,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient_user ON public.portal_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient_client ON public.portal_notifications(recipient_client_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread ON public.portal_notifications(recipient_user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_portal_notifications_created ON public.portal_notifications(created_at DESC);

-- RLS
ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_notifications_recipient_view" ON public.portal_notifications
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth_uid() OR organization_id = auth_company_id());

CREATE POLICY "portal_notifications_recipient_update" ON public.portal_notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth_uid());

CREATE POLICY "portal_notifications_org_create" ON public.portal_notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

-- =============================================================================
-- PORTAL MAGIC LINKS (For passwordless client authentication)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portal_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_magic_links_token ON public.portal_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_portal_magic_links_client ON public.portal_magic_links(client_id);

-- RLS
ALTER TABLE public.portal_magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_magic_links_anon_verify" ON public.portal_magic_links
  FOR SELECT TO anon
  USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "portal_magic_links_org_manage" ON public.portal_magic_links
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id())
  WITH CHECK (organization_id = auth_company_id());

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get client's organization ID (for RLS)
CREATE OR REPLACE FUNCTION public.get_client_organization_id(p_client_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.portal_clients WHERE id = p_client_id;
$$;

-- Function to check if user has access to a project via client access
CREATE OR REPLACE FUNCTION public.client_has_project_access(p_auth_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_project_access cpa
    JOIN public.portal_clients pc ON cpa.client_id = pc.id
    WHERE pc.auth_user_id = p_auth_user_id
    AND cpa.project_id = p_project_id
    AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
  );
$$;

-- Function to log portal activity
CREATE OR REPLACE FUNCTION public.log_portal_activity(
  p_organization_id UUID,
  p_project_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.portal_activity (
    organization_id, project_id, action_type, description,
    entity_type, entity_id, user_id, client_id, metadata
  ) VALUES (
    p_organization_id, p_project_id, p_action_type, p_description,
    p_entity_type, p_entity_id, p_user_id, p_client_id, p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- Function to create portal notification
CREATE OR REPLACE FUNCTION public.create_portal_notification(
  p_organization_id UUID,
  p_recipient_type TEXT,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_recipient_user_id UUID DEFAULT NULL,
  p_recipient_client_id UUID DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.portal_notifications (
    organization_id, recipient_type, recipient_user_id, recipient_client_id,
    notification_type, title, body, link, project_id,
    related_entity_type, related_entity_id
  ) VALUES (
    p_organization_id, p_recipient_type, p_recipient_user_id, p_recipient_client_id,
    p_notification_type, p_title, p_body, p_link, p_project_id,
    p_related_entity_type, p_related_entity_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_portal_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all portal tables
CREATE TRIGGER update_portal_clients_timestamp
  BEFORE UPDATE ON public.portal_clients
  FOR EACH ROW EXECUTE FUNCTION update_portal_timestamp();

CREATE TRIGGER update_portal_settings_timestamp
  BEFORE UPDATE ON public.portal_settings
  FOR EACH ROW EXECUTE FUNCTION update_portal_timestamp();

CREATE TRIGGER update_portal_comments_timestamp
  BEFORE UPDATE ON public.portal_comments
  FOR EACH ROW EXECUTE FUNCTION update_portal_timestamp();

CREATE TRIGGER update_portal_approvals_timestamp
  BEFORE UPDATE ON public.portal_approvals
  FOR EACH ROW EXECUTE FUNCTION update_portal_timestamp();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE public.portal_clients IS 'External clients who can log into the client portal';
COMMENT ON TABLE public.client_project_access IS 'Maps clients to projects they can access with permission levels';
COMMENT ON TABLE public.portal_settings IS 'Per-organization portal branding and configuration';
COMMENT ON TABLE public.portal_comments IS 'Threaded comments on projects, tasks, milestones, and files';
COMMENT ON TABLE public.portal_approvals IS 'Approval requests for deliverables, milestones, invoices, etc.';
COMMENT ON TABLE public.portal_activity IS 'Activity log for all portal actions';
COMMENT ON TABLE public.portal_notifications IS 'In-app and email notifications for portal users';
COMMENT ON TABLE public.portal_magic_links IS 'Magic links for passwordless client authentication';
