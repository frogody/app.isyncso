-- CRM Activity Log: Auto-logged activities from semantic pipeline
CREATE TABLE IF NOT EXISTS public.crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email', 'call', 'meeting', 'message', 'note', 'task', 'auto_detected')),
  subject TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'auto' CHECK (source IN ('manual', 'auto', 'sync_agent')),
  semantic_activity_id TEXT,
  semantic_entity_id TEXT,
  duration_minutes INTEGER,
  app_name TEXT,
  metadata JSONB DEFAULT '{}',
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_activity_select" ON public.crm_activity_log
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "crm_activity_insert" ON public.crm_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE INDEX idx_crm_activity_prospect ON public.crm_activity_log(prospect_id);
CREATE INDEX idx_crm_activity_user ON public.crm_activity_log(user_id);
CREATE INDEX idx_crm_activity_date ON public.crm_activity_log(logged_at DESC);
CREATE INDEX idx_crm_activity_semantic ON public.crm_activity_log(semantic_activity_id);
