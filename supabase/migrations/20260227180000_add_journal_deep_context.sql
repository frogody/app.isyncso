-- Add deep_context JSONB column to daily_journals for storing
-- aggregated context event data (entities, skills, work sessions)
ALTER TABLE public.daily_journals
  ADD COLUMN IF NOT EXISTS deep_context JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.daily_journals.deep_context IS 'Aggregated deep context: entities detected, skills exercised, work sessions, window titles, commitments from desktop_context_events';
