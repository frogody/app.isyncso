-- Usage Tracking: Tracks feature usage per user for adaptive UI
-- Phase 4 Stream 3 (A-6): Predictive UI Personalization

CREATE TABLE IF NOT EXISTS public.user_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  feature_key TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  uses_last_7d INTEGER DEFAULT 0,
  uses_last_30d INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_user ON public.user_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_feature ON public.user_feature_usage(feature_key);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_count ON public.user_feature_usage(user_id, usage_count DESC);

-- RLS
ALTER TABLE public.user_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_feature_usage_select" ON public.user_feature_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_feature_usage_insert" ON public.user_feature_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_feature_usage_update" ON public.user_feature_usage
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
