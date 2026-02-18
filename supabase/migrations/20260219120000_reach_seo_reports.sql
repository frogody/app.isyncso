-- reach_seo_reports: stores SEO scan results per workspace
CREATE TABLE IF NOT EXISTS public.reach_seo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  url TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  findings JSONB DEFAULT '[]'::jsonb,
  meta_analysis JSONB DEFAULT '{}'::jsonb,
  performance_signals JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reach_seo_reports_company
  ON public.reach_seo_reports(company_id);

CREATE INDEX IF NOT EXISTS idx_reach_seo_reports_created_at
  ON public.reach_seo_reports(created_at DESC);

ALTER TABLE public.reach_seo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reach_seo_reports_select"
  ON public.reach_seo_reports FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "reach_seo_reports_insert"
  ON public.reach_seo_reports FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "reach_seo_reports_delete"
  ON public.reach_seo_reports FOR DELETE TO authenticated
  USING (company_id = auth_company_id());
