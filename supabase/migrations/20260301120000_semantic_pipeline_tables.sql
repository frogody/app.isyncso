-- Semantic Pipeline Tables
-- Receives data from the SYNC Desktop semantic pipeline (EntityRegistry, SemanticProcessor,
-- ThreadManager, IntentClassifier, SignatureComputer). Each table matches the exact shape
-- sent by cloudSyncService.ts sync methods.

-- ============================================================================
-- 1. semantic_entities — UNIQUE(user_id, entity_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.semantic_entities (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  privacy_level TEXT DEFAULT 'sync_allowed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_semantic_entities_user_created
  ON public.semantic_entities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_entities_company
  ON public.semantic_entities(company_id);

ALTER TABLE public.semantic_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own semantic entities"
  ON public.semantic_entities FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Users can insert own semantic entities"
  ON public.semantic_entities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users can update own semantic entities"
  ON public.semantic_entities FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

-- ============================================================================
-- 2. semantic_activities — UNIQUE(user_id, activity_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.semantic_activities (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID,
  activity_id TEXT NOT NULL,
  event_id TEXT,
  activity_type TEXT NOT NULL,
  activity_subtype TEXT,
  confidence REAL DEFAULT 0.5,
  classification_method TEXT,
  duration_ms INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  privacy_level TEXT DEFAULT 'sync_allowed',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_semantic_activities_user_created
  ON public.semantic_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_activities_company
  ON public.semantic_activities(company_id);

ALTER TABLE public.semantic_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own semantic activities"
  ON public.semantic_activities FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Users can insert own semantic activities"
  ON public.semantic_activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users can update own semantic activities"
  ON public.semantic_activities FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

-- ============================================================================
-- 3. semantic_threads — UNIQUE(user_id, thread_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.semantic_threads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID,
  thread_id TEXT NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  event_count INTEGER DEFAULT 0,
  primary_entities JSONB DEFAULT '[]'::jsonb,
  primary_activity_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  privacy_level TEXT DEFAULT 'sync_allowed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_semantic_threads_user_created
  ON public.semantic_threads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_threads_company
  ON public.semantic_threads(company_id);

ALTER TABLE public.semantic_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own semantic threads"
  ON public.semantic_threads FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Users can insert own semantic threads"
  ON public.semantic_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users can update own semantic threads"
  ON public.semantic_threads FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

-- ============================================================================
-- 4. semantic_intents — UNIQUE(user_id, intent_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.semantic_intents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID,
  intent_id TEXT NOT NULL,
  thread_id TEXT,
  intent_type TEXT NOT NULL,
  intent_subtype TEXT,
  confidence REAL DEFAULT 0.5,
  classification_method TEXT,
  evidence JSONB DEFAULT '[]'::jsonb,
  resolved_at TIMESTAMPTZ,
  outcome TEXT,
  privacy_level TEXT DEFAULT 'sync_allowed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, intent_id)
);

CREATE INDEX IF NOT EXISTS idx_semantic_intents_user_created
  ON public.semantic_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_intents_company
  ON public.semantic_intents(company_id);

ALTER TABLE public.semantic_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own semantic intents"
  ON public.semantic_intents FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Users can insert own semantic intents"
  ON public.semantic_intents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users can update own semantic intents"
  ON public.semantic_intents FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

-- ============================================================================
-- 5. behavioral_signatures — UNIQUE(user_id, category, metric_name, window_days)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.behavioral_signatures (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID,
  signature_id TEXT NOT NULL,
  category TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  current_value JSONB DEFAULT '{}'::jsonb,
  trend TEXT DEFAULT 'stable',
  confidence REAL DEFAULT 0.5,
  sample_size INTEGER DEFAULT 0,
  window_days INTEGER DEFAULT 7,
  computed_at TIMESTAMPTZ NOT NULL,
  privacy_level TEXT DEFAULT 'sync_allowed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category, metric_name, window_days)
);

CREATE INDEX IF NOT EXISTS idx_behavioral_signatures_user_created
  ON public.behavioral_signatures(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_signatures_company
  ON public.behavioral_signatures(company_id);

ALTER TABLE public.behavioral_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own behavioral signatures"
  ON public.behavioral_signatures FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Users can insert own behavioral signatures"
  ON public.behavioral_signatures FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users can update own behavioral signatures"
  ON public.behavioral_signatures FOR UPDATE TO authenticated
  USING (user_id = auth_uid());
