-- ============================================================
-- Communication Hub Foundation Migration
-- Pillars: Calendar, Video Calls, Phone/SMS, Enhanced Channels
-- ============================================================

-- ============================================================
-- 1. ENHANCE EXISTING TABLES: channels & messages
-- ============================================================

-- Channels: add category, linked entities, AI features
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'messaging';
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS linked_entity_type TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS linked_entity_id UUID;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS sync_summary TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS sync_digest_schedule TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Messages: add rich format support and AI analysis
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_format TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Indexes for new channel columns
CREATE INDEX IF NOT EXISTS idx_channels_category ON public.channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_linked_entity ON public.channels(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_messages_format ON public.messages(message_format);
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON public.messages USING gin(metadata);

-- ============================================================
-- 2. CALENDAR TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  is_all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurrence_end TIMESTAMPTZ,
  recurrence_parent_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  video_call_id UUID,
  channel_id UUID,
  color TEXT,
  status TEXT DEFAULT 'confirmed',
  visibility TEXT DEFAULT 'default',
  sync_notes TEXT,
  sync_agenda JSONB,
  external_calendar_id TEXT,
  external_calendar_source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON public.calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_creator ON public.calendar_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON public.calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON public.calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON public.calendar_events(external_calendar_id) WHERE external_calendar_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence ON public.calendar_events(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.calendar_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'attendee',
  rsvp_status TEXT DEFAULT 'pending',
  rsvp_note TEXT,
  rsvp_at TIMESTAMPTZ,
  is_external BOOLEAN DEFAULT false,
  notify_via TEXT[] DEFAULT ARRAY['email'],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event ON public.calendar_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_user ON public.calendar_attendees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_email ON public.calendar_attendees(email);

CREATE TABLE IF NOT EXISTS public.calendar_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT DEFAULT 'notification',
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_reminders_event ON public.calendar_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_pending ON public.calendar_reminders(remind_at, is_sent) WHERE is_sent = false;

CREATE TABLE IF NOT EXISTS public.calendar_preferences (
  user_id UUID PRIMARY KEY,
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
  default_meeting_duration INTEGER DEFAULT 30,
  default_reminder_minutes INTEGER DEFAULT 15,
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  auto_decline_conflicts BOOLEAN DEFAULT false,
  sync_briefing_enabled BOOLEAN DEFAULT true,
  sync_booking_link_enabled BOOLEAN DEFAULT true,
  buffer_minutes INTEGER DEFAULT 5,
  external_sync_google BOOLEAN DEFAULT false,
  external_sync_outlook BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. VIDEO CALL TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT,
  call_type TEXT DEFAULT 'video',
  status TEXT DEFAULT 'scheduled',
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  room_id TEXT UNIQUE NOT NULL,
  join_url TEXT NOT NULL,
  join_code TEXT UNIQUE,
  password TEXT,
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  channel_id UUID,
  max_participants INTEGER DEFAULT 50,
  settings JSONB DEFAULT '{
    "sync_enabled": true,
    "recording_enabled": false,
    "transcription_enabled": true,
    "waiting_room": false,
    "allow_guest_screen_share": true,
    "auto_admit_internal": true,
    "background_blur_default": false
  }',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_calls_company ON public.video_calls(company_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_creator ON public.video_calls(creator_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON public.video_calls(status);
CREATE INDEX IF NOT EXISTS idx_video_calls_event ON public.video_calls(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_calls_join_code ON public.video_calls(join_code) WHERE join_code IS NOT NULL;

-- Add FK from calendar_events to video_calls now that both tables exist
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_video_call_id_fkey;
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_video_call_id_fkey
  FOREIGN KEY (video_call_id) REFERENCES public.video_calls(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'participant',
  join_time TIMESTAMPTZ,
  leave_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_external BOOLEAN DEFAULT false,
  device_info JSONB,
  connection_quality TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_participants_call ON public.call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON public.call_participants(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  speaker_id UUID,
  speaker_name TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  duration_ms INTEGER,
  confidence FLOAT,
  is_sync_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_transcripts_call ON public.call_transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_time ON public.call_transcripts(call_id, timestamp_ms);

CREATE TABLE IF NOT EXISTS public.call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  generated_by TEXT DEFAULT 'sync',
  note_type TEXT DEFAULT 'summary',
  content TEXT NOT NULL,
  structured_data JSONB,
  shared_with UUID[],
  channel_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_notes_call ON public.call_notes(call_id);
CREATE INDEX IF NOT EXISTS idx_call_notes_type ON public.call_notes(call_id, note_type);

CREATE TABLE IF NOT EXISTS public.call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  format TEXT DEFAULT 'webm',
  status TEXT DEFAULT 'processing',
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call ON public.call_recordings(call_id);

-- ============================================================
-- 4. SYNC PHONE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sync_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  twilio_phone_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL,
  friendly_name TEXT,
  country_code TEXT DEFAULT 'NL',
  capabilities JSONB DEFAULT '{"voice": true, "sms": true, "mms": false}',
  voicemail_enabled BOOLEAN DEFAULT true,
  voicemail_greeting TEXT,
  call_forwarding_enabled BOOLEAN DEFAULT false,
  call_forwarding_number TEXT,
  status TEXT DEFAULT 'active',
  monthly_cost DECIMAL(10,2),
  settings JSONB DEFAULT '{
    "answer_unknown_callers": true,
    "answer_known_contacts": true,
    "business_hours_only": false,
    "language": "en",
    "personality": "professional-friendly",
    "can_schedule_meetings": true,
    "can_take_messages": true,
    "can_provide_info": true,
    "can_transfer_to_user": true,
    "escalation_keywords": ["urgent", "emergency", "asap"]
  }',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_phone_user ON public.sync_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_phone_company ON public.sync_phone_numbers(company_id);

CREATE TABLE IF NOT EXISTS public.sync_phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_phone_id UUID NOT NULL REFERENCES public.sync_phone_numbers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  direction TEXT NOT NULL,
  caller_number TEXT NOT NULL,
  caller_name TEXT,
  caller_entity_type TEXT,
  caller_entity_id UUID,
  status TEXT DEFAULT 'ringing',
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  sync_summary TEXT,
  sync_actions_taken JSONB,
  sentiment TEXT,
  transferred_to TEXT,
  voicemail_text TEXT,
  follow_up_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_phone_calls_phone ON public.sync_phone_calls(sync_phone_id);
CREATE INDEX IF NOT EXISTS idx_sync_phone_calls_user ON public.sync_phone_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_phone_calls_time ON public.sync_phone_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_phone_calls_status ON public.sync_phone_calls(status);

CREATE TABLE IF NOT EXISTS public.sync_phone_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_phone_id UUID NOT NULL REFERENCES public.sync_phone_numbers(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  relationship TEXT,
  entity_type TEXT,
  entity_id UUID,
  notes TEXT,
  priority TEXT DEFAULT 'normal',
  custom_greeting TEXT,
  custom_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_phone_contacts_phone ON public.sync_phone_contacts(sync_phone_id);
CREATE INDEX IF NOT EXISTS idx_sync_phone_contacts_number ON public.sync_phone_contacts(phone_number);

-- ============================================================
-- 5. GUEST ACCESS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channel_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  access_token TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{"can_message": true, "can_upload": false, "can_call": false}',
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  last_active TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_guests_channel ON public.channel_guests(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_guests_token ON public.channel_guests(access_token);
CREATE INDEX IF NOT EXISTS idx_channel_guests_email ON public.channel_guests(email);
CREATE INDEX IF NOT EXISTS idx_channel_guests_status ON public.channel_guests(status);

-- ============================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- Using auth wrapper functions (auth_uid(), auth_company_id())
-- ============================================================

-- Calendar Events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (creator_id = public.auth_uid() OR public.auth_hierarchy_level() >= 60);

-- Calendar Attendees
ALTER TABLE public.calendar_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_attendees_select" ON public.calendar_attendees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = event_id AND e.company_id = public.auth_company_id()
  ));

CREATE POLICY "calendar_attendees_insert" ON public.calendar_attendees
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = event_id AND e.company_id = public.auth_company_id()
  ));

CREATE POLICY "calendar_attendees_update" ON public.calendar_attendees
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = event_id AND e.company_id = public.auth_company_id()
  ));

CREATE POLICY "calendar_attendees_delete" ON public.calendar_attendees
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = event_id AND (e.creator_id = public.auth_uid() OR public.auth_hierarchy_level() >= 60)
  ));

-- Calendar Reminders
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_reminders_select" ON public.calendar_reminders
  FOR SELECT TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "calendar_reminders_insert" ON public.calendar_reminders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "calendar_reminders_update" ON public.calendar_reminders
  FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "calendar_reminders_delete" ON public.calendar_reminders
  FOR DELETE TO authenticated
  USING (user_id = public.auth_uid());

-- Calendar Preferences
ALTER TABLE public.calendar_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_preferences_select" ON public.calendar_preferences
  FOR SELECT TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "calendar_preferences_insert" ON public.calendar_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "calendar_preferences_update" ON public.calendar_preferences
  FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid());

-- Video Calls
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_calls_select" ON public.video_calls
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "video_calls_insert" ON public.video_calls
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "video_calls_update" ON public.video_calls
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "video_calls_delete" ON public.video_calls
  FOR DELETE TO authenticated
  USING (creator_id = public.auth_uid() OR public.auth_hierarchy_level() >= 60);

-- Call Participants
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_participants_select" ON public.call_participants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

CREATE POLICY "call_participants_insert" ON public.call_participants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

CREATE POLICY "call_participants_update" ON public.call_participants
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

-- Call Transcripts
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_transcripts_select" ON public.call_transcripts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

CREATE POLICY "call_transcripts_insert" ON public.call_transcripts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

-- Call Notes
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_notes_select" ON public.call_notes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

CREATE POLICY "call_notes_insert" ON public.call_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

CREATE POLICY "call_notes_update" ON public.call_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

-- Call Recordings
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_recordings_select" ON public.call_recordings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

CREATE POLICY "call_recordings_insert" ON public.call_recordings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_calls v
    WHERE v.id = call_id AND v.company_id = public.auth_company_id()
  ));

-- Sync Phone Numbers
ALTER TABLE public.sync_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_phone_numbers_select" ON public.sync_phone_numbers
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "sync_phone_numbers_insert" ON public.sync_phone_numbers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id() AND user_id = public.auth_uid());

CREATE POLICY "sync_phone_numbers_update" ON public.sync_phone_numbers
  FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid());

-- Sync Phone Calls
ALTER TABLE public.sync_phone_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_phone_calls_select" ON public.sync_phone_calls
  FOR SELECT TO authenticated
  USING (user_id = public.auth_uid() OR public.auth_hierarchy_level() >= 60);

CREATE POLICY "sync_phone_calls_insert" ON public.sync_phone_calls
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

-- Sync Phone Contacts
ALTER TABLE public.sync_phone_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_phone_contacts_select" ON public.sync_phone_contacts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_phone_numbers p
    WHERE p.id = sync_phone_id AND (p.user_id = public.auth_uid() OR p.company_id = public.auth_company_id())
  ));

CREATE POLICY "sync_phone_contacts_insert" ON public.sync_phone_contacts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sync_phone_numbers p
    WHERE p.id = sync_phone_id AND p.user_id = public.auth_uid()
  ));

CREATE POLICY "sync_phone_contacts_update" ON public.sync_phone_contacts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_phone_numbers p
    WHERE p.id = sync_phone_id AND p.user_id = public.auth_uid()
  ));

CREATE POLICY "sync_phone_contacts_delete" ON public.sync_phone_contacts
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_phone_numbers p
    WHERE p.id = sync_phone_id AND p.user_id = public.auth_uid()
  ));

-- Channel Guests
ALTER TABLE public.channel_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_guests_select" ON public.channel_guests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id
  ));

CREATE POLICY "channel_guests_insert" ON public.channel_guests
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = public.auth_uid());

CREATE POLICY "channel_guests_update" ON public.channel_guests
  FOR UPDATE TO authenticated
  USING (invited_by = public.auth_uid() OR public.auth_hierarchy_level() >= 60);

CREATE POLICY "channel_guests_delete" ON public.channel_guests
  FOR DELETE TO authenticated
  USING (invited_by = public.auth_uid() OR public.auth_hierarchy_level() >= 60);

-- ============================================================
-- 7. HELPER FUNCTIONS
-- ============================================================

-- Generate short join codes for video calls
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'SYN-';
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_calendar_events_updated_at') THEN
    CREATE TRIGGER set_calendar_events_updated_at
      BEFORE UPDATE ON public.calendar_events
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_calendar_preferences_updated_at') THEN
    CREATE TRIGGER set_calendar_preferences_updated_at
      BEFORE UPDATE ON public.calendar_preferences
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_video_calls_updated_at') THEN
    CREATE TRIGGER set_video_calls_updated_at
      BEFORE UPDATE ON public.video_calls
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================
-- 8. STORAGE BUCKET FOR CALL RECORDINGS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('call-recordings', 'call-recordings', false, 524288000, ARRAY['audio/*', 'video/*'])
ON CONFLICT (id) DO NOTHING;

-- RLS for call-recordings bucket
CREATE POLICY "call_recordings_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'call-recordings');

CREATE POLICY "call_recordings_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'call-recordings' AND public.auth_role() = 'authenticated');

CREATE POLICY "call_recordings_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'call-recordings' AND public.auth_role() = 'authenticated');

CREATE POLICY "call_recordings_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'call-recordings' AND public.auth_role() = 'authenticated');
