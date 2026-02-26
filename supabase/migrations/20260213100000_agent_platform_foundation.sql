-- ============================================================
-- Agent Platform Foundation
-- On-demand development platform: worker fleet, commander chat,
-- health testing, GitHub integration
-- ============================================================

-- ─── 1. Agent Registry ──────────────────────────────────────
-- Central registration of all worker agents and their state
CREATE TABLE IF NOT EXISTS public.agent_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL DEFAULT 'builder'
    CHECK (agent_type IN ('builder', 'security', 'health', 'debug', 'relation', 'github')),
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('idle', 'working', 'paused', 'error', 'offline')),
  current_task_id UUID REFERENCES public.roadmap_items(id) ON DELETE SET NULL,
  machine_url TEXT,
  last_heartbeat TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  capabilities TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{"tasks_completed":0,"avg_duration_ms":0,"error_count":0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Agent Activity Log ──────────────────────────────────
-- Central logging table for ALL agent work
CREATE TABLE IF NOT EXISTS public.agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.agent_registry(id) ON DELETE CASCADE,
  roadmap_item_id UUID REFERENCES public.roadmap_items(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  severity TEXT DEFAULT 'info'
    CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON public.agent_activity_log(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_item ON public.agent_activity_log(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_severity ON public.agent_activity_log(severity) WHERE severity IN ('warning', 'error', 'critical');
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON public.agent_activity_log(created_at DESC);

-- ─── 3. Commander Sessions ──────────────────────────────────
-- Chat sessions for the Roadmap Commander interface
CREATE TABLE IF NOT EXISTS public.commander_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Session',
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  active_roadmap_items UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commander_sessions_user ON public.commander_sessions(user_id, updated_at DESC);

-- ─── 4. Health Check Results ────────────────────────────────
-- Individual test results from health runs
CREATE TABLE IF NOT EXISTS public.health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  roadmap_item_id UUID REFERENCES public.roadmap_items(id) ON DELETE SET NULL,
  test_type TEXT NOT NULL
    CHECK (test_type IN ('table', 'edge_function', 'function', 'route', 'import', 'rls', 'security')),
  test_target TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pass', 'fail', 'skip', 'error')),
  message TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_run ON public.health_check_results(run_id);
CREATE INDEX IF NOT EXISTS idx_health_item ON public.health_check_results(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_health_failures ON public.health_check_results(status) WHERE status = 'fail';

-- ─── 5. Platform Health Score ───────────────────────────────
-- Aggregated health score over time
CREATE TABLE IF NOT EXISTS public.platform_health_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  total_tests INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  skipped INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL,
  breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_score_time ON public.platform_health_score(created_at DESC);

-- ─── 6. GitHub Pull Requests ────────────────────────────────
-- Track PRs created by agents
CREATE TABLE IF NOT EXISTS public.github_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID REFERENCES public.roadmap_items(id) ON DELETE SET NULL,
  agent_id TEXT REFERENCES public.agent_registry(id) ON DELETE SET NULL,
  pr_number INTEGER NOT NULL,
  branch_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'merged', 'closed', 'draft')),
  github_url TEXT NOT NULL,
  checks_status TEXT DEFAULT 'pending'
    CHECK (checks_status IN ('pending', 'passing', 'failing')),
  files_changed TEXT[] DEFAULT '{}',
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_pr_item ON public.github_pull_requests(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_github_pr_status ON public.github_pull_requests(status);

-- ─── 7. Additions to roadmap_items ──────────────────────────
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS pr_number INTEGER;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS assigned_agent TEXT;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES public.roadmap_items(id) ON DELETE SET NULL;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_roadmap_assigned_agent ON public.roadmap_items(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_roadmap_parent ON public.roadmap_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_auto_queue ON public.roadmap_items(auto_queued) WHERE auto_queued = true;

-- ─── 8. RLS Policies ────────────────────────────────────────
-- Agent tables: admin-only access, service_role bypasses

ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commander_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_health_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_pull_requests ENABLE ROW LEVEL SECURITY;

-- Agent registry: admins can read
CREATE POLICY "admin_read_agents" ON public.agent_registry
  FOR SELECT TO authenticated
  USING (public.auth_hierarchy_level() >= 80);

-- Agent activity log: admins can read
CREATE POLICY "admin_read_agent_log" ON public.agent_activity_log
  FOR SELECT TO authenticated
  USING (public.auth_hierarchy_level() >= 80);

-- Commander sessions: user owns their sessions
CREATE POLICY "user_own_commander_sessions" ON public.commander_sessions
  FOR ALL TO authenticated
  USING (user_id = public.auth_uid())
  WITH CHECK (user_id = public.auth_uid());

-- Health results: admins can read
CREATE POLICY "admin_read_health" ON public.health_check_results
  FOR SELECT TO authenticated
  USING (public.auth_hierarchy_level() >= 80);

-- Health scores: admins can read
CREATE POLICY "admin_read_health_scores" ON public.platform_health_score
  FOR SELECT TO authenticated
  USING (public.auth_hierarchy_level() >= 80);

-- GitHub PRs: admins can read
CREATE POLICY "admin_read_prs" ON public.github_pull_requests
  FOR SELECT TO authenticated
  USING (public.auth_hierarchy_level() >= 80);

-- ─── 9. Enable Realtime ─────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_registry;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_check_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.github_pull_requests;

-- ─── 10. Seed initial agents ────────────────────────────────
INSERT INTO public.agent_registry (id, name, description, agent_type, status, capabilities) VALUES
  ('builder-local', 'Local Builder', 'Local machine builder agent (legacy watcher)', 'builder', 'offline', ARRAY['build', 'test', 'deploy']),
  ('security-scanner', 'Security Scanner', 'Scans for RLS gaps, exposed keys, auth pattern violations', 'security', 'offline', ARRAY['scan', 'audit', 'report']),
  ('health-monitor', 'Health Monitor', 'Runs structural tests, checks platform health', 'health', 'offline', ARRAY['test', 'diagnose', 'report']),
  ('debug-agent', 'Debug Agent', 'Monitors errors, identifies and fixes issues', 'debug', 'offline', ARRAY['debug', 'fix', 'report']),
  ('relation-mapper', 'Relation Mapper', 'Analyzes dependencies, validates data flow', 'relation', 'offline', ARRAY['analyze', 'map', 'report'])
ON CONFLICT (id) DO NOTHING;
