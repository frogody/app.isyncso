-- Guest access table
CREATE TABLE IF NOT EXISTS public.channel_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  access_token TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{"can_message": true, "can_upload": false, "can_call": false}'::jsonb,
  invited_by UUID REFERENCES public.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  last_seen_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_channel_guests_channel ON public.channel_guests(channel_id);
CREATE INDEX idx_channel_guests_email ON public.channel_guests(email);
CREATE INDEX idx_channel_guests_token ON public.channel_guests(access_token);
CREATE INDEX idx_channel_guests_status ON public.channel_guests(status);

-- RLS
ALTER TABLE public.channel_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_guests_select" ON public.channel_guests
FOR SELECT TO authenticated
USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "channel_guests_insert" ON public.channel_guests
FOR INSERT TO authenticated
WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "channel_guests_update" ON public.channel_guests
FOR UPDATE TO authenticated
USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "channel_guests_delete" ON public.channel_guests
FOR DELETE TO authenticated
USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Add is_guest_channel flag to channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_guest_channel BOOLEAN DEFAULT false;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0;
