-- SYNC Profile v2: Memory imports + Activity log

-- 1. user_memory_imports — stores uploaded AI conversation exports
CREATE TABLE IF NOT EXISTS public.user_memory_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  provider TEXT NOT NULL,             -- 'chatgpt', 'claude', 'generic'
  original_filename TEXT,
  storage_path TEXT,
  topics JSONB DEFAULT '[]',          -- [{topic, frequency}]
  preferences JSONB DEFAULT '[]',     -- [{category, preference, confidence}]
  key_facts JSONB DEFAULT '[]',       -- [{fact, source_context}]
  writing_style TEXT,
  summary TEXT,
  conversation_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',      -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_imports_user ON public.user_memory_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_imports_status ON public.user_memory_imports(status);

-- RLS
ALTER TABLE public.user_memory_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory imports"
  ON public.user_memory_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory imports"
  ON public.user_memory_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory imports"
  ON public.user_memory_imports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory imports"
  ON public.user_memory_imports FOR DELETE
  USING (auth.uid() = user_id);

-- 2. user_activity_log — tracks in-app user actions
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  event_type TEXT NOT NULL,       -- 'page_view', 'action', 'search', 'create', 'update'
  event_name TEXT NOT NULL,       -- 'viewed_finance', 'created_invoice', etc.
  page_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.user_activity_log(event_type);

-- RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Extend user_profile_biography with new fields (safe ALTER — adds columns if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'daily_rhythms') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN daily_rhythms JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'superpowers_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN superpowers_summary TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'work_dna_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN work_dna_summary TEXT;
  END IF;
END $$;
