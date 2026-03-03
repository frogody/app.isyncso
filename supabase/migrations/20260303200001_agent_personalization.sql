-- ============================================================================
-- Agent Personalization: Scheduling Recommendations + SYNC Feedback + Learned Preferences
-- Stream 2 of Phase 4: Deep Intelligence
-- ============================================================================

-- 1. Scheduling Recommendations (LLM-generated from behavioral signatures)
CREATE TABLE IF NOT EXISTS public.scheduling_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  based_on_signatures JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduling_recommendations_user
  ON public.scheduling_recommendations(user_id);

ALTER TABLE public.scheduling_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_recommendations_select"
  ON public.scheduling_recommendations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "scheduling_recommendations_insert"
  ON public.scheduling_recommendations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "scheduling_recommendations_update"
  ON public.scheduling_recommendations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 2. SYNC Response Feedback (thumbs up/down, copy, regenerate, etc.)
CREATE TABLE IF NOT EXISTS public.sync_response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  session_id TEXT,
  message_content TEXT,
  response_content TEXT,
  action_type TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'thumbs_up', 'thumbs_down', 'copied', 'used_action', 'regenerated', 'edited_before_send'
  )),
  feedback_detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_response_feedback_user
  ON public.sync_response_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_sync_response_feedback_type
  ON public.sync_response_feedback(user_id, feedback_type);

ALTER TABLE public.sync_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_response_feedback_insert"
  ON public.sync_response_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sync_response_feedback_select"
  ON public.sync_response_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. SYNC Learned Preferences (derived from feedback patterns)
CREATE TABLE IF NOT EXISTS public.sync_learned_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL CHECK (preference_type IN (
    'communication_style', 'response_length', 'formality', 'proactivity',
    'detail_level', 'language', 'module_affinity'
  )),
  preference_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0.5000,
  sample_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_type)
);

CREATE INDEX IF NOT EXISTS idx_sync_learned_preferences_user
  ON public.sync_learned_preferences(user_id);

ALTER TABLE public.sync_learned_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_learned_preferences_select"
  ON public.sync_learned_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sync_learned_preferences_insert"
  ON public.sync_learned_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sync_learned_preferences_update"
  ON public.sync_learned_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
