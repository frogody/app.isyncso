-- Demo System: demo_links and demo_script_steps tables
-- Supports the autonomous demo experience where Sync guides prospects through iSyncso

-- ============================================
-- Table: demo_links
-- ============================================
CREATE TABLE IF NOT EXISTS public.demo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  company_context JSONB DEFAULT '{}'::jsonb,
  modules_to_demo TEXT[] DEFAULT ARRAY['dashboard','growth','crm','talent','finance'],
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','viewed','in_progress','completed','expired')),
  first_viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_seconds INTEGER DEFAULT 0,
  pages_visited TEXT[] DEFAULT '{}',
  conversation_log JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demo_links_token ON public.demo_links(token);
CREATE INDEX IF NOT EXISTS idx_demo_links_status ON public.demo_links(status);
CREATE INDEX IF NOT EXISTS idx_demo_links_created_by ON public.demo_links(created_by);

-- ============================================
-- Table: demo_script_steps
-- ============================================
CREATE TABLE IF NOT EXISTS public.demo_script_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_link_id UUID NOT NULL REFERENCES public.demo_links(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  page_key TEXT NOT NULL,
  sync_dialogue TEXT NOT NULL,
  highlights JSONB DEFAULT '[]'::jsonb,
  input_actions JSONB DEFAULT '[]'::jsonb,
  wait_for_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_script_steps_link ON public.demo_script_steps(demo_link_id);
CREATE INDEX IF NOT EXISTS idx_demo_script_steps_order ON public.demo_script_steps(demo_link_id, step_order);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.demo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_script_steps ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admins) can do everything on demo_links
CREATE POLICY "Authenticated users can manage demo_links"
  ON public.demo_links
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users can read demo_links by token (for public demo route)
CREATE POLICY "Anon can read demo_links by token"
  ON public.demo_links
  FOR SELECT
  TO anon
  USING (true);

-- Anon users can update demo_links (for status/analytics tracking)
CREATE POLICY "Anon can update demo_links"
  ON public.demo_links
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Authenticated users can manage demo_script_steps
CREATE POLICY "Authenticated users can manage demo_script_steps"
  ON public.demo_script_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users can read demo_script_steps (for public demo route)
CREATE POLICY "Anon can read demo_script_steps"
  ON public.demo_script_steps
  FOR SELECT
  TO anon
  USING (true);
