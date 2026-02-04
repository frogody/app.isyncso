-- ============================================================================
-- Switch from OpenAI text-embedding-3-small (1536) to Together.ai BAAI/bge-large-en-v1.5 (1024)
-- Together.ai is already configured and used by the SYNC memory system
-- ============================================================================

-- Drop existing HNSW indexes (they reference 1536-dimension vectors)
DROP INDEX IF EXISTS idx_knowledge_documents_embedding;
DROP INDEX IF EXISTS idx_prospect_intelligence_embedding;
DROP INDEX IF EXISTS idx_interaction_memory_embedding;
DROP INDEX IF EXISTS idx_learned_patterns_embedding;

-- Alter embedding columns to 1024 dimensions
ALTER TABLE public.knowledge_documents
  ALTER COLUMN embedding TYPE vector(1024);

ALTER TABLE public.prospect_intelligence
  ALTER COLUMN embedding TYPE vector(1024);

ALTER TABLE public.interaction_memory
  ALTER COLUMN embedding TYPE vector(1024);

ALTER TABLE public.learned_patterns
  ALTER COLUMN embedding TYPE vector(1024);

-- Recreate HNSW indexes for 1024-dimension vectors
CREATE INDEX idx_knowledge_documents_embedding
  ON public.knowledge_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_prospect_intelligence_embedding
  ON public.prospect_intelligence USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_interaction_memory_embedding
  ON public.interaction_memory USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_learned_patterns_embedding
  ON public.learned_patterns USING hnsw (embedding vector_cosine_ops);

-- Update RPC functions to accept vector(1024) instead of vector(1536)

CREATE OR REPLACE FUNCTION search_knowledge(
  p_workspace_id UUID,
  p_query_embedding vector(1024),
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

CREATE OR REPLACE FUNCTION search_memories(
  p_workspace_id UUID,
  p_query_embedding vector(1024),
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

CREATE OR REPLACE FUNCTION search_patterns(
  p_workspace_id UUID,
  p_query_embedding vector(1024),
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
