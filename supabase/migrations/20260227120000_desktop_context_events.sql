-- Deep Context Events from Desktop App
-- Receives rich activity context from the DeepContextEngine

CREATE TABLE IF NOT EXISTS public.desktop_context_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  event_type TEXT NOT NULL,
  source_application TEXT,
  source_window_title TEXT,
  summary TEXT,
  entities JSONB DEFAULT '[]'::jsonb,
  intent TEXT,
  commitments JSONB DEFAULT '[]'::jsonb,
  skill_signals JSONB DEFAULT '[]'::jsonb,
  confidence REAL DEFAULT 0.5,
  privacy_level TEXT DEFAULT 'sync_allowed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_dce_user_created
  ON public.desktop_context_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dce_type
  ON public.desktop_context_events(event_type);
CREATE INDEX IF NOT EXISTS idx_dce_company
  ON public.desktop_context_events(company_id, created_at DESC);

-- RLS
ALTER TABLE public.desktop_context_events ENABLE ROW LEVEL SECURITY;

-- Users can read own events
CREATE POLICY "Users can read own context events"
  ON public.desktop_context_events
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

-- Desktop app inserts via anon key with user token
CREATE POLICY "Authenticated users can insert context events"
  ON public.desktop_context_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

-- Retention: auto-delete events older than 30 days (via pg_cron)
-- Run weekly: DELETE FROM desktop_context_events WHERE created_at < now() - interval '30 days';
