-- Brand Builder Phase 1: Core project table
-- Already applied via Management API. This file exists for version control.

CREATE TABLE IF NOT EXISTS public.brand_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Brand',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  current_stage INTEGER NOT NULL DEFAULT 1
    CHECK (current_stage BETWEEN 1 AND 8),

  -- Stage outputs (JSONB, null until stage completed)
  brand_dna JSONB,
  color_system JSONB,
  typography_system JSONB,
  logo_system JSONB,
  verbal_identity JSONB,
  visual_language JSONB,
  applications JSONB,
  brand_book JSONB,

  -- Wizard state for resume
  wizard_state JSONB DEFAULT '{}'::jsonb,
  export_package JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.brand_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bp_select" ON public.brand_projects
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "bp_insert" ON public.brand_projects
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "bp_update" ON public.brand_projects
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "bp_delete" ON public.brand_projects
  FOR DELETE TO authenticated
  USING (company_id = public.auth_company_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bp_company ON public.brand_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_bp_created_by ON public.brand_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_bp_status ON public.brand_projects(status);

-- updated_at trigger (reuses existing generic function)
CREATE TRIGGER brand_projects_set_updated_at
  BEFORE UPDATE ON public.brand_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
