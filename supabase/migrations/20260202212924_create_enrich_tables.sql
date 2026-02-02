-- Enrich Workspaces: Clay/Airtable-like enrichment spreadsheets for Raise
-- =========================================================================

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS public.enrich_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nest_id UUID REFERENCES public.nests(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Workspace',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrich_workspaces_org ON public.enrich_workspaces(organization_id);

-- 2. Columns
CREATE TABLE IF NOT EXISTS public.enrich_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.enrich_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Column',
  type TEXT NOT NULL DEFAULT 'field' CHECK (type IN ('field', 'enrichment', 'ai', 'formula')),
  position INT NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  width INT NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrich_columns_workspace ON public.enrich_columns(workspace_id);

-- 3. Rows
CREATE TABLE IF NOT EXISTS public.enrich_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.enrich_workspaces(id) ON DELETE CASCADE,
  nest_item_id UUID REFERENCES public.nest_items(id) ON DELETE SET NULL,
  source_data JSONB DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrich_rows_workspace ON public.enrich_rows(workspace_id);

-- 4. Cells
CREATE TABLE IF NOT EXISTS public.enrich_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id UUID NOT NULL REFERENCES public.enrich_rows(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.enrich_columns(id) ON DELETE CASCADE,
  value JSONB,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'pending', 'complete', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(row_id, column_id)
);

CREATE INDEX idx_enrich_cells_row ON public.enrich_cells(row_id);
CREATE INDEX idx_enrich_cells_column ON public.enrich_cells(column_id);

-- RLS Policies
ALTER TABLE public.enrich_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrich_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrich_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrich_cells ENABLE ROW LEVEL SECURITY;

-- Workspaces: org members can CRUD
CREATE POLICY "enrich_workspaces_select" ON public.enrich_workspaces
  FOR SELECT TO authenticated
  USING (organization_id = public.auth_company_id());

CREATE POLICY "enrich_workspaces_insert" ON public.enrich_workspaces
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.auth_company_id());

CREATE POLICY "enrich_workspaces_update" ON public.enrich_workspaces
  FOR UPDATE TO authenticated
  USING (organization_id = public.auth_company_id());

CREATE POLICY "enrich_workspaces_delete" ON public.enrich_workspaces
  FOR DELETE TO authenticated
  USING (organization_id = public.auth_company_id());

-- Columns: via workspace org membership
CREATE POLICY "enrich_columns_select" ON public.enrich_columns
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

CREATE POLICY "enrich_columns_insert" ON public.enrich_columns
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

CREATE POLICY "enrich_columns_update" ON public.enrich_columns
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

CREATE POLICY "enrich_columns_delete" ON public.enrich_columns
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

-- Rows: via workspace org membership
CREATE POLICY "enrich_rows_select" ON public.enrich_rows
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

CREATE POLICY "enrich_rows_insert" ON public.enrich_rows
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

CREATE POLICY "enrich_rows_update" ON public.enrich_rows
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

CREATE POLICY "enrich_rows_delete" ON public.enrich_rows
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrich_workspaces w WHERE w.id = workspace_id AND w.organization_id = public.auth_company_id()));

-- Cells: via row -> workspace org membership
CREATE POLICY "enrich_cells_select" ON public.enrich_cells
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrich_rows r
    JOIN public.enrich_workspaces w ON w.id = r.workspace_id
    WHERE r.id = row_id AND w.organization_id = public.auth_company_id()
  ));

CREATE POLICY "enrich_cells_insert" ON public.enrich_cells
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.enrich_rows r
    JOIN public.enrich_workspaces w ON w.id = r.workspace_id
    WHERE r.id = row_id AND w.organization_id = public.auth_company_id()
  ));

CREATE POLICY "enrich_cells_update" ON public.enrich_cells
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrich_rows r
    JOIN public.enrich_workspaces w ON w.id = r.workspace_id
    WHERE r.id = row_id AND w.organization_id = public.auth_company_id()
  ));

CREATE POLICY "enrich_cells_delete" ON public.enrich_cells
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrich_rows r
    JOIN public.enrich_workspaces w ON w.id = r.workspace_id
    WHERE r.id = row_id AND w.organization_id = public.auth_company_id()
  ));
