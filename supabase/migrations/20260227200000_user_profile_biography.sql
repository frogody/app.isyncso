-- User Profile Biography tables for SYNC Profile feature

-- 1. user_profile_biography — AI-generated biography and structured traits
CREATE TABLE IF NOT EXISTS public.user_profile_biography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,

  -- AI-generated narrative
  biography TEXT,
  tagline TEXT,

  -- Structured traits (JSON arrays)
  work_style JSONB DEFAULT '[]'::jsonb,
  interests JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  top_coworkers JSONB DEFAULT '[]'::jsonb,
  top_apps JSONB DEFAULT '[]'::jsonb,
  top_clients JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  data_sources_used JSONB DEFAULT '{}'::jsonb,
  generation_model TEXT,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- 2. user_profile_assumptions — Individual AI assumptions users can review
CREATE TABLE IF NOT EXISTS public.user_profile_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,

  category TEXT NOT NULL,
  assumption TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  evidence TEXT,

  status TEXT DEFAULT 'active',
  user_feedback TEXT,
  reviewed_at TIMESTAMPTZ,

  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profile_biography_user_id ON public.user_profile_biography(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_assumptions_user_id ON public.user_profile_assumptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_assumptions_status ON public.user_profile_assumptions(status);

-- Enable RLS
ALTER TABLE public.user_profile_biography ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_assumptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profile_biography (using auth_uid() wrapper per project convention)
CREATE POLICY "Users can view own biography"
  ON public.user_profile_biography FOR SELECT TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "Users can insert own biography"
  ON public.user_profile_biography FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "Users can update own biography"
  ON public.user_profile_biography FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "Users can delete own biography"
  ON public.user_profile_biography FOR DELETE TO authenticated
  USING (user_id = public.auth_uid());

-- RLS Policies for user_profile_assumptions
CREATE POLICY "Users can view own assumptions"
  ON public.user_profile_assumptions FOR SELECT TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "Users can insert own assumptions"
  ON public.user_profile_assumptions FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "Users can update own assumptions"
  ON public.user_profile_assumptions FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "Users can delete own assumptions"
  ON public.user_profile_assumptions FOR DELETE TO authenticated
  USING (user_id = public.auth_uid());
