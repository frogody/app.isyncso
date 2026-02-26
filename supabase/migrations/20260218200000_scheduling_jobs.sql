-- Scheduling Jobs: Tracks multi-step meeting scheduling workflows
-- SYNC calls participants, extracts availability, finds overlap, creates calendar event

CREATE TABLE IF NOT EXISTS public.scheduling_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,

  -- Workflow state machine
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'checking_calendar',
    'calling',
    'between_calls',
    'finding_slot',
    'scheduling',
    'completed',
    'failed',
    'partial'
  )),

  -- Meeting context
  meeting_subject TEXT,
  meeting_duration_minutes INTEGER DEFAULT 30,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,

  -- Participants (JSONB array)
  -- Each: { name, phone, email, prospect_id, status, availability, call_sid, call_record_id, error }
  -- status: pending | calling | completed | failed | no_phone | not_found
  -- availability: [{ start: ISO, end: ISO }]
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- User's own availability (free windows from Google Calendar)
  user_availability JSONB DEFAULT '[]'::jsonb,

  -- Current call tracking
  current_participant_index INTEGER DEFAULT 0,
  current_call_sid TEXT,

  -- Results
  candidate_slots JSONB DEFAULT '[]'::jsonb,
  selected_slot JSONB,
  calendar_event_id TEXT,
  calendar_event_link TEXT,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Notification
  user_notified BOOLEAN DEFAULT false,
  notification_message TEXT,

  -- From number for outbound calls
  from_phone_number TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduling_jobs_user ON public.scheduling_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_jobs_company ON public.scheduling_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_jobs_status ON public.scheduling_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduling_jobs_call_sid ON public.scheduling_jobs(current_call_sid);
CREATE INDEX IF NOT EXISTS idx_scheduling_jobs_created ON public.scheduling_jobs(created_at DESC);

-- RLS
ALTER TABLE public.scheduling_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_jobs_select" ON public.scheduling_jobs
  FOR SELECT TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "scheduling_jobs_insert" ON public.scheduling_jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "scheduling_jobs_update" ON public.scheduling_jobs
  FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid());

-- Service role needs full access (edge functions)
GRANT ALL ON public.scheduling_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.scheduling_jobs TO authenticated;
