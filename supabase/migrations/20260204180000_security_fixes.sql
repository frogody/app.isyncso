-- ============================================================================
-- Security Fixes Migration
-- Performance indexes + claim_next_job input validation
-- ============================================================================

-- ============================================================================
-- 1. Performance Indexes
-- ============================================================================

-- Flow executions: lookup by status and workspace
CREATE INDEX IF NOT EXISTS idx_flow_executions_status
  ON public.flow_executions (status);

CREATE INDEX IF NOT EXISTS idx_flow_executions_workspace_status
  ON public.flow_executions (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id
  ON public.flow_executions (flow_id);

CREATE INDEX IF NOT EXISTS idx_flow_executions_next_action
  ON public.flow_executions (next_action_at)
  WHERE status = 'waiting';

-- Node executions: lookup by execution
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id
  ON public.node_executions (execution_id);

CREATE INDEX IF NOT EXISTS idx_node_executions_status
  ON public.node_executions (status);

-- Execution queue: job processing
CREATE INDEX IF NOT EXISTS idx_execution_queue_status_scheduled
  ON public.execution_queue (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_execution_queue_worker
  ON public.execution_queue (locked_by)
  WHERE locked_by IS NOT NULL;

-- Knowledge documents: search and lookup
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_workspace_collection
  ON public.knowledge_documents (workspace_id, collection);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_parent
  ON public.knowledge_documents (parent_document_id)
  WHERE parent_document_id IS NOT NULL;

-- Interaction memory: prospect lookup
CREATE INDEX IF NOT EXISTS idx_interaction_memory_prospect
  ON public.interaction_memory (prospect_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interaction_memory_workspace
  ON public.interaction_memory (workspace_id);

-- ============================================================================
-- 2. Secure claim_next_job with input validation
-- ============================================================================

DROP FUNCTION IF EXISTS public.claim_next_job(TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION public.claim_next_job(
  p_worker_id TEXT,
  p_job_types TEXT[] DEFAULT ARRAY['timer', 'send_email', 'send_linkedin', 'send_sms', 'webhook', 'retry', 'follow_up']
)
RETURNS SETOF public.execution_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_types TEXT[] := ARRAY['timer', 'send_email', 'send_linkedin', 'send_sms', 'webhook', 'retry', 'follow_up'];
  v_type TEXT;
BEGIN
  -- Validate worker_id: alphanumeric + hyphens only, max 64 chars
  IF p_worker_id IS NULL OR length(p_worker_id) = 0 OR length(p_worker_id) > 64 THEN
    RAISE EXCEPTION 'Invalid worker_id: must be 1-64 characters';
  END IF;

  IF p_worker_id !~ '^[a-zA-Z0-9_-]+$' THEN
    RAISE EXCEPTION 'Invalid worker_id: only alphanumeric, hyphens, and underscores allowed';
  END IF;

  -- Validate job types against whitelist
  IF p_job_types IS NOT NULL THEN
    FOREACH v_type IN ARRAY p_job_types LOOP
      IF NOT (v_type = ANY(v_allowed_types)) THEN
        RAISE EXCEPTION 'Invalid job type: %', v_type;
      END IF;
    END LOOP;
  END IF;

  -- Claim the next available job atomically
  RETURN QUERY
  UPDATE public.execution_queue
  SET
    status = 'processing',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempts = attempts + 1
  WHERE id = (
    SELECT id
    FROM public.execution_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND job_type = ANY(p_job_types)
    ORDER BY priority ASC, scheduled_for ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
