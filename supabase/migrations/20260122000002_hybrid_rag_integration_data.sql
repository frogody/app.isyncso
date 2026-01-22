-- ============================================================================
-- HybridRAG Integration Data System
-- Stores indexed data from external integrations (Gmail, Calendar, HubSpot, etc.)
-- Enables semantic search across all connected data sources
-- ============================================================================

-- Integration data index table for RAG
CREATE TABLE IF NOT EXISTS public.sync_integration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  integration_type TEXT NOT NULL,  -- 'gmail', 'calendar', 'hubspot', 'sheets', 'teams', 'slack'
  external_id TEXT NOT NULL,       -- ID from the external system
  content TEXT NOT NULL,           -- Searchable content
  title TEXT,                      -- Title/subject
  "timestamp" TIMESTAMPTZ,           -- Original timestamp from source
  embedding vector(1024),          -- Vector embedding for semantic search
  metadata JSONB DEFAULT '{}',     -- Additional data from source
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_integration_item UNIQUE (company_id, integration_type, external_id)
);

-- Enable RLS
ALTER TABLE public.sync_integration_data ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "integration_data_select_org" ON public.sync_integration_data
FOR SELECT TO authenticated
USING (company_id = auth_company_id());

CREATE POLICY "integration_data_insert_org" ON public.sync_integration_data
FOR INSERT TO authenticated
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "integration_data_update_org" ON public.sync_integration_data
FOR UPDATE TO authenticated
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "integration_data_delete_org" ON public.sync_integration_data
FOR DELETE TO authenticated
USING (company_id = auth_company_id());

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_integration_data_company ON public.sync_integration_data(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_user ON public.sync_integration_data(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_type ON public.sync_integration_data(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_data_external ON public.sync_integration_data(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_timestamp ON public.sync_integration_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_integration_data_synced ON public.sync_integration_data(synced_at DESC);

-- Full-text search index for content
CREATE INDEX IF NOT EXISTS idx_integration_data_content_fts ON public.sync_integration_data
USING gin(to_tsvector('english', content));

-- Vector index for semantic search (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_integration_data_embedding ON public.sync_integration_data
USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- Search Functions
-- ============================================================================

-- Semantic search across integration data
CREATE OR REPLACE FUNCTION public.search_integration_data(
  query_embedding vector(1024),
  match_company_id UUID,
  match_user_id UUID DEFAULT NULL,
  match_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  integration_type TEXT,
  external_id TEXT,
  content TEXT,
  title TEXT,
  "timestamp" TIMESTAMPTZ,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
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
    d.id,
    d.integration_type,
    d.external_id,
    d.content,
    d.title,
    d.timestamp,
    d.metadata,
    d.synced_at,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.sync_integration_data d
  WHERE d.company_id = match_company_id
    AND (match_user_id IS NULL OR d.user_id = match_user_id)
    AND (match_types IS NULL OR d.integration_type = ANY(match_types))
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Hybrid search combining vector + full-text
CREATE OR REPLACE FUNCTION public.search_sync_memory_hybrid(
  query_embedding vector(1024),
  match_company_id UUID,
  match_user_id UUID DEFAULT NULL,
  match_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  chunk_type TEXT,
  content TEXT,
  metadata JSONB,
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
    m.id,
    m.chunk_type,
    m.content,
    m.metadata,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.sync_memory_chunks m
  WHERE m.company_id = match_company_id
    AND (match_user_id IS NULL OR m.user_id = match_user_id)
    AND (match_types IS NULL OR m.chunk_type = ANY(match_types))
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- ============================================================================
-- Knowledge Graph Tables (if not exist)
-- ============================================================================

-- Entity nodes
CREATE TABLE IF NOT EXISTS public.sync_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  entity_type TEXT NOT NULL,       -- 'client', 'prospect', 'product', 'task', 'invoice', 'meeting', 'email', etc.
  entity_id TEXT,                  -- Reference ID from source table
  entity_name TEXT NOT NULL,
  attributes JSONB DEFAULT '{}',
  embedding vector(1024),
  confidence_score FLOAT DEFAULT 0.5,
  interaction_count INT DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_entity UNIQUE (company_id, entity_type, entity_id)
);

-- Entity relationships (edges)
CREATE TABLE IF NOT EXISTS public.sync_entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  from_entity_id UUID REFERENCES public.sync_entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES public.sync_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'owns', 'purchased', 'contacted', 'worked_on', 'manages', 'participated_in', 'created_for', 'related_to'
  strength FLOAT DEFAULT 0.5,      -- Relationship strength (0-1)
  context JSONB DEFAULT '{}',      -- Additional context
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_relationship UNIQUE (company_id, from_entity_id, to_entity_id, relationship_type)
);

-- Entity interactions log
CREATE TABLE IF NOT EXISTS public.sync_entity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  entity_id UUID REFERENCES public.sync_entities(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,  -- 'mentioned', 'queried', 'updated', 'created'
  context TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on graph tables
ALTER TABLE public.sync_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_entity_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for entities
CREATE POLICY "entities_select_org" ON public.sync_entities
FOR SELECT TO authenticated USING (company_id = auth_company_id());

CREATE POLICY "entities_insert_org" ON public.sync_entities
FOR INSERT TO authenticated WITH CHECK (company_id = auth_company_id());

CREATE POLICY "entities_update_org" ON public.sync_entities
FOR UPDATE TO authenticated USING (company_id = auth_company_id());

CREATE POLICY "entities_delete_org" ON public.sync_entities
FOR DELETE TO authenticated USING (company_id = auth_company_id());

-- RLS policies for relationships
CREATE POLICY "relationships_select_org" ON public.sync_entity_relationships
FOR SELECT TO authenticated USING (company_id = auth_company_id());

CREATE POLICY "relationships_insert_org" ON public.sync_entity_relationships
FOR INSERT TO authenticated WITH CHECK (company_id = auth_company_id());

CREATE POLICY "relationships_update_org" ON public.sync_entity_relationships
FOR UPDATE TO authenticated USING (company_id = auth_company_id());

CREATE POLICY "relationships_delete_org" ON public.sync_entity_relationships
FOR DELETE TO authenticated USING (company_id = auth_company_id());

-- RLS policies for interactions
CREATE POLICY "interactions_select_org" ON public.sync_entity_interactions
FOR SELECT TO authenticated USING (company_id = auth_company_id());

CREATE POLICY "interactions_insert_org" ON public.sync_entity_interactions
FOR INSERT TO authenticated WITH CHECK (company_id = auth_company_id());

-- Indexes for graph tables
CREATE INDEX IF NOT EXISTS idx_entities_company ON public.sync_entities(company_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.sync_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON public.sync_entities(entity_name);
CREATE INDEX IF NOT EXISTS idx_entities_interaction ON public.sync_entities(interaction_count DESC);
CREATE INDEX IF NOT EXISTS idx_entities_embedding ON public.sync_entities USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_relationships_company ON public.sync_entity_relationships(company_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON public.sync_entity_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON public.sync_entity_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON public.sync_entity_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_interactions_entity ON public.sync_entity_interactions(entity_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON public.sync_entity_interactions(created_at DESC);

-- ============================================================================
-- Graph Helper Functions
-- ============================================================================

-- Upsert entity
CREATE OR REPLACE FUNCTION public.upsert_sync_entity(
  p_company_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_name TEXT,
  p_attributes JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.sync_entities (company_id, entity_type, entity_id, entity_name, attributes)
  VALUES (p_company_id, p_entity_type, p_entity_id, p_name, p_attributes)
  ON CONFLICT (company_id, entity_type, entity_id)
  DO UPDATE SET
    entity_name = EXCLUDED.entity_name,
    attributes = sync_entities.attributes || EXCLUDED.attributes,
    interaction_count = sync_entities.interaction_count + 1,
    last_interaction = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Upsert relationship
CREATE OR REPLACE FUNCTION public.upsert_entity_relationship(
  p_company_id UUID,
  p_from_entity_id UUID,
  p_to_entity_id UUID,
  p_relationship_type TEXT,
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.sync_entity_relationships
    (company_id, from_entity_id, to_entity_id, relationship_type, context)
  VALUES (p_company_id, p_from_entity_id, p_to_entity_id, p_relationship_type, p_context)
  ON CONFLICT (company_id, from_entity_id, to_entity_id, relationship_type)
  DO UPDATE SET
    strength = LEAST(sync_entity_relationships.strength + 0.1, 1.0),
    context = sync_entity_relationships.context || EXCLUDED.context,
    last_interaction_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Log entity interaction
CREATE OR REPLACE FUNCTION public.log_entity_interaction(
  p_company_id UUID,
  p_user_id UUID,
  p_entity_id UUID,
  p_interaction_type TEXT,
  p_context TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the interaction
  INSERT INTO public.sync_entity_interactions
    (company_id, user_id, entity_id, interaction_type, context, session_id)
  VALUES (p_company_id, p_user_id, p_entity_id, p_interaction_type, p_context, p_session_id);

  -- Update entity interaction count
  UPDATE public.sync_entities
  SET
    interaction_count = interaction_count + 1,
    last_interaction = NOW()
  WHERE id = p_entity_id;
END;
$$;

-- Get entity graph (1-hop)
CREATE OR REPLACE FUNCTION public.get_entity_graph(
  p_company_id UUID,
  p_entity_id UUID
)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  entity_name TEXT,
  attributes JSONB,
  related_entity_id UUID,
  related_type TEXT,
  related_name TEXT,
  relationship_type TEXT,
  relationship_strength FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS entity_id,
    e.entity_type,
    e.entity_name,
    e.attributes,
    r.to_entity_id AS related_entity_id,
    re.entity_type AS related_type,
    re.entity_name AS related_name,
    r.relationship_type,
    r.strength AS relationship_strength
  FROM public.sync_entities e
  LEFT JOIN public.sync_entity_relationships r ON e.id = r.from_entity_id
  LEFT JOIN public.sync_entities re ON r.to_entity_id = re.id
  WHERE e.company_id = p_company_id AND e.id = p_entity_id

  UNION ALL

  SELECT
    e.id AS entity_id,
    e.entity_type,
    e.entity_name,
    e.attributes,
    r.from_entity_id AS related_entity_id,
    re.entity_type AS related_type,
    re.entity_name AS related_name,
    r.relationship_type,
    r.strength AS relationship_strength
  FROM public.sync_entities e
  LEFT JOIN public.sync_entity_relationships r ON e.id = r.to_entity_id
  LEFT JOIN public.sync_entities re ON r.from_entity_id = re.id
  WHERE e.company_id = p_company_id AND e.id = p_entity_id;
END;
$$;

-- Get active entities
CREATE OR REPLACE FUNCTION public.get_active_entities(
  p_company_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  attributes JSONB,
  confidence_score FLOAT,
  interaction_count INT,
  last_interaction TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.entity_name,
    e.attributes,
    e.confidence_score,
    e.interaction_count,
    e.last_interaction
  FROM public.sync_entities e
  WHERE e.company_id = p_company_id
    AND (p_entity_type IS NULL OR e.entity_type = p_entity_type)
    AND (p_since IS NULL OR e.last_interaction >= p_since)
  ORDER BY e.interaction_count DESC, e.last_interaction DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS sync_integration_data_updated_at ON public.sync_integration_data;
CREATE TRIGGER sync_integration_data_updated_at
  BEFORE UPDATE ON public.sync_integration_data
  FOR EACH ROW EXECUTE FUNCTION public.update_sync_updated_at();

DROP TRIGGER IF EXISTS sync_entities_updated_at ON public.sync_entities;
CREATE TRIGGER sync_entities_updated_at
  BEFORE UPDATE ON public.sync_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_sync_updated_at();

DROP TRIGGER IF EXISTS sync_relationships_updated_at ON public.sync_entity_relationships;
CREATE TRIGGER sync_relationships_updated_at
  BEFORE UPDATE ON public.sync_entity_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_sync_updated_at();
