-- ═══════════════════════════════════════════════════════════════════
-- Profile Accumulation System
-- Transforms profile from overwrite-per-run to accumulative deepening
-- ═══════════════════════════════════════════════════════════════════

-- 1A. Profile history — every generation is a versioned snapshot
CREATE TABLE IF NOT EXISTS user_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_number INTEGER NOT NULL DEFAULT 1,
  biography TEXT,
  tagline TEXT,
  chapter_summaries JSONB NOT NULL DEFAULT '{}',
  structured_data JSONB NOT NULL DEFAULT '{}',
  assumption_snapshot JSONB DEFAULT '[]',
  data_source_counts JSONB DEFAULT '{}',
  generation_model TEXT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_history_user ON user_profile_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_history_generated ON user_profile_history(user_id, generated_at DESC);

-- RLS
ALTER TABLE user_profile_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile history"
  ON user_profile_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 1B. Profile knowledge — long-lived facts, NEVER deleted by regeneration
CREATE TABLE IF NOT EXISTS user_profile_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,  -- 'skill', 'tool', 'client', 'habit', 'preference', 'fact'
  knowledge TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  source TEXT,  -- 'assumption_confirmed', 'user_stated', 'pattern_detected', 'llm_derived'
  evidence JSONB DEFAULT '[]',
  first_observed_at TIMESTAMPTZ DEFAULT now(),
  last_reinforced_at TIMESTAMPTZ DEFAULT now(),
  times_reinforced INTEGER DEFAULT 1,
  is_locked BOOLEAN DEFAULT false,
  UNIQUE(user_id, category, knowledge)
);

CREATE INDEX IF NOT EXISTS idx_profile_knowledge_user ON user_profile_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_knowledge_category ON user_profile_knowledge(user_id, category);

-- RLS
ALTER TABLE user_profile_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge"
  ON user_profile_knowledge FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own knowledge"
  ON user_profile_knowledge FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 1C. Extend user_profile_biography with accumulation tracking
ALTER TABLE user_profile_biography ADD COLUMN IF NOT EXISTS generation_number INTEGER DEFAULT 1;
ALTER TABLE user_profile_biography ADD COLUMN IF NOT EXISTS knowledge_count INTEGER DEFAULT 0;
ALTER TABLE user_profile_biography ADD COLUMN IF NOT EXISTS profile_depth_score REAL DEFAULT 0;

-- 1D. Extend user_profile_assumptions with lock/persistence
ALTER TABLE user_profile_assumptions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE user_profile_assumptions ADD COLUMN IF NOT EXISTS times_confirmed INTEGER DEFAULT 0;
ALTER TABLE user_profile_assumptions ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now();
