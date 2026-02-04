-- ============================================================================
-- RAG-Powered Outreach System
-- Database foundation for semantic search, flow execution, and learning
-- ============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. KNOWLEDGE DOCUMENTS - Store embeddings for RAG retrieval
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  collection TEXT NOT NULL CHECK (collection IN ('company', 'prospects', 'templates', 'patterns', 'conversations', 'general')),
  title TEXT,
  content TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'scrape', 'api', 'manual', 'generated')),
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  parent_document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.knowledge_documents IS 'Stores documents and their embeddings for RAG retrieval';
COMMENT ON COLUMN public.knowledge_documents.collection IS 'Document category for filtered searches';
COMMENT ON COLUMN public.knowledge_documents.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';

-- ============================================================================
-- 2. PROSPECT INTELLIGENCE - Enriched data about prospects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prospect_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  intel_type TEXT NOT NULL CHECK (intel_type IN (
    'company_info', 'tech_stack', 'funding', 'news', 'job_postings',
    'linkedin_profile', 'website_content', 'social_activity', 'competitors',
    'pain_points', 'buying_signals', 'decision_makers'
  )),
  data JSONB NOT NULL,
  source TEXT,
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  summary TEXT,
  embedding vector(1536),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',

  UNIQUE (prospect_id, intel_type, source)
);

COMMENT ON TABLE public.prospect_intelligence IS 'Enriched intelligence data about prospects for personalization';
COMMENT ON COLUMN public.prospect_intelligence.confidence IS 'Confidence score 0-1 for data accuracy';

-- ============================================================================
-- 3. INTERACTION MEMORY - Store all interactions for learning
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interaction_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  prospect_id UUID,
  execution_id UUID,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email_sent', 'email_opened', 'email_clicked', 'email_bounced', 'email_unsubscribed',
    'reply_received', 'reply_positive', 'reply_negative', 'reply_objection',
    'meeting_booked', 'meeting_completed', 'meeting_no_show',
    'linkedin_connection_sent', 'linkedin_connection_accepted', 'linkedin_message_sent',
    'linkedin_message_replied', 'phone_call', 'voicemail', 'conversation'
  )),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'phone', 'sms', 'chat', 'other')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT CHECK (outcome IN ('positive', 'negative', 'neutral', 'pending', 'unknown')),
  outcome_details JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.interaction_memory IS 'Historical record of all prospect interactions for learning';

-- ============================================================================
-- 4. LEARNED PATTERNS - Successful patterns for future use
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'subject_line', 'email_body', 'opening_line', 'value_prop', 'cta',
    'objection_response', 'follow_up', 'timing', 'personalization_hook'
  )),
  segment JSONB DEFAULT '{}'::jsonb,
  pattern_name TEXT NOT NULL,
  pattern_content JSONB NOT NULL,
  example_ids UUID[] DEFAULT '{}',
  success_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  success_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN total_count > 0 THEN success_count::float / total_count::float ELSE 0 END
  ) STORED,
  embedding vector(1536),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.learned_patterns IS 'Successful outreach patterns learned from interactions';
COMMENT ON COLUMN public.learned_patterns.segment IS 'Targeting criteria like {industry, company_size, role}';
COMMENT ON COLUMN public.learned_patterns.success_rate IS 'Auto-calculated success rate';

-- ============================================================================
-- 5. OUTREACH FLOWS - Flow definitions (React Flow format)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.outreach_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  knowledge_bases TEXT[] DEFAULT '{}',
  agent_persona TEXT,
  agent_rules TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{
    "max_emails_per_day": 100,
    "min_delay_between_steps_hours": 24,
    "working_hours_start": 9,
    "working_hours_end": 17,
    "working_days": [1,2,3,4,5],
    "timezone": "America/New_York"
  }'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  version INTEGER DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.outreach_flows IS 'Visual flow definitions for outreach sequences';
COMMENT ON COLUMN public.outreach_flows.nodes IS 'React Flow nodes array';
COMMENT ON COLUMN public.outreach_flows.edges IS 'React Flow edges array';
COMMENT ON COLUMN public.outreach_flows.knowledge_bases IS 'Which collections to search for RAG';

-- ============================================================================
-- 6. FLOW EXECUTIONS - Running flow instances
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.outreach_flows(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  current_node_id TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'waiting', 'paused', 'completed', 'failed', 'cancelled')),
  context JSONB DEFAULT '{}'::jsonb,
  variables JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_action_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  UNIQUE (flow_id, prospect_id)
);

COMMENT ON TABLE public.flow_executions IS 'Running instances of outreach flows for each prospect';
COMMENT ON COLUMN public.flow_executions.context IS 'Accumulated outputs from all nodes';
COMMENT ON COLUMN public.flow_executions.next_action_at IS 'When to wake up for scheduled actions';

-- ============================================================================
-- 7. NODE EXECUTIONS - Individual node execution logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  input_context JSONB DEFAULT '{}'::jsonb,
  retrieved_knowledge JSONB DEFAULT '[]'::jsonb,
  prompt_sent TEXT,
  model_used TEXT,
  tokens_used JSONB DEFAULT '{"input": 0, "output": 0}'::jsonb,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting')),
  error_message TEXT,
  duration_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.node_executions IS 'Detailed execution log for each node in a flow';
COMMENT ON COLUMN public.node_executions.retrieved_knowledge IS 'What RAG returned for this node';
COMMENT ON COLUMN public.node_executions.tool_calls IS 'AI tool calls made during execution';

-- ============================================================================
-- 8. INDEXES
-- ============================================================================

-- Vector similarity indexes (IVFFlat for performance)
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding
  ON public.knowledge_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_prospect_intelligence_embedding
  ON public.prospect_intelligence
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_interaction_memory_embedding
  ON public.interaction_memory
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_embedding
  ON public.learned_patterns
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Knowledge documents indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_workspace_collection
  ON public.knowledge_documents(workspace_id, collection);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tags
  ON public.knowledge_documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_parent
  ON public.knowledge_documents(parent_document_id)
  WHERE parent_document_id IS NOT NULL;

-- Prospect intelligence indexes
CREATE INDEX IF NOT EXISTS idx_prospect_intelligence_prospect_type
  ON public.prospect_intelligence(prospect_id, intel_type);
CREATE INDEX IF NOT EXISTS idx_prospect_intelligence_workspace
  ON public.prospect_intelligence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_prospect_intelligence_expires
  ON public.prospect_intelligence(expires_at)
  WHERE expires_at IS NOT NULL;

-- Interaction memory indexes
CREATE INDEX IF NOT EXISTS idx_interaction_memory_prospect_created
  ON public.interaction_memory(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_memory_workspace
  ON public.interaction_memory(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_memory_execution
  ON public.interaction_memory(execution_id)
  WHERE execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interaction_memory_outcome
  ON public.interaction_memory(workspace_id, outcome)
  WHERE outcome IS NOT NULL;

-- Learned patterns indexes
CREATE INDEX IF NOT EXISTS idx_learned_patterns_workspace_type
  ON public.learned_patterns(workspace_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_success_rate
  ON public.learned_patterns(workspace_id, success_rate DESC)
  WHERE is_active = true AND total_count >= 10;
CREATE INDEX IF NOT EXISTS idx_learned_patterns_segment
  ON public.learned_patterns USING gin(segment);

-- Outreach flows indexes
CREATE INDEX IF NOT EXISTS idx_outreach_flows_workspace_status
  ON public.outreach_flows(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_flows_created_by
  ON public.outreach_flows(created_by);

-- Flow executions indexes
CREATE INDEX IF NOT EXISTS idx_flow_executions_workspace_status
  ON public.flow_executions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow
  ON public.flow_executions(flow_id, status);
CREATE INDEX IF NOT EXISTS idx_flow_executions_prospect
  ON public.flow_executions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_next_action
  ON public.flow_executions(next_action_at)
  WHERE status = 'waiting' AND next_action_at IS NOT NULL;

-- Node executions indexes
CREATE INDEX IF NOT EXISTS idx_node_executions_execution
  ON public.node_executions(execution_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_node_executions_status
  ON public.node_executions(status)
  WHERE status IN ('pending', 'running');

-- ============================================================================
-- 9. RPC FUNCTIONS
-- ============================================================================

-- Search knowledge documents with vector similarity
CREATE OR REPLACE FUNCTION search_knowledge(
  p_workspace_id UUID,
  p_query_embedding vector(1536),
  p_collections TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  collection TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.collection,
    kd.title,
    kd.content,
    kd.metadata,
    kd.tags,
    (1 - (kd.embedding <=> p_query_embedding))::FLOAT as similarity
  FROM public.knowledge_documents kd
  WHERE kd.workspace_id = p_workspace_id
    AND kd.embedding IS NOT NULL
    AND (p_collections IS NULL OR kd.collection = ANY(p_collections))
    AND (1 - (kd.embedding <=> p_query_embedding)) >= p_threshold
  ORDER BY kd.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_knowledge IS 'Search knowledge documents using vector similarity';

-- Search interaction memories with vector similarity
CREATE OR REPLACE FUNCTION search_memories(
  p_workspace_id UUID,
  p_query_embedding vector(1536),
  p_prospect_id UUID DEFAULT NULL,
  p_outcome TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  prospect_id UUID,
  interaction_type TEXT,
  channel TEXT,
  content JSONB,
  outcome TEXT,
  outcome_details JSONB,
  summary TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    im.id,
    im.prospect_id,
    im.interaction_type,
    im.channel,
    im.content,
    im.outcome,
    im.outcome_details,
    im.summary,
    im.created_at,
    (1 - (im.embedding <=> p_query_embedding))::FLOAT as similarity
  FROM public.interaction_memory im
  WHERE im.workspace_id = p_workspace_id
    AND im.embedding IS NOT NULL
    AND (p_prospect_id IS NULL OR im.prospect_id = p_prospect_id)
    AND (p_outcome IS NULL OR im.outcome = p_outcome)
  ORDER BY im.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_memories IS 'Search interaction memories using vector similarity';

-- Search learned patterns with vector similarity
CREATE OR REPLACE FUNCTION search_patterns(
  p_workspace_id UUID,
  p_query_embedding vector(1536),
  p_pattern_type TEXT DEFAULT NULL,
  p_segment JSONB DEFAULT NULL,
  p_min_success_rate FLOAT DEFAULT 0.0,
  p_min_total_count INTEGER DEFAULT 5,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  pattern_type TEXT,
  pattern_name TEXT,
  pattern_content JSONB,
  segment JSONB,
  success_rate FLOAT,
  total_count INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lp.id,
    lp.pattern_type,
    lp.pattern_name,
    lp.pattern_content,
    lp.segment,
    lp.success_rate,
    lp.total_count,
    (1 - (lp.embedding <=> p_query_embedding))::FLOAT as similarity
  FROM public.learned_patterns lp
  WHERE lp.workspace_id = p_workspace_id
    AND lp.embedding IS NOT NULL
    AND lp.is_active = true
    AND (p_pattern_type IS NULL OR lp.pattern_type = p_pattern_type)
    AND lp.success_rate >= p_min_success_rate
    AND lp.total_count >= p_min_total_count
    AND (p_segment IS NULL OR lp.segment @> p_segment)
  ORDER BY lp.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_patterns IS 'Search learned patterns using vector similarity with filtering';

-- Get prospect intelligence with optional semantic search
CREATE OR REPLACE FUNCTION get_prospect_intelligence(
  p_prospect_id UUID,
  p_workspace_id UUID,
  p_intel_types TEXT[] DEFAULT NULL,
  p_include_expired BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  intel_type TEXT,
  data JSONB,
  source TEXT,
  confidence FLOAT,
  summary TEXT,
  fetched_at TIMESTAMPTZ,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.intel_type,
    pi.data,
    pi.source,
    pi.confidence,
    pi.summary,
    pi.fetched_at,
    (pi.expires_at < NOW()) as is_expired
  FROM public.prospect_intelligence pi
  WHERE pi.prospect_id = p_prospect_id
    AND pi.workspace_id = p_workspace_id
    AND (p_intel_types IS NULL OR pi.intel_type = ANY(p_intel_types))
    AND (p_include_expired OR pi.expires_at > NOW())
  ORDER BY pi.confidence DESC, pi.fetched_at DESC;
END;
$$;

COMMENT ON FUNCTION get_prospect_intelligence IS 'Get all intelligence for a prospect';

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_executions ENABLE ROW LEVEL SECURITY;

-- Knowledge documents policies
CREATE POLICY "knowledge_documents_select" ON public.knowledge_documents
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "knowledge_documents_insert" ON public.knowledge_documents
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "knowledge_documents_update" ON public.knowledge_documents
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id())
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "knowledge_documents_delete" ON public.knowledge_documents
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Prospect intelligence policies
CREATE POLICY "prospect_intelligence_select" ON public.prospect_intelligence
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "prospect_intelligence_insert" ON public.prospect_intelligence
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "prospect_intelligence_update" ON public.prospect_intelligence
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id())
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "prospect_intelligence_delete" ON public.prospect_intelligence
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Interaction memory policies
CREATE POLICY "interaction_memory_select" ON public.interaction_memory
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "interaction_memory_insert" ON public.interaction_memory
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "interaction_memory_update" ON public.interaction_memory
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id())
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "interaction_memory_delete" ON public.interaction_memory
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Learned patterns policies
CREATE POLICY "learned_patterns_select" ON public.learned_patterns
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "learned_patterns_insert" ON public.learned_patterns
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "learned_patterns_update" ON public.learned_patterns
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id())
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "learned_patterns_delete" ON public.learned_patterns
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Outreach flows policies
CREATE POLICY "outreach_flows_select" ON public.outreach_flows
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "outreach_flows_insert" ON public.outreach_flows
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "outreach_flows_update" ON public.outreach_flows
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id())
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "outreach_flows_delete" ON public.outreach_flows
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Flow executions policies
CREATE POLICY "flow_executions_select" ON public.flow_executions
  FOR SELECT TO authenticated
  USING (workspace_id = auth_company_id());

CREATE POLICY "flow_executions_insert" ON public.flow_executions
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "flow_executions_update" ON public.flow_executions
  FOR UPDATE TO authenticated
  USING (workspace_id = auth_company_id())
  WITH CHECK (workspace_id = auth_company_id());

CREATE POLICY "flow_executions_delete" ON public.flow_executions
  FOR DELETE TO authenticated
  USING (workspace_id = auth_company_id());

-- Node executions policies (access via flow_execution workspace)
CREATE POLICY "node_executions_select" ON public.node_executions
  FOR SELECT TO authenticated
  USING (
    execution_id IN (
      SELECT id FROM public.flow_executions
      WHERE workspace_id = auth_company_id()
    )
  );

CREATE POLICY "node_executions_insert" ON public.node_executions
  FOR INSERT TO authenticated
  WITH CHECK (
    execution_id IN (
      SELECT id FROM public.flow_executions
      WHERE workspace_id = auth_company_id()
    )
  );

CREATE POLICY "node_executions_update" ON public.node_executions
  FOR UPDATE TO authenticated
  USING (
    execution_id IN (
      SELECT id FROM public.flow_executions
      WHERE workspace_id = auth_company_id()
    )
  );

CREATE POLICY "node_executions_delete" ON public.node_executions
  FOR DELETE TO authenticated
  USING (
    execution_id IN (
      SELECT id FROM public.flow_executions
      WHERE workspace_id = auth_company_id()
    )
  );

-- ============================================================================
-- 11. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER learned_patterns_updated_at
  BEFORE UPDATE ON public.learned_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER outreach_flows_updated_at
  BEFORE UPDATE ON public.outreach_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION search_memories TO authenticated;
GRANT EXECUTE ON FUNCTION search_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_prospect_intelligence TO authenticated;
