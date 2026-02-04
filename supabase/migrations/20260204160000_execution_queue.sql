-- Execution Queue System for Async Jobs
-- Handles: timers, scheduled sends, retries, rate limiting

-- ============================================================================
-- Execution Queue Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  execution_id UUID REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('timer', 'send_email', 'send_linkedin', 'send_sms', 'webhook', 'retry', 'follow_up')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 0,
  payload JSONB DEFAULT '{}',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_queue_pending ON public.execution_queue(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_execution ON public.execution_queue(execution_id);
CREATE INDEX IF NOT EXISTS idx_queue_locked ON public.execution_queue(locked_by, locked_at)
  WHERE locked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_workspace ON public.execution_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_queue_type_status ON public.execution_queue(job_type, status);

-- ============================================================================
-- Rate Limits Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'email', 'linkedin', 'sms', 'claude_api', 'embedding'
  resource_id TEXT, -- Optional: specific account/prospect ID
  window_start TIMESTAMPTZ NOT NULL,
  window_size_minutes INTEGER NOT NULL DEFAULT 60,
  current_count INTEGER DEFAULT 0,
  max_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for rate limit windows
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_resource
  ON public.rate_limits(workspace_id, resource_type, COALESCE(resource_id, ''), window_start);

-- ============================================================================
-- Queue Processing Functions
-- ============================================================================

-- Claim next available job atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION public.claim_next_job(
  p_worker_id TEXT,
  p_job_types TEXT[] DEFAULT ARRAY['timer', 'send_email', 'send_linkedin', 'send_sms', 'webhook', 'retry', 'follow_up']
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  execution_id UUID,
  node_id TEXT,
  job_type TEXT,
  payload JSONB,
  attempts INTEGER,
  max_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE public.execution_queue eq
    SET
      status = 'processing',
      locked_by = p_worker_id,
      locked_at = NOW(),
      attempts = eq.attempts + 1,
      updated_at = NOW()
    WHERE eq.id = (
      SELECT eq2.id
      FROM public.execution_queue eq2
      WHERE eq2.status = 'pending'
        AND eq2.scheduled_for <= NOW()
        AND eq2.job_type = ANY(p_job_types)
        AND eq2.attempts < eq2.max_attempts
      ORDER BY eq2.priority DESC, eq2.scheduled_for ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING eq.*
  )
  SELECT
    claimed.id,
    claimed.workspace_id,
    claimed.execution_id,
    claimed.node_id,
    claimed.job_type,
    claimed.payload,
    claimed.attempts,
    claimed.max_attempts
  FROM claimed;
END;
$$;

-- Complete a job (success or failure)
CREATE OR REPLACE FUNCTION public.complete_job(
  p_job_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.execution_queue
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    completed_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
    last_error = p_error_message,
    locked_by = NULL,
    locked_at = NULL,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

-- Release stale locks (jobs locked for too long)
CREATE OR REPLACE FUNCTION public.release_stale_locks(p_stale_minutes INTEGER DEFAULT 10)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.execution_queue
  SET
    status = 'pending',
    locked_by = NULL,
    locked_at = NULL,
    updated_at = NOW()
  WHERE status = 'processing'
    AND locked_at < NOW() - (p_stale_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Retry failed jobs that haven't exceeded max attempts
CREATE OR REPLACE FUNCTION public.retry_failed_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.execution_queue
  SET
    status = 'pending',
    scheduled_for = NOW() + (attempts * INTERVAL '5 minutes'), -- Exponential backoff
    updated_at = NOW()
  WHERE status = 'failed'
    AND attempts < max_attempts;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- Rate Limiting Functions
-- ============================================================================

-- Check and optionally increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_workspace_id UUID,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_increment BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  max_count INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_size INTEGER;
  v_max_count INTEGER;
  v_current_count INTEGER;
  v_record_id UUID;
BEGIN
  -- Get default config based on resource type
  SELECT
    CASE p_resource_type
      WHEN 'email' THEN 60
      WHEN 'linkedin' THEN 60
      WHEN 'sms' THEN 60
      WHEN 'claude_api' THEN 1
      WHEN 'embedding' THEN 1
      ELSE 60
    END,
    CASE p_resource_type
      WHEN 'email' THEN 50
      WHEN 'linkedin' THEN 25
      WHEN 'sms' THEN 100
      WHEN 'claude_api' THEN 100
      WHEN 'embedding' THEN 500
      ELSE 100
    END
  INTO v_window_size, v_max_count;

  -- Calculate current window start (truncate to window size)
  v_window_start := date_trunc('hour', NOW()) +
    floor(EXTRACT(MINUTE FROM NOW()) / v_window_size) * (v_window_size || ' minutes')::INTERVAL;

  -- Try to get or create rate limit record
  SELECT id, current_count, max_count
  INTO v_record_id, v_current_count, v_max_count
  FROM public.rate_limits
  WHERE workspace_id = p_workspace_id
    AND resource_type = p_resource_type
    AND COALESCE(resource_id, '') = COALESCE(p_resource_id, '')
    AND window_start = v_window_start;

  IF v_record_id IS NULL THEN
    -- Create new record
    INSERT INTO public.rate_limits (workspace_id, resource_type, resource_id, window_start, window_size_minutes, current_count, max_count)
    VALUES (p_workspace_id, p_resource_type, p_resource_id, v_window_start, v_window_size, 0, v_max_count)
    ON CONFLICT (workspace_id, resource_type, COALESCE(resource_id, ''), window_start)
    DO UPDATE SET updated_at = NOW()
    RETURNING id, current_count, max_count INTO v_record_id, v_current_count, v_max_count;
  END IF;

  -- Check if allowed
  IF v_current_count >= v_max_count THEN
    -- Calculate retry after (seconds until window resets)
    RETURN QUERY SELECT
      FALSE,
      v_current_count,
      v_max_count,
      EXTRACT(EPOCH FROM (v_window_start + (v_window_size || ' minutes')::INTERVAL - NOW()))::INTEGER;
    RETURN;
  END IF;

  -- Optionally increment
  IF p_increment THEN
    UPDATE public.rate_limits
    SET current_count = current_count + 1, updated_at = NOW()
    WHERE id = v_record_id;
    v_current_count := v_current_count + 1;
  END IF;

  RETURN QUERY SELECT TRUE, v_current_count, v_max_count, 0;
END;
$$;

-- ============================================================================
-- Queue Stats View
-- ============================================================================

CREATE OR REPLACE VIEW public.queue_stats AS
SELECT
  job_type,
  status,
  COUNT(*) as count,
  MIN(scheduled_for) as earliest_scheduled,
  MAX(scheduled_for) as latest_scheduled,
  AVG(attempts) as avg_attempts
FROM public.execution_queue
GROUP BY job_type, status;

-- ============================================================================
-- Cleanup Function (for periodic maintenance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_queue_jobs(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.execution_queue
  WHERE status IN ('completed', 'cancelled')
    AND completed_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Also clean up old rate limit windows
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';

  RETURN v_count;
END;
$$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Execution queue policies
CREATE POLICY "Users can view own workspace queue" ON public.execution_queue
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "Users can insert to own workspace queue" ON public.execution_queue
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "Users can update own workspace queue" ON public.execution_queue
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "Users can delete from own workspace queue" ON public.execution_queue
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Rate limits policies
CREATE POLICY "Users can view own workspace rate limits" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "Users can manage own workspace rate limits" ON public.rate_limits
  FOR ALL TO authenticated
  USING (workspace_id = auth_company_id());

-- ============================================================================
-- Updated_at Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_execution_queue_updated_at ON public.execution_queue;
CREATE TRIGGER update_execution_queue_updated_at
  BEFORE UPDATE ON public.execution_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON public.rate_limits;
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.claim_next_job(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_job(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_locks(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_queue_jobs(INTEGER) TO authenticated;
