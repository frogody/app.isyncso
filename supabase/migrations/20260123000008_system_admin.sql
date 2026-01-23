-- System Administration Module Migration
-- Phase 7: System Health, Errors, and Background Jobs

-- ============================================================================
-- System Health Checks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  check_type TEXT NOT NULL, -- 'api', 'database', 'storage', 'function', 'external'
  status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'
  response_time_ms INT,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- System Errors Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- 'api', 'database', 'function', 'client'
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Background Jobs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL, -- 'scheduled', 'triggered', 'recurring'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  progress INT DEFAULT 0, -- 0-100

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Configuration
  config JSONB DEFAULT '{}',

  -- Results
  result JSONB DEFAULT '{}',
  error_message TEXT,

  -- Metadata
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- API Rate Limits Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- user_id, company_id, or ip_address
  identifier_type TEXT NOT NULL, -- 'user', 'company', 'ip'
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_size_seconds INT DEFAULT 60,
  limit_value INT DEFAULT 100,

  UNIQUE(identifier, identifier_type, endpoint, window_start)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_health_checks_name ON public.system_health_checks(check_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_time ON public.system_health_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_system_errors_type ON public.system_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_system_errors_created ON public.system_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON public.system_errors(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON public.background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.api_rate_limits(identifier, identifier_type);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.system_health_checks TO authenticated;
GRANT ALL ON public.system_errors TO authenticated;
GRANT ALL ON public.background_jobs TO authenticated;
GRANT ALL ON public.api_rate_limits TO authenticated;

-- ============================================================================
-- System Admin Functions
-- ============================================================================

-- Get system overview
CREATE OR REPLACE FUNCTION public.admin_get_system_overview()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    -- Database stats
    'database', json_build_object(
      'total_users', (SELECT COUNT(*) FROM users),
      'total_companies', (SELECT COUNT(*) FROM companies),
      'total_products', (SELECT COUNT(*) FROM data_products),
      'total_apps', (SELECT COUNT(*) FROM platform_apps),
      'total_licenses', (SELECT COUNT(*) FROM app_licenses),
      'db_size', (SELECT pg_size_pretty(pg_database_size(current_database())))
    ),

    -- Recent health status
    'health', (
      SELECT COALESCE(json_agg(json_build_object(
        'check_name', check_name,
        'status', status,
        'response_time_ms', response_time_ms,
        'checked_at', checked_at
      )), '[]'::json)
      FROM (
        SELECT DISTINCT ON (check_name) *
        FROM system_health_checks
        ORDER BY check_name, checked_at DESC
      ) latest_checks
    ),

    -- Error summary
    'errors', json_build_object(
      'total_unresolved', (SELECT COUNT(*) FROM system_errors WHERE resolved = false),
      'last_24h', (SELECT COUNT(*) FROM system_errors WHERE created_at > NOW() - INTERVAL '24 hours'),
      'last_7d', (SELECT COUNT(*) FROM system_errors WHERE created_at > NOW() - INTERVAL '7 days')
    ),

    -- Jobs summary
    'jobs', json_build_object(
      'pending', (SELECT COUNT(*) FROM background_jobs WHERE status = 'pending'),
      'running', (SELECT COUNT(*) FROM background_jobs WHERE status = 'running'),
      'failed_24h', (SELECT COUNT(*) FROM background_jobs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')
    )
  );
END;
$$;

-- Get database table stats
CREATE OR REPLACE FUNCTION public.admin_get_table_stats()
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
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as data_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size,
        last_vacuum,
        last_autovacuum,
        last_analyze
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 30
    ) t
  );
END;
$$;

-- Get recent errors
CREATE OR REPLACE FUNCTION public.admin_get_recent_errors(
  p_limit INT DEFAULT 50,
  p_include_resolved BOOLEAN DEFAULT false
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
        e.*,
        u.name as user_name,
        u.email as user_email
      FROM system_errors e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE p_include_resolved OR e.resolved = false
      ORDER BY e.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Resolve error
CREATE OR REPLACE FUNCTION public.admin_resolve_error(
  p_error_id UUID,
  p_admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE system_errors
  SET resolved = true, resolved_at = NOW(), resolved_by = p_admin_id
  WHERE id = p_error_id;

  RETURN (SELECT row_to_json(e) FROM system_errors e WHERE e.id = p_error_id);
END;
$$;

-- Get background jobs
CREATE OR REPLACE FUNCTION public.admin_get_background_jobs(
  p_status TEXT DEFAULT NULL,
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
      SELECT
        j.*,
        u.name as created_by_name
      FROM background_jobs j
      LEFT JOIN users u ON j.created_by = u.id
      WHERE p_status IS NULL OR j.status = p_status
      ORDER BY j.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Record health check
CREATE OR REPLACE FUNCTION public.admin_record_health_check(
  p_check_name TEXT,
  p_check_type TEXT,
  p_status TEXT,
  p_response_time_ms INT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO system_health_checks (check_name, check_type, status, response_time_ms, details, error_message)
  VALUES (p_check_name, p_check_type, p_status, p_response_time_ms, p_details, p_error_message)
  RETURNING id INTO result_id;

  RETURN (SELECT row_to_json(h) FROM system_health_checks h WHERE h.id = result_id);
END;
$$;

-- Log system error
CREATE OR REPLACE FUNCTION public.admin_log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_stack_trace TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO system_errors (error_type, error_code, error_message, stack_trace, context, user_id)
  VALUES (p_error_type, p_error_code, p_error_message, p_stack_trace, p_context, p_user_id)
  RETURNING id INTO result_id;

  RETURN (SELECT row_to_json(e) FROM system_errors e WHERE e.id = result_id);
END;
$$;

-- Get API usage stats
CREATE OR REPLACE FUNCTION public.admin_get_api_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total_requests_24h', (
      SELECT COUNT(*) FROM admin_audit_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ),
    'requests_by_action', (
      SELECT COALESCE(json_agg(json_build_object('action', action, 'count', cnt)), '[]'::json)
      FROM (
        SELECT action, COUNT(*) as cnt
        FROM admin_audit_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ),
    'requests_by_admin', (
      SELECT COALESCE(json_agg(json_build_object('admin', COALESCE(u.name, 'Unknown'), 'count', cnt)), '[]'::json)
      FROM (
        SELECT admin_id, COUNT(*) as cnt
        FROM admin_audit_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY admin_id
        ORDER BY cnt DESC
        LIMIT 5
      ) t
      LEFT JOIN users u ON t.admin_id = u.id
    )
  );
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.admin_get_system_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_errors(INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_error(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_background_jobs(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_health_check(TEXT, TEXT, TEXT, INT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_error(TEXT, TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_api_stats() TO authenticated;
