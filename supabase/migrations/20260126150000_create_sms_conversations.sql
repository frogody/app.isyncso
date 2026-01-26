-- SMS Conversations Table for Twilio Integration
-- Stores SMS conversation state and message history

-- Create sms_conversations table
CREATE TABLE IF NOT EXISTS public.sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  outreach_task_id UUID REFERENCES public.outreach_tasks(id) ON DELETE SET NULL,

  -- Phone number (E.164 format)
  phone_number TEXT NOT NULL,

  -- Twilio identifiers
  twilio_conversation_sid TEXT,
  twilio_from_number TEXT,

  -- Conversation status
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued',      -- Scheduled but not sent
    'sent',        -- Initial message sent
    'delivered',   -- Delivery confirmed
    'responded',   -- Candidate replied
    'interested',  -- Positive response detected
    'declined',    -- Candidate declined
    'scheduled',   -- Call/meeting scheduled
    'opted_out'    -- Candidate opted out (STOP)
  )),

  -- Message history as JSONB array
  -- Format: [{role: 'assistant'|'candidate', content: '...', timestamp: '...', sid?: '...'}]
  messages JSONB DEFAULT '[]'::jsonb,

  -- AI context for personalization
  ai_context JSONB DEFAULT '{}'::jsonb,

  -- Scheduling
  scheduled_send_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,

  -- Opt-out tracking (GDPR/TCPA compliance)
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.sms_conversations IS 'SMS conversations with candidates via Twilio';
COMMENT ON COLUMN public.sms_conversations.messages IS 'Array of messages: [{role, content, timestamp, sid}]';
COMMENT ON COLUMN public.sms_conversations.ai_context IS 'Context for AI response generation';

-- Enable RLS
ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sms_conversations_select" ON public.sms_conversations
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "sms_conversations_insert" ON public.sms_conversations
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "sms_conversations_update" ON public.sms_conversations
  FOR UPDATE TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "sms_conversations_delete" ON public.sms_conversations
  FOR DELETE TO authenticated
  USING (organization_id = auth_company_id());

-- Indexes for performance
CREATE INDEX idx_sms_conversations_org ON public.sms_conversations(organization_id);
CREATE INDEX idx_sms_conversations_candidate ON public.sms_conversations(candidate_id);
CREATE INDEX idx_sms_conversations_campaign ON public.sms_conversations(campaign_id);
CREATE INDEX idx_sms_conversations_status ON public.sms_conversations(status);
CREATE INDEX idx_sms_conversations_scheduled ON public.sms_conversations(scheduled_send_at) WHERE status = 'queued';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sms_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sms_conversations_updated_at
  BEFORE UPDATE ON public.sms_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_conversations_updated_at();

-- Grant permissions
GRANT ALL ON public.sms_conversations TO authenticated;
GRANT ALL ON public.sms_conversations TO service_role;
