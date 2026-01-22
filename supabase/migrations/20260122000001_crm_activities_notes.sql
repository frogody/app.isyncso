-- ============================================================================
-- CRM Activities and Notes System
-- Enables tracking of contact interactions and internal notes
-- ============================================================================

-- Activities table - tracks all interactions with contacts
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'linkedin', 'other')),
  subject TEXT,
  description TEXT,
  outcome TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table - quick notes attached to contacts or companies
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities - using auth_company_id() wrapper
CREATE POLICY "activities_select_org" ON public.crm_activities
FOR SELECT TO authenticated
USING (organization_id = auth_company_id());

CREATE POLICY "activities_insert_org" ON public.crm_activities
FOR INSERT TO authenticated
WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "activities_update_org" ON public.crm_activities
FOR UPDATE TO authenticated
USING (organization_id = auth_company_id())
WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "activities_delete_org" ON public.crm_activities
FOR DELETE TO authenticated
USING (organization_id = auth_company_id());

-- RLS policies for notes
CREATE POLICY "notes_select_org" ON public.crm_notes
FOR SELECT TO authenticated
USING (organization_id = auth_company_id());

CREATE POLICY "notes_insert_org" ON public.crm_notes
FOR INSERT TO authenticated
WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "notes_update_org" ON public.crm_notes
FOR UPDATE TO authenticated
USING (organization_id = auth_company_id())
WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "notes_delete_org" ON public.crm_notes
FOR DELETE TO authenticated
USING (organization_id = auth_company_id());

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activities_org_id ON public.crm_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_prospect_id ON public.crm_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON public.crm_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.crm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON public.crm_activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.crm_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_org_id ON public.crm_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_prospect_id ON public.crm_notes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_notes_company_id ON public.crm_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.crm_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_notes_created ON public.crm_notes(created_at DESC);

-- Composite indexes for common patterns
CREATE INDEX IF NOT EXISTS idx_activities_prospect_recent ON public.crm_activities(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_prospect_recent ON public.crm_notes(prospect_id, created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_activities_updated_at
  BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER crm_notes_updated_at
  BEFORE UPDATE ON public.crm_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();
