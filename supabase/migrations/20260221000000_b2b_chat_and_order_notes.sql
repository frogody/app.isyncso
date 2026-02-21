-- ============================================================================
-- Supplementary migration: b2b_chat_messages + b2b_order_notes
-- These tables are referenced by portal chat and admin order detail components
-- ============================================================================

-- 1. Chat messages table for portal client ↔ admin messaging
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.b2b_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'admin')),
  sender_id UUID,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_chat_messages_org
  ON public.b2b_chat_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_b2b_chat_messages_client
  ON public.b2b_chat_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_b2b_chat_messages_created
  ON public.b2b_chat_messages(created_at DESC);

ALTER TABLE public.b2b_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_chat_messages_select" ON public.b2b_chat_messages
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

CREATE POLICY "b2b_chat_messages_insert" ON public.b2b_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

CREATE POLICY "b2b_chat_messages_anon_select" ON public.b2b_chat_messages
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "b2b_chat_messages_anon_insert" ON public.b2b_chat_messages
  FOR INSERT TO anon
  WITH CHECK (true);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.b2b_chat_messages;

-- 2. Order notes/timeline table for admin order management
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.b2b_order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  note_type TEXT DEFAULT 'note' CHECK (note_type IN ('note', 'status_change', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_order_notes_order
  ON public.b2b_order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_b2b_order_notes_created
  ON public.b2b_order_notes(created_at DESC);

ALTER TABLE public.b2b_order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_order_notes_select" ON public.b2b_order_notes
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

CREATE POLICY "b2b_order_notes_insert" ON public.b2b_order_notes
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

CREATE POLICY "b2b_order_notes_update" ON public.b2b_order_notes
  FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));
