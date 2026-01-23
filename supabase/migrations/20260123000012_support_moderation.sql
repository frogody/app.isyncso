-- Support & Moderation Module Migration
-- Phase 11: Tickets, Reports, User Flags, Canned Responses

-- ============================================================================
-- Ticket Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sla_hours INT DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Support Tickets Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,

  -- Requester
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.companies(id),

  -- Ticket Details
  subject TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.ticket_categories(id),

  -- Priority & Status
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- SLA Tracking
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Ticket Messages Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Message Content
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,

  -- Attachments
  attachments TEXT[] DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Moderation Reports Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reporter
  reporter_id UUID REFERENCES auth.users(id),

  -- Reported Content
  reported_user_id UUID REFERENCES auth.users(id),
  reported_content_type TEXT, -- 'user', 'comment', 'post', 'message', etc.
  reported_content_id UUID,

  -- Report Details
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'fake', 'copyright', 'other')),
  description TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),

  -- Resolution
  moderator_id UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Moderation Actions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target User
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'mute', 'suspend', 'ban', 'content_removal')),
  reason TEXT,

  -- Moderator
  moderator_id UUID REFERENCES auth.users(id),

  -- Duration (for temporary actions)
  expires_at TIMESTAMPTZ,

  -- Related Report
  report_id UUID REFERENCES public.moderation_reports(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- User Flags Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target User
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Flag Details
  flag_type TEXT NOT NULL CHECK (flag_type IN ('suspicious', 'fraud', 'abuse', 'spam', 'vip', 'review_needed')),
  reason TEXT,

  -- Who flagged
  flagged_by UUID REFERENCES auth.users(id),

  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Canned Responses Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ticket_categories_slug ON public.ticket_categories(slug);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON public.moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_user ON public.moderation_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON public.moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flags_user ON public.user_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_category ON public.canned_responses(category);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Ticket Categories - Anyone can view active
CREATE POLICY "Anyone can view active ticket categories" ON public.ticket_categories
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Platform admins full access to ticket categories" ON public.ticket_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Support Tickets - Users can view own, admins full access
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Platform admins full access to tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Ticket Messages - Users can view own ticket messages, admins full access
CREATE POLICY "Users can view own ticket messages" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()) AND NOT is_internal);

CREATE POLICY "Platform admins full access to ticket messages" ON public.ticket_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Moderation Reports - Admins only
CREATE POLICY "Platform admins full access to moderation reports" ON public.moderation_reports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Moderation Actions - Admins only
CREATE POLICY "Platform admins full access to moderation actions" ON public.moderation_actions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- User Flags - Admins only
CREATE POLICY "Platform admins full access to user flags" ON public.user_flags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Canned Responses - Admins only
CREATE POLICY "Platform admins full access to canned responses" ON public.canned_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.ticket_categories TO authenticated;
GRANT ALL ON public.support_tickets TO authenticated;
GRANT ALL ON public.ticket_messages TO authenticated;
GRANT ALL ON public.moderation_reports TO authenticated;
GRANT ALL ON public.moderation_actions TO authenticated;
GRANT ALL ON public.user_flags TO authenticated;
GRANT ALL ON public.canned_responses TO authenticated;

-- ============================================================================
-- Seed Ticket Categories
-- ============================================================================

INSERT INTO public.ticket_categories (name, slug, description, sla_hours, sort_order) VALUES
  ('General', 'general', 'General inquiries and questions', 48, 1),
  ('Technical', 'technical', 'Technical issues and troubleshooting', 24, 2),
  ('Billing', 'billing', 'Billing and payment related issues', 24, 3),
  ('Feature Request', 'feature-request', 'New feature suggestions', 72, 4),
  ('Bug Report', 'bug-report', 'Bug reports and issues', 12, 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed Canned Responses
-- ============================================================================

INSERT INTO public.canned_responses (name, category, content, variables) VALUES
  ('Welcome Response', 'general', 'Hello {{user_name}},

Thank you for contacting ISYNCSO Support. I''m here to help you with your inquiry.

I''ve reviewed your message and will get back to you shortly with a solution.

Best regards,
{{agent_name}}
ISYNCSO Support Team', ARRAY['user_name', 'agent_name']),

  ('Investigating Issue', 'technical', 'Hi {{user_name}},

Thank you for reporting this issue. I''m currently investigating the problem you described.

I''ll update you as soon as I have more information or a resolution.

In the meantime, please let me know if you notice any additional details that might help.

Best regards,
{{agent_name}}', ARRAY['user_name', 'agent_name']),

  ('Issue Resolved', 'general', 'Hi {{user_name}},

Great news! The issue you reported has been resolved.

{{resolution_details}}

If you experience any further issues, please don''t hesitate to reach out.

Best regards,
{{agent_name}}
ISYNCSO Support Team', ARRAY['user_name', 'agent_name', 'resolution_details']),

  ('Escalated', 'technical', 'Hi {{user_name}},

I''ve escalated your ticket to our specialized team for further investigation.

You can expect an update within {{timeframe}}.

We appreciate your patience.

Best regards,
{{agent_name}}', ARRAY['user_name', 'agent_name', 'timeframe']),

  ('Feature Request Logged', 'feature-request', 'Hi {{user_name}},

Thank you for your feature suggestion! We''ve logged your request for our product team to review.

While we can''t guarantee implementation, we value all feedback from our users.

You''ll be notified if this feature is added in a future update.

Best regards,
{{agent_name}}
ISYNCSO Product Team', ARRAY['user_name', 'agent_name'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Helper function for ticket numbers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM support_tickets;
  new_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$;

-- ============================================================================
-- Admin Functions
-- ============================================================================

-- Get support stats
CREATE OR REPLACE FUNCTION public.admin_get_support_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_response INTERVAL;
BEGIN
  -- Calculate average first response time
  SELECT AVG(first_response_at - created_at) INTO avg_response
  FROM support_tickets
  WHERE first_response_at IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';

  RETURN json_build_object(
    'total_tickets', (SELECT COUNT(*) FROM support_tickets),
    'open_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'in_progress_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress'),
    'waiting_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'waiting'),
    'resolved_today', (SELECT COUNT(*) FROM support_tickets WHERE status IN ('resolved', 'closed') AND resolved_at::date = CURRENT_DATE),
    'avg_response_hours', COALESCE(EXTRACT(EPOCH FROM avg_response) / 3600, 0),
    'urgent_tickets', (SELECT COUNT(*) FROM support_tickets WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')),
    'unassigned_tickets', (SELECT COUNT(*) FROM support_tickets WHERE assigned_to IS NULL AND status = 'open'),
    'pending_reports', (SELECT COUNT(*) FROM moderation_reports WHERE status = 'pending'),
    'active_bans', (SELECT COUNT(*) FROM moderation_actions WHERE action_type IN ('suspend', 'ban') AND (expires_at IS NULL OR expires_at > NOW())),
    'flagged_users', (SELECT COUNT(DISTINCT user_id) FROM user_flags WHERE resolved_at IS NULL),
    'tickets_by_status', (
      SELECT COALESCE(json_agg(json_build_object('status', status, 'count', cnt)), '[]'::json)
      FROM (SELECT status, COUNT(*) as cnt FROM support_tickets GROUP BY status) t
    ),
    'tickets_by_priority', (
      SELECT COALESCE(json_agg(json_build_object('priority', priority, 'count', cnt)), '[]'::json)
      FROM (SELECT priority, COUNT(*) as cnt FROM support_tickets WHERE status NOT IN ('resolved', 'closed') GROUP BY priority) t
    ),
    'tickets_by_category', (
      SELECT COALESCE(json_agg(json_build_object('category', tc.name, 'count', cnt)), '[]'::json)
      FROM (
        SELECT category_id, COUNT(*) as cnt
        FROM support_tickets
        WHERE status NOT IN ('resolved', 'closed')
        GROUP BY category_id
      ) t
      JOIN ticket_categories tc ON t.category_id = tc.id
    )
  );
END;
$$;

-- Get tickets
CREATE OR REPLACE FUNCTION public.admin_get_tickets(
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'items', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            st.*,
            tc.name as category_name,
            u.full_name as user_name,
            u.email as user_email,
            c.name as organization_name,
            au.full_name as assigned_to_name,
            (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = st.id) as message_count
          FROM support_tickets st
          LEFT JOIN ticket_categories tc ON st.category_id = tc.id
          LEFT JOIN users u ON st.user_id = u.id
          LEFT JOIN companies c ON st.organization_id = c.id
          LEFT JOIN users au ON st.assigned_to = au.id
          WHERE (p_status IS NULL OR st.status = p_status)
            AND (p_priority IS NULL OR st.priority = p_priority)
            AND (p_category_id IS NULL OR st.category_id = p_category_id)
            AND (p_assigned_to IS NULL OR st.assigned_to = p_assigned_to)
            AND (p_search IS NULL OR st.subject ILIKE '%' || p_search || '%' OR st.ticket_number ILIKE '%' || p_search || '%')
          ORDER BY
            CASE st.priority
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            st.created_at DESC
          LIMIT p_limit OFFSET p_offset
        ) t
      ), '[]'::json),
      'total', (
        SELECT COUNT(*)
        FROM support_tickets st
        WHERE (p_status IS NULL OR st.status = p_status)
          AND (p_priority IS NULL OR st.priority = p_priority)
          AND (p_category_id IS NULL OR st.category_id = p_category_id)
          AND (p_assigned_to IS NULL OR st.assigned_to = p_assigned_to)
          AND (p_search IS NULL OR st.subject ILIKE '%' || p_search || '%' OR st.ticket_number ILIKE '%' || p_search || '%')
      )
    )
  );
END;
$$;

-- Get ticket detail
CREATE OR REPLACE FUNCTION public.admin_get_ticket_detail(p_ticket_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'ticket', (
        SELECT row_to_json(t)
        FROM (
          SELECT
            st.*,
            tc.name as category_name,
            tc.sla_hours,
            u.full_name as user_name,
            u.email as user_email,
            u.avatar_url as user_avatar,
            c.name as organization_name,
            au.full_name as assigned_to_name
          FROM support_tickets st
          LEFT JOIN ticket_categories tc ON st.category_id = tc.id
          LEFT JOIN users u ON st.user_id = u.id
          LEFT JOIN companies c ON st.organization_id = c.id
          LEFT JOIN users au ON st.assigned_to = au.id
          WHERE st.id = p_ticket_id
        ) t
      ),
      'messages', (
        SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.created_at), '[]'::json)
        FROM (
          SELECT
            tm.*,
            u.full_name as user_name,
            u.avatar_url as user_avatar
          FROM ticket_messages tm
          LEFT JOIN users u ON tm.user_id = u.id
          WHERE tm.ticket_id = p_ticket_id
        ) m
      )
    )
  );
END;
$$;

-- Update ticket
CREATE OR REPLACE FUNCTION public.admin_update_ticket(
  p_ticket_id UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status TEXT;
BEGIN
  SELECT status INTO old_status FROM support_tickets WHERE id = p_ticket_id;

  UPDATE support_tickets SET
    status = COALESCE(p_data->>'status', status),
    priority = COALESCE(p_data->>'priority', priority),
    category_id = COALESCE((p_data->>'category_id')::UUID, category_id),
    assigned_to = CASE
      WHEN p_data ? 'assigned_to' THEN (p_data->>'assigned_to')::UUID
      ELSE assigned_to
    END,
    first_response_at = CASE
      WHEN first_response_at IS NULL AND p_data->>'status' != 'open' THEN NOW()
      ELSE first_response_at
    END,
    resolved_at = CASE
      WHEN p_data->>'status' IN ('resolved', 'closed') AND resolved_at IS NULL THEN NOW()
      ELSE resolved_at
    END,
    tags = COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'tags') t), tags),
    updated_at = NOW()
  WHERE id = p_ticket_id;

  RETURN (SELECT row_to_json(st) FROM support_tickets st WHERE st.id = p_ticket_id);
END;
$$;

-- Add ticket message
CREATE OR REPLACE FUNCTION public.admin_add_ticket_message(
  p_ticket_id UUID,
  p_user_id UUID,
  p_message TEXT,
  p_is_internal BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_message_id UUID;
BEGIN
  INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal)
  VALUES (p_ticket_id, p_user_id, p_message, p_is_internal)
  RETURNING id INTO new_message_id;

  -- Update first response time if this is the first agent response
  UPDATE support_tickets
  SET first_response_at = COALESCE(first_response_at, NOW()),
      updated_at = NOW()
  WHERE id = p_ticket_id AND NOT p_is_internal;

  RETURN (
    SELECT row_to_json(t)
    FROM (
      SELECT tm.*, u.full_name as user_name, u.avatar_url as user_avatar
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.id = new_message_id
    ) t
  );
END;
$$;

-- Get moderation reports
CREATE OR REPLACE FUNCTION public.admin_get_moderation_reports(
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'items', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            mr.*,
            reporter.full_name as reporter_name,
            reported.full_name as reported_user_name,
            reported.email as reported_user_email,
            mod.full_name as moderator_name
          FROM moderation_reports mr
          LEFT JOIN users reporter ON mr.reporter_id = reporter.id
          LEFT JOIN users reported ON mr.reported_user_id = reported.id
          LEFT JOIN users mod ON mr.moderator_id = mod.id
          WHERE (p_status IS NULL OR mr.status = p_status)
            AND (p_type IS NULL OR mr.reported_content_type = p_type)
          ORDER BY mr.created_at DESC
          LIMIT p_limit OFFSET p_offset
        ) t
      ), '[]'::json),
      'total', (
        SELECT COUNT(*)
        FROM moderation_reports mr
        WHERE (p_status IS NULL OR mr.status = p_status)
          AND (p_type IS NULL OR mr.reported_content_type = p_type)
      )
    )
  );
END;
$$;

-- Resolve moderation report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id UUID,
  p_moderator_id UUID,
  p_resolution TEXT,
  p_action_type TEXT DEFAULT NULL,
  p_action_reason TEXT DEFAULT NULL,
  p_action_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reported_user UUID;
BEGIN
  -- Get reported user
  SELECT reported_user_id INTO reported_user FROM moderation_reports WHERE id = p_report_id;

  -- Update report
  UPDATE moderation_reports SET
    status = 'resolved',
    moderator_id = p_moderator_id,
    resolution = p_resolution,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_report_id;

  -- Create moderation action if specified
  IF p_action_type IS NOT NULL AND reported_user IS NOT NULL THEN
    INSERT INTO moderation_actions (user_id, action_type, reason, moderator_id, expires_at, report_id)
    VALUES (reported_user, p_action_type, p_action_reason, p_moderator_id, p_action_expires_at, p_report_id);
  END IF;

  RETURN (SELECT row_to_json(mr) FROM moderation_reports mr WHERE mr.id = p_report_id);
END;
$$;

-- Get user flags
CREATE OR REPLACE FUNCTION public.admin_get_user_flags(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
    FROM (
      SELECT
        uf.*,
        u.full_name as user_name,
        u.email as user_email,
        fb.full_name as flagged_by_name,
        rb.full_name as resolved_by_name
      FROM user_flags uf
      LEFT JOIN users u ON uf.user_id = u.id
      LEFT JOIN users fb ON uf.flagged_by = fb.id
      LEFT JOIN users rb ON uf.resolved_by = rb.id
      WHERE p_user_id IS NULL OR uf.user_id = p_user_id
    ) t
  );
END;
$$;

-- Get canned responses
CREATE OR REPLACE FUNCTION public.admin_get_canned_responses(p_category TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.name), '[]'::json)
    FROM (
      SELECT *
      FROM canned_responses
      WHERE is_active = true
        AND (p_category IS NULL OR category = p_category)
    ) t
  );
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.generate_ticket_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_support_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_tickets(TEXT, TEXT, UUID, UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ticket_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_ticket_message(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_moderation_reports(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_flags(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_canned_responses(TEXT) TO authenticated;
