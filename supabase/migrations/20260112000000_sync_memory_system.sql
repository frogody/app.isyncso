-- ============================================================================
-- SYNC Memory System Migration
-- Adds persistent memory, vector search, entity tracking, and action templates
-- ============================================================================

-- Note: pgvector extension already enabled via Supabase Dashboard

-- ============================================================================
-- SYNC SESSIONS (Replaces in-memory Map)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  company_id UUID,

  -- Buffer memory (recent messages)
  messages JSONB DEFAULT '[]',

  -- Compressed history
  conversation_summary TEXT,
  summary_last_updated TIMESTAMPTZ,
  summary_message_count INTEGER DEFAULT 0,

  -- Active entities in conversation
  active_entities JSONB DEFAULT '{"clients":[],"products":[],"preferences":{},"current_intent":null}',

  -- Metadata
  context JSONB DEFAULT '{}',
  last_agent TEXT DEFAULT 'sync',
  total_messages INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sync_sessions
CREATE INDEX IF NOT EXISTS idx_sync_sessions_user ON sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_company ON sync_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_session ON sync_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_activity ON sync_sessions(last_activity DESC);

-- ============================================================================
-- SYNC MEMORY CHUNKS (For RAG - Semantic Search)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id UUID,
  organization_id UUID,
  company_id UUID,

  -- Content
  chunk_type TEXT NOT NULL CHECK (chunk_type IN (
    'conversation', 'summary', 'entity', 'action_success', 'action_template', 'preference'
  )),
  content TEXT NOT NULL,

  -- Vector embedding (1024 dimensions for BAAI/bge-large-en-v1.5)
  embedding extensions.vector(1024),

  -- Metadata for filtering
  metadata JSONB DEFAULT '{}',

  -- Relevance scoring helpers
  importance_score FLOAT DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index (IVFFlat for performance)
CREATE INDEX IF NOT EXISTS idx_sync_memory_embedding ON sync_memory_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_sync_memory_user ON sync_memory_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_memory_company ON sync_memory_chunks(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_memory_type ON sync_memory_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_sync_memory_session ON sync_memory_chunks(session_id);

-- ============================================================================
-- SYNC ENTITIES (Long-term Entity Memory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  company_id UUID,

  -- Entity identification
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'client', 'prospect', 'product', 'supplier', 'preference', 'workflow'
  )),
  entity_id UUID,  -- Reference to actual entity in database
  entity_name TEXT NOT NULL,

  -- Learned attributes
  attributes JSONB DEFAULT '{}',

  -- Interaction history
  interaction_count INTEGER DEFAULT 1,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  first_seen TIMESTAMPTZ DEFAULT NOW(),

  -- Vector embedding for semantic entity search
  embedding extensions.vector(1024),

  -- Confidence/freshness
  confidence_score FLOAT DEFAULT 0.5,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sync_entities
CREATE INDEX IF NOT EXISTS idx_sync_entities_user ON sync_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_entities_company ON sync_entities(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_entities_type ON sync_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_entities_name ON sync_entities(entity_name);
CREATE INDEX IF NOT EXISTS idx_sync_entities_embedding ON sync_entities
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================================
-- SYNC ACTION TEMPLATES (For better action-taking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  company_id UUID,

  -- Action details
  action_type TEXT NOT NULL,
  intent_description TEXT NOT NULL,
  example_request TEXT NOT NULL,
  action_data JSONB NOT NULL,

  -- Success tracking
  success_count INTEGER DEFAULT 1,
  failure_count INTEGER DEFAULT 0,

  -- Vector embedding for semantic matching
  embedding extensions.vector(1024),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sync_action_templates
CREATE INDEX IF NOT EXISTS idx_sync_action_templates_user ON sync_action_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_action_templates_company ON sync_action_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_action_templates_type ON sync_action_templates(action_type);
CREATE INDEX IF NOT EXISTS idx_sync_action_templates_embedding ON sync_action_templates
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_action_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access on sync_sessions" ON sync_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on sync_memory_chunks" ON sync_memory_chunks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on sync_entities" ON sync_entities
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on sync_action_templates" ON sync_action_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Users can access their own data (for direct client access)
CREATE POLICY "Users access own sessions" ON sync_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own memory chunks" ON sync_memory_chunks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own entities" ON sync_entities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own action templates" ON sync_action_templates
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================================================

-- Semantic search function for memory retrieval
CREATE OR REPLACE FUNCTION search_sync_memory(
  query_embedding extensions.vector(1024),
  match_user_id UUID,
  match_company_id UUID DEFAULT NULL,
  match_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.6,
  match_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  chunk_type TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.chunk_type,
    m.content,
    m.metadata,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM sync_memory_chunks m
  WHERE m.user_id = match_user_id
    AND (match_company_id IS NULL OR m.company_id = match_company_id)
    AND (match_types IS NULL OR m.chunk_type = ANY(match_types))
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Entity search function
CREATE OR REPLACE FUNCTION search_sync_entities(
  query_embedding extensions.vector(1024),
  match_user_id UUID,
  match_company_id UUID DEFAULT NULL,
  match_types TEXT[] DEFAULT NULL,
  match_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_name TEXT,
  entity_id UUID,
  attributes JSONB,
  interaction_count INT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_name,
    e.entity_id,
    e.attributes,
    e.interaction_count,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM sync_entities e
  WHERE e.user_id = match_user_id
    AND (match_company_id IS NULL OR e.company_id = match_company_id)
    AND (match_types IS NULL OR e.entity_type = ANY(match_types))
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Action template search function
CREATE OR REPLACE FUNCTION search_action_templates(
  query_embedding extensions.vector(1024),
  match_user_id UUID DEFAULT NULL,
  match_company_id UUID DEFAULT NULL,
  match_action_type TEXT DEFAULT NULL,
  match_limit INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  action_type TEXT,
  intent_description TEXT,
  example_request TEXT,
  action_data JSONB,
  success_count INT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.action_type,
    t.intent_description,
    t.example_request,
    t.action_data,
    t.success_count,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM sync_action_templates t
  WHERE (match_user_id IS NULL OR t.user_id = match_user_id)
    AND (match_company_id IS NULL OR t.company_id = match_company_id)
    AND (match_action_type IS NULL OR t.action_type = match_action_type)
    AND t.embedding IS NOT NULL
  ORDER BY
    t.embedding <=> query_embedding,
    t.success_count DESC
  LIMIT match_limit;
END;
$$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update session last activity
CREATE OR REPLACE FUNCTION update_sync_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_sessions_activity_trigger
  BEFORE UPDATE ON sync_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_session_activity();

-- Increment entity interaction count
CREATE OR REPLACE FUNCTION increment_entity_interaction(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entity_id UUID;
BEGIN
  UPDATE sync_entities
  SET
    interaction_count = interaction_count + 1,
    last_interaction = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND entity_type = p_entity_type
    AND LOWER(entity_name) = LOWER(p_entity_name)
  RETURNING id INTO v_entity_id;

  RETURN v_entity_id;
END;
$$;

-- Increment action template success count
CREATE OR REPLACE FUNCTION increment_action_template_success(
  p_template_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sync_action_templates
  SET
    success_count = success_count + 1,
    updated_at = NOW()
  WHERE id = p_template_id;
END;
$$;

-- Clean up old memory chunks (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_sync_memory(
  days_old INT DEFAULT 90
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM sync_memory_chunks
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
    AND chunk_type NOT IN ('preference', 'action_template')
    AND importance_score < 0.8;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sync_sessions IS 'Persistent SYNC chat sessions with buffer memory and context';
COMMENT ON TABLE sync_memory_chunks IS 'Vector-indexed memory chunks for RAG retrieval';
COMMENT ON TABLE sync_entities IS 'Long-term entity memory (clients, products, preferences)';
COMMENT ON TABLE sync_action_templates IS 'Successful action patterns for intent matching';

COMMENT ON FUNCTION search_sync_memory IS 'Semantic search for relevant memory chunks';
COMMENT ON FUNCTION search_sync_entities IS 'Semantic search for relevant entities';
COMMENT ON FUNCTION search_action_templates IS 'Semantic search for matching action templates';
