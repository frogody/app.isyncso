-- AI & Automation Module Migration
-- Phase 12: AI Models, Usage, Prompts, Workflows, Scheduled Tasks

-- ============================================================================
-- AI Models Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'together', etc.
  model_id TEXT NOT NULL, -- The actual model identifier
  description TEXT,
  capabilities TEXT[] DEFAULT '{}', -- 'chat', 'completion', 'embedding', 'vision', 'function_calling'
  pricing_input DECIMAL(10, 6) DEFAULT 0, -- Cost per 1K input tokens
  pricing_output DECIMAL(10, 6) DEFAULT 0, -- Cost per 1K output tokens
  max_tokens INT DEFAULT 4096,
  context_window INT DEFAULT 128000,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI Usage Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.companies(id),
  model_id UUID REFERENCES public.ai_models(id),

  -- Token counts
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,

  -- Cost
  cost DECIMAL(10, 6) DEFAULT 0,

  -- Request info
  request_type TEXT, -- 'chat', 'completion', 'embedding', 'image', 'sync_agent'
  endpoint TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI Prompts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT, -- 'email', 'summary', 'extraction', 'creative', 'analysis'
  description TEXT,

  -- Prompt content
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- Variables like {{user_name}}, {{content}}

  -- Model settings
  model_id UUID REFERENCES public.ai_models(id),
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INT DEFAULT 1024,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Automation Workflows Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL, -- 'webhook', 'schedule', 'event', 'manual'
  trigger_config JSONB DEFAULT '{}',

  -- Actions to execute
  actions JSONB DEFAULT '[]', -- Array of action definitions

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  run_count INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  avg_duration_ms INT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Automation Runs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,

  -- Execution status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Data
  trigger_data JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Scheduled Tasks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Schedule
  cron_expression TEXT NOT NULL, -- e.g., '0 9 * * 1' for every Monday at 9am
  timezone TEXT DEFAULT 'UTC',

  -- Task configuration
  task_type TEXT NOT NULL, -- 'report', 'cleanup', 'sync', 'notification', 'backup'
  task_config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  last_status TEXT,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_models_slug ON public.ai_models(slug);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON public.ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON public.ai_models(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org ON public.ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON public.ai_usage_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_type ON public.ai_usage_logs(request_type);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_slug ON public.ai_prompts(slug);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON public.ai_prompts(category);

CREATE INDEX IF NOT EXISTS idx_automation_workflows_slug ON public.automation_workflows(slug);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_active ON public.automation_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger ON public.automation_workflows(trigger_type);

CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow ON public.automation_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON public.automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON public.automation_runs(started_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_active ON public.scheduled_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next ON public.scheduled_tasks(next_run_at);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- AI Models - Anyone can view active, platform admins full access
CREATE POLICY "Anyone can view active AI models" ON public.ai_models
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Platform admins full access to AI models" ON public.ai_models
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- AI Usage Logs - Users can view own, platform admins full access
CREATE POLICY "Users can view own AI usage" ON public.ai_usage_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Platform admins full access to AI usage" ON public.ai_usage_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- AI Prompts - Platform admins only
CREATE POLICY "Platform admins full access to AI prompts" ON public.ai_prompts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Automation Workflows - Platform admins only
CREATE POLICY "Platform admins full access to workflows" ON public.automation_workflows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Automation Runs - Platform admins only
CREATE POLICY "Platform admins full access to workflow runs" ON public.automation_runs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Scheduled Tasks - Platform admins only
CREATE POLICY "Platform admins full access to scheduled tasks" ON public.scheduled_tasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_prompts TO authenticated;
GRANT ALL ON public.automation_workflows TO authenticated;
GRANT ALL ON public.automation_runs TO authenticated;
GRANT ALL ON public.scheduled_tasks TO authenticated;

-- ============================================================================
-- Seed AI Models
-- ============================================================================

INSERT INTO public.ai_models (name, slug, provider, model_id, description, capabilities, pricing_input, pricing_output, max_tokens, context_window, is_default) VALUES
  ('GPT-4o', 'gpt-4o', 'openai', 'gpt-4o', 'OpenAI''s most advanced multimodal model', ARRAY['chat', 'vision', 'function_calling'], 0.005, 0.015, 4096, 128000, true),
  ('GPT-4o Mini', 'gpt-4o-mini', 'openai', 'gpt-4o-mini', 'Smaller, faster, cheaper version of GPT-4o', ARRAY['chat', 'vision', 'function_calling'], 0.00015, 0.0006, 16384, 128000, false),
  ('Claude 3.5 Sonnet', 'claude-35-sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', 'Anthropic''s most intelligent model', ARRAY['chat', 'vision', 'function_calling'], 0.003, 0.015, 8192, 200000, false),
  ('Claude 3 Haiku', 'claude-3-haiku', 'anthropic', 'claude-3-haiku-20240307', 'Fast and affordable Claude model', ARRAY['chat', 'vision'], 0.00025, 0.00125, 4096, 200000, false),
  ('Gemini 1.5 Pro', 'gemini-15-pro', 'google', 'gemini-1.5-pro', 'Google''s advanced multimodal model', ARRAY['chat', 'vision', 'function_calling'], 0.00125, 0.005, 8192, 1000000, false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed AI Prompts
-- ============================================================================

INSERT INTO public.ai_prompts (name, slug, category, description, system_prompt, user_prompt_template, variables, temperature, max_tokens) VALUES
  ('Professional Email Generator', 'email-generator', 'email', 'Generate professional business emails',
   'You are a professional business communication expert. Write clear, concise, and professional emails.',
   'Write a {{tone}} email to {{recipient}} about {{subject}}. Key points to include: {{key_points}}',
   ARRAY['tone', 'recipient', 'subject', 'key_points'], 0.7, 1024),

  ('Meeting Summary', 'meeting-summary', 'summary', 'Summarize meeting notes into actionable items',
   'You are an expert at summarizing meetings. Extract key decisions, action items, and follow-ups.',
   'Summarize the following meeting notes:\n\n{{meeting_notes}}\n\nInclude: key decisions, action items with owners, and next steps.',
   ARRAY['meeting_notes'], 0.3, 2048),

  ('Task Extraction', 'task-extraction', 'extraction', 'Extract tasks from unstructured text',
   'You are an expert at identifying tasks and to-do items from text. Extract actionable tasks with deadlines when mentioned.',
   'Extract all tasks and action items from the following text:\n\n{{content}}\n\nFormat each task with: title, description, priority (low/medium/high), and deadline if mentioned.',
   ARRAY['content'], 0.2, 1024)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed Automation Workflows
-- ============================================================================

INSERT INTO public.automation_workflows (name, slug, description, trigger_type, trigger_config, actions, is_active) VALUES
  ('Welcome New User', 'welcome-new-user', 'Send welcome email and create onboarding tasks when a new user signs up',
   'event', '{"event": "user.created"}',
   '[{"type": "send_email", "template": "welcome", "to": "{{user.email}}"}, {"type": "create_task", "title": "Complete profile", "assignee": "{{user.id}}"}]',
   true),

  ('Weekly Analytics Report', 'weekly-analytics', 'Generate and send weekly analytics report to admins',
   'schedule', '{"cron": "0 9 * * 1", "timezone": "America/Los_Angeles"}',
   '[{"type": "generate_report", "report": "weekly_analytics"}, {"type": "send_email", "template": "analytics_report", "to": "admins"}]',
   true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed Scheduled Tasks
-- ============================================================================

INSERT INTO public.scheduled_tasks (name, description, cron_expression, timezone, task_type, task_config, is_active) VALUES
  ('Daily Database Cleanup', 'Remove expired sessions and temporary data', '0 3 * * *', 'UTC', 'cleanup', '{"targets": ["expired_sessions", "temp_files", "old_logs"]}', true),
  ('Weekly Usage Report', 'Generate weekly AI usage reports', '0 8 * * 1', 'America/Los_Angeles', 'report', '{"report_type": "ai_usage", "period": "week"}', true),
  ('Hourly Health Check', 'Check system health and external service status', '0 * * * *', 'UTC', 'sync', '{"check": ["database", "storage", "edge_functions"]}', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Admin Functions
-- ============================================================================

-- Get AI stats
CREATE OR REPLACE FUNCTION public.admin_get_ai_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_cost DECIMAL;
  total_tokens BIGINT;
BEGIN
  -- Calculate totals for last 30 days
  SELECT
    COALESCE(SUM(cost), 0),
    COALESCE(SUM(total_tokens), 0)
  INTO total_cost, total_tokens
  FROM ai_usage_logs
  WHERE created_at > NOW() - INTERVAL '30 days';

  RETURN json_build_object(
    'total_tokens_30d', total_tokens,
    'total_cost_30d', total_cost,
    'total_tokens_today', (SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_logs WHERE created_at::date = CURRENT_DATE),
    'total_cost_today', (SELECT COALESCE(SUM(cost), 0) FROM ai_usage_logs WHERE created_at::date = CURRENT_DATE),
    'active_models', (SELECT COUNT(*) FROM ai_models WHERE is_active = true),
    'total_models', (SELECT COUNT(*) FROM ai_models),
    'active_prompts', (SELECT COUNT(*) FROM ai_prompts WHERE is_active = true),
    'active_workflows', (SELECT COUNT(*) FROM automation_workflows WHERE is_active = true),
    'workflow_runs_today', (SELECT COUNT(*) FROM automation_runs WHERE started_at::date = CURRENT_DATE),
    'scheduled_tasks_active', (SELECT COUNT(*) FROM scheduled_tasks WHERE is_active = true),
    'usage_by_model', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT m.name, SUM(u.total_tokens) as tokens, SUM(u.cost) as cost
        FROM ai_usage_logs u
        JOIN ai_models m ON u.model_id = m.id
        WHERE u.created_at > NOW() - INTERVAL '30 days'
        GROUP BY m.name
        ORDER BY tokens DESC
      ) t
    ),
    'usage_by_type', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT request_type, COUNT(*) as requests, SUM(total_tokens) as tokens
        FROM ai_usage_logs
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY request_type
        ORDER BY requests DESC
      ) t
    ),
    'daily_usage', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT DATE(created_at) as date, SUM(total_tokens) as tokens, SUM(cost) as cost, COUNT(*) as requests
        FROM ai_usage_logs
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      ) t
    )
  );
END;
$$;

-- Get AI models
CREATE OR REPLACE FUNCTION public.admin_get_ai_models()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.is_default DESC, t.name), '[]'::json)
    FROM (
      SELECT
        m.*,
        (SELECT COUNT(*) FROM ai_usage_logs WHERE model_id = m.id) as usage_count,
        (SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_logs WHERE model_id = m.id) as total_tokens_used
      FROM ai_models m
    ) t
  );
END;
$$;

-- Upsert AI model
CREATE OR REPLACE FUNCTION public.admin_upsert_ai_model(
  p_id UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO ai_models (
      name, slug, provider, model_id, description, capabilities,
      pricing_input, pricing_output, max_tokens, context_window, is_active, is_default
    ) VALUES (
      p_data->>'name',
      p_data->>'slug',
      p_data->>'provider',
      p_data->>'model_id',
      p_data->>'description',
      COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'capabilities') t), '{}'),
      COALESCE((p_data->>'pricing_input')::DECIMAL, 0),
      COALESCE((p_data->>'pricing_output')::DECIMAL, 0),
      COALESCE((p_data->>'max_tokens')::INT, 4096),
      COALESCE((p_data->>'context_window')::INT, 128000),
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      COALESCE((p_data->>'is_default')::BOOLEAN, false)
    ) RETURNING id INTO result_id;
  ELSE
    UPDATE ai_models SET
      name = COALESCE(p_data->>'name', name),
      provider = COALESCE(p_data->>'provider', provider),
      model_id = COALESCE(p_data->>'model_id', model_id),
      description = COALESCE(p_data->>'description', description),
      capabilities = COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'capabilities') t), capabilities),
      pricing_input = COALESCE((p_data->>'pricing_input')::DECIMAL, pricing_input),
      pricing_output = COALESCE((p_data->>'pricing_output')::DECIMAL, pricing_output),
      max_tokens = COALESCE((p_data->>'max_tokens')::INT, max_tokens),
      context_window = COALESCE((p_data->>'context_window')::INT, context_window),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      is_default = COALESCE((p_data->>'is_default')::BOOLEAN, is_default),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING id INTO result_id;
  END IF;

  -- If this model is set as default, unset others
  IF (p_data->>'is_default')::BOOLEAN = true THEN
    UPDATE ai_models SET is_default = false WHERE id != result_id;
  END IF;

  RETURN (SELECT row_to_json(m) FROM ai_models m WHERE m.id = result_id);
END;
$$;

-- Get AI usage
CREATE OR REPLACE FUNCTION public.admin_get_ai_usage(
  p_days INT DEFAULT 30,
  p_model_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
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
            u.*,
            m.name as model_name,
            usr.full_name as user_name,
            c.name as organization_name
          FROM ai_usage_logs u
          LEFT JOIN ai_models m ON u.model_id = m.id
          LEFT JOIN users usr ON u.user_id = usr.id
          LEFT JOIN companies c ON u.organization_id = c.id
          WHERE u.created_at > NOW() - (p_days || ' days')::INTERVAL
            AND (p_model_id IS NULL OR u.model_id = p_model_id)
            AND (p_org_id IS NULL OR u.organization_id = p_org_id)
          ORDER BY u.created_at DESC
          LIMIT 1000
        ) t
      ), '[]'::json),
      'summary', (
        SELECT row_to_json(s)
        FROM (
          SELECT
            SUM(total_tokens) as total_tokens,
            SUM(cost) as total_cost,
            COUNT(*) as total_requests,
            AVG(total_tokens) as avg_tokens_per_request
          FROM ai_usage_logs
          WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
            AND (p_model_id IS NULL OR model_id = p_model_id)
            AND (p_org_id IS NULL OR organization_id = p_org_id)
        ) s
      )
    )
  );
END;
$$;

-- Get AI prompts
CREATE OR REPLACE FUNCTION public.admin_get_ai_prompts(p_category TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.category, t.name), '[]'::json)
    FROM (
      SELECT
        p.*,
        m.name as model_name,
        u.full_name as created_by_name
      FROM ai_prompts p
      LEFT JOIN ai_models m ON p.model_id = m.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p_category IS NULL OR p.category = p_category
    ) t
  );
END;
$$;

-- Upsert AI prompt
CREATE OR REPLACE FUNCTION public.admin_upsert_ai_prompt(
  p_id UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO ai_prompts (
      name, slug, category, description, system_prompt, user_prompt_template,
      variables, model_id, temperature, max_tokens, is_active, created_by
    ) VALUES (
      p_data->>'name',
      p_data->>'slug',
      p_data->>'category',
      p_data->>'description',
      p_data->>'system_prompt',
      p_data->>'user_prompt_template',
      COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'variables') t), '{}'),
      (p_data->>'model_id')::UUID,
      COALESCE((p_data->>'temperature')::DECIMAL, 0.7),
      COALESCE((p_data->>'max_tokens')::INT, 1024),
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      (p_data->>'created_by')::UUID
    ) RETURNING id INTO result_id;
  ELSE
    UPDATE ai_prompts SET
      name = COALESCE(p_data->>'name', name),
      category = COALESCE(p_data->>'category', category),
      description = COALESCE(p_data->>'description', description),
      system_prompt = COALESCE(p_data->>'system_prompt', system_prompt),
      user_prompt_template = COALESCE(p_data->>'user_prompt_template', user_prompt_template),
      variables = COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'variables') t), variables),
      model_id = COALESCE((p_data->>'model_id')::UUID, model_id),
      temperature = COALESCE((p_data->>'temperature')::DECIMAL, temperature),
      max_tokens = COALESCE((p_data->>'max_tokens')::INT, max_tokens),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING id INTO result_id;
  END IF;

  RETURN (SELECT row_to_json(p) FROM ai_prompts p WHERE p.id = result_id);
END;
$$;

-- Delete AI prompt
CREATE OR REPLACE FUNCTION public.admin_delete_ai_prompt(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ai_prompts WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- Get workflows
CREATE OR REPLACE FUNCTION public.admin_get_workflows(p_status TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.name), '[]'::json)
    FROM (
      SELECT
        w.*,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM automation_runs WHERE workflow_id = w.id) as total_runs,
        (SELECT COUNT(*) FROM automation_runs WHERE workflow_id = w.id AND status = 'completed') as successful_runs,
        (SELECT COUNT(*) FROM automation_runs WHERE workflow_id = w.id AND status = 'failed') as failed_runs
      FROM automation_workflows w
      LEFT JOIN users u ON w.created_by = u.id
      WHERE p_status IS NULL
        OR (p_status = 'active' AND w.is_active = true)
        OR (p_status = 'inactive' AND w.is_active = false)
    ) t
  );
END;
$$;

-- Upsert workflow
CREATE OR REPLACE FUNCTION public.admin_upsert_workflow(
  p_id UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO automation_workflows (
      name, slug, description, trigger_type, trigger_config, actions, is_active, created_by
    ) VALUES (
      p_data->>'name',
      p_data->>'slug',
      p_data->>'description',
      p_data->>'trigger_type',
      COALESCE(p_data->'trigger_config', '{}'),
      COALESCE(p_data->'actions', '[]'),
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      (p_data->>'created_by')::UUID
    ) RETURNING id INTO result_id;
  ELSE
    UPDATE automation_workflows SET
      name = COALESCE(p_data->>'name', name),
      description = COALESCE(p_data->>'description', description),
      trigger_type = COALESCE(p_data->>'trigger_type', trigger_type),
      trigger_config = COALESCE(p_data->'trigger_config', trigger_config),
      actions = COALESCE(p_data->'actions', actions),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING id INTO result_id;
  END IF;

  RETURN (SELECT row_to_json(w) FROM automation_workflows w WHERE w.id = result_id);
END;
$$;

-- Get workflow runs
CREATE OR REPLACE FUNCTION public.admin_get_workflow_runs(
  p_workflow_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.started_at DESC), '[]'::json)
    FROM (
      SELECT *
      FROM automation_runs
      WHERE workflow_id = p_workflow_id
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Trigger workflow manually
CREATE OR REPLACE FUNCTION public.admin_trigger_workflow(
  p_workflow_id UUID,
  p_trigger_data JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id UUID;
BEGIN
  -- Create a new run
  INSERT INTO automation_runs (workflow_id, status, trigger_data)
  VALUES (p_workflow_id, 'pending', p_trigger_data)
  RETURNING id INTO new_run_id;

  -- Update workflow stats
  UPDATE automation_workflows
  SET run_count = run_count + 1, last_run_at = NOW()
  WHERE id = p_workflow_id;

  RETURN (SELECT row_to_json(r) FROM automation_runs r WHERE r.id = new_run_id);
END;
$$;

-- Get scheduled tasks
CREATE OR REPLACE FUNCTION public.admin_get_scheduled_tasks()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.next_run_at), '[]'::json)
    FROM (SELECT * FROM scheduled_tasks) t
  );
END;
$$;

-- Upsert scheduled task
CREATE OR REPLACE FUNCTION public.admin_upsert_scheduled_task(
  p_id UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO scheduled_tasks (
      name, description, cron_expression, timezone, task_type, task_config, is_active
    ) VALUES (
      p_data->>'name',
      p_data->>'description',
      p_data->>'cron_expression',
      COALESCE(p_data->>'timezone', 'UTC'),
      p_data->>'task_type',
      COALESCE(p_data->'task_config', '{}'),
      COALESCE((p_data->>'is_active')::BOOLEAN, true)
    ) RETURNING id INTO result_id;
  ELSE
    UPDATE scheduled_tasks SET
      name = COALESCE(p_data->>'name', name),
      description = COALESCE(p_data->>'description', description),
      cron_expression = COALESCE(p_data->>'cron_expression', cron_expression),
      timezone = COALESCE(p_data->>'timezone', timezone),
      task_type = COALESCE(p_data->>'task_type', task_type),
      task_config = COALESCE(p_data->'task_config', task_config),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING id INTO result_id;
  END IF;

  RETURN (SELECT row_to_json(t) FROM scheduled_tasks t WHERE t.id = result_id);
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.admin_get_ai_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_models() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_ai_model(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_usage(INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_prompts(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_ai_prompt(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_ai_prompt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_workflows(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_workflow(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_workflow_runs(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_trigger_workflow(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_scheduled_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_scheduled_task(UUID, JSONB) TO authenticated;
