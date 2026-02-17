-- Sync Morning Briefings
-- Stores daily AI-generated briefings per user

CREATE TABLE IF NOT EXISTS public.sync_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, briefing_date)
);

-- Index for fast user+date lookups (DESC for latest-first)
CREATE INDEX idx_sync_briefings_user_date ON public.sync_briefings(user_id, briefing_date DESC);

-- Enable RLS
ALTER TABLE public.sync_briefings ENABLE ROW LEVEL SECURITY;

-- Users can only read their own briefings
CREATE POLICY "briefings_select" ON public.sync_briefings
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can only insert their own briefings
CREATE POLICY "briefings_insert" ON public.sync_briefings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can only update their own briefings
CREATE POLICY "briefings_update" ON public.sync_briefings
FOR UPDATE TO authenticated
USING (user_id = auth.uid());
