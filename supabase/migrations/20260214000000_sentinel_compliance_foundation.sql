-- SENTINEL Compliance Platform - Foundation Migration
-- Creates all tables for multi-framework compliance automation

-- ============================================================
-- 1. COMPLIANCE FRAMEWORKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  category TEXT NOT NULL DEFAULT 'security',
  region TEXT NOT NULL DEFAULT 'global',
  enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'not-started'
    CHECK (status IN ('not-started', 'in-progress', 'audit-ready', 'certified')),
  target_date TIMESTAMPTZ,
  certified_at TIMESTAMPTZ,
  certificate_url TEXT,
  total_controls INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, slug)
);

ALTER TABLE public.compliance_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company frameworks"
  ON public.compliance_frameworks FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 2. COMPLIANCE CONTROLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.compliance_frameworks(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  control_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  implementation_guidance TEXT,
  automated BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'not-implemented'
    CHECK (status IN ('not-implemented', 'in-progress', 'implemented', 'not-applicable', 'failing')),
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  evidence_count INTEGER DEFAULT 0,
  last_tested_at TIMESTAMPTZ,
  test_result TEXT CHECK (test_result IN ('pass', 'fail', 'warning', NULL)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_controls_framework ON public.compliance_controls(framework_id);
CREATE INDEX idx_controls_company ON public.compliance_controls(company_id);
CREATE INDEX idx_controls_status ON public.compliance_controls(status);
CREATE INDEX idx_controls_category ON public.compliance_controls(category);

ALTER TABLE public.compliance_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company controls"
  ON public.compliance_controls FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 3. CROSS-FRAMEWORK CONTROL MAPPINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_control_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_control_id UUID NOT NULL REFERENCES public.compliance_controls(id) ON DELETE CASCADE,
  target_control_id UUID NOT NULL REFERENCES public.compliance_controls(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL DEFAULT 'equivalent'
    CHECK (mapping_type IN ('equivalent', 'partial', 'related')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_control_id, target_control_id)
);

-- ============================================================
-- 4. COMPLIANCE EVIDENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.compliance_controls(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'manual'
    CHECK (type IN ('screenshot', 'config', 'policy', 'log', 'api-pull', 'manual', 'document')),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual',
  integration_id UUID,
  data JSONB,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'valid', 'expired', 'failed', 'rejected')),
  collected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evidence_company ON public.compliance_evidence(company_id);
CREATE INDEX idx_evidence_control ON public.compliance_evidence(control_id);
CREATE INDEX idx_evidence_status ON public.compliance_evidence(status);

ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company evidence"
  ON public.compliance_evidence FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 5. COMPLIANCE POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  framework_id UUID REFERENCES public.compliance_frameworks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  category TEXT,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledgements JSONB DEFAULT '[]'::jsonb,
  template_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_policies_company ON public.compliance_policies(company_id);
CREATE INDEX idx_policies_framework ON public.compliance_policies(framework_id);
CREATE INDEX idx_policies_status ON public.compliance_policies(status);

ALTER TABLE public.compliance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company policies"
  ON public.compliance_policies FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 6. COMPLIANCE INTEGRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connected', 'syncing', 'error')),
  config JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_interval INTEGER DEFAULT 1440,
  health TEXT DEFAULT 'unknown'
    CHECK (health IN ('unknown', 'healthy', 'degraded', 'failing')),
  error_message TEXT,
  checks_passing INTEGER DEFAULT 0,
  checks_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_integrations_company ON public.compliance_integrations(company_id);

ALTER TABLE public.compliance_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company integrations"
  ON public.compliance_integrations FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 7. INTEGRATION CHECKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_integration_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.compliance_integrations(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.compliance_controls(id) ON DELETE SET NULL,
  check_name TEXT NOT NULL,
  check_description TEXT,
  passing BOOLEAN,
  last_checked_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checks_integration ON public.compliance_integration_checks(integration_id);

-- ============================================================
-- 8. TRUST CENTER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trust_center_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  branding JSONB DEFAULT '{}'::jsonb,
  sections JSONB DEFAULT '[]'::jsonb,
  gated_documents JSONB DEFAULT '[]'::jsonb,
  custom_domain TEXT,
  faq JSONB DEFAULT '[]'::jsonb,
  subprocessors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.trust_center_config ENABLE ROW LEVEL SECURITY;

-- Public read for trust centers
CREATE POLICY "Public can view enabled trust centers"
  ON public.trust_center_config FOR SELECT TO anon
  USING (enabled = true);

CREATE POLICY "Authenticated can view enabled trust centers"
  ON public.trust_center_config FOR SELECT TO authenticated
  USING (enabled = true);

CREATE POLICY "Users can manage their company trust center"
  ON public.trust_center_config FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 9. TRUST CENTER ACCESS REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trust_center_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_center_id UUID NOT NULL REFERENCES public.trust_center_config(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  requester_company TEXT,
  document_requested TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trust_center_requests ENABLE ROW LEVEL SECURITY;

-- Anon can insert requests
CREATE POLICY "Anyone can request access"
  ON public.trust_center_requests FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can request access"
  ON public.trust_center_requests FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Company users can manage requests"
  ON public.trust_center_requests FOR ALL TO authenticated
  USING (trust_center_id IN (
    SELECT id FROM public.trust_center_config WHERE company_id = public.get_user_company_id()
  ));

-- ============================================================
-- 10. VENDOR ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_domain TEXT,
  vendor_logo_url TEXT,
  category TEXT DEFAULT 'saas'
    CHECK (category IN ('saas', 'infrastructure', 'professional-services', 'data-processor', 'subprocessor', 'other')),
  criticality TEXT DEFAULT 'medium'
    CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  data_access TEXT[] DEFAULT '{}',
  risk_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending-review'
    CHECK (status IN ('pending-review', 'in-review', 'approved', 'conditionally-approved', 'rejected', 'decommissioned')),
  soc2_status TEXT CHECK (soc2_status IN ('verified', 'pending', 'none', NULL)),
  iso27001_status TEXT CHECK (iso27001_status IN ('verified', 'pending', 'none', NULL)),
  gdpr_status TEXT CHECK (gdpr_status IN ('compliant', 'pending', 'non-compliant', NULL)),
  contract_url TEXT,
  dpa_url TEXT,
  last_assessment_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  risk_findings JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vendor_company ON public.vendor_assessments(company_id);
CREATE INDEX idx_vendor_status ON public.vendor_assessments(status);
CREATE INDEX idx_vendor_criticality ON public.vendor_assessments(criticality);

ALTER TABLE public.vendor_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company vendors"
  ON public.vendor_assessments FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- 11. HELPER: Update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'compliance_frameworks', 'compliance_controls', 'compliance_evidence',
    'compliance_policies', 'compliance_integrations', 'compliance_integration_checks',
    'trust_center_config', 'vendor_assessments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I; CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;
