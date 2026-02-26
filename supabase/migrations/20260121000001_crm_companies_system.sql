-- CRM Companies System
-- Creates crm_companies table for managing client/prospect companies
-- Links contacts to companies for better organization

-- =============================================================================
-- CRM COMPANIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  linkedin_url VARCHAR(500),
  website VARCHAR(500),

  -- Logo/branding
  logo_url VARCHAR(500),

  -- Industry & classification
  industry VARCHAR(100),
  sub_industry VARCHAR(100),
  company_type VARCHAR(50), -- 'prospect', 'customer', 'partner', 'vendor', 'competitor'

  -- Size & financials
  company_size VARCHAR(50), -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'
  employee_count INTEGER,
  annual_revenue VARCHAR(50),
  revenue_range VARCHAR(50),
  founded_year INTEGER,

  -- Location
  hq_location VARCHAR(255),
  hq_city VARCHAR(100),
  hq_region VARCHAR(100),
  hq_country VARCHAR(100),

  -- Contact info
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Description & details
  description TEXT,
  tagline VARCHAR(500),

  -- Technology
  tech_stack JSONB DEFAULT '[]'::jsonb,

  -- Funding (for tracking investor targets)
  funding_total VARCHAR(50),
  funding_stage VARCHAR(50), -- 'seed', 'series_a', 'series_b', 'series_c', 'ipo', 'acquired'
  latest_funding JSONB,
  investors JSONB DEFAULT '[]'::jsonb,

  -- Social presence
  twitter_url VARCHAR(500),
  facebook_url VARCHAR(500),
  instagram_url VARCHAR(500),

  -- CRM fields
  stage VARCHAR(50) DEFAULT 'prospect', -- 'prospect', 'qualified', 'negotiation', 'customer', 'churned'
  deal_value DECIMAL(14,2),
  probability INTEGER DEFAULT 50,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- Source tracking
  source VARCHAR(100),
  source_details TEXT,

  -- Enrichment tracking
  enriched_at TIMESTAMPTZ,
  enrichment_source VARCHAR(50),
  explorium_business_id VARCHAR(100),

  -- Custom fields
  custom_fields JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on domain per organization
  CONSTRAINT unique_company_domain_per_org UNIQUE (organization_id, domain)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_crm_companies_org ON public.crm_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_owner ON public.crm_companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_domain ON public.crm_companies(domain);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON public.crm_companies(name);
CREATE INDEX IF NOT EXISTS idx_crm_companies_industry ON public.crm_companies(industry);
CREATE INDEX IF NOT EXISTS idx_crm_companies_stage ON public.crm_companies(stage);
CREATE INDEX IF NOT EXISTS idx_crm_companies_type ON public.crm_companies(company_type);
CREATE INDEX IF NOT EXISTS idx_crm_companies_explorium ON public.crm_companies(explorium_business_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_crm_companies_search ON public.crm_companies
USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(domain, '') || ' ' || coalesce(description, '')));

-- =============================================================================
-- ADD COMPANY_ID TO PROSPECTS TABLE
-- =============================================================================

ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_crm_company ON public.prospects(crm_company_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

-- Select policy - users can view companies in their organization
CREATE POLICY "crm_companies_select" ON public.crm_companies
FOR SELECT TO authenticated
USING (organization_id = public.auth_company_id());

-- Insert policy - users can create companies in their organization
CREATE POLICY "crm_companies_insert" ON public.crm_companies
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.auth_company_id());

-- Update policy - users can update companies in their organization
CREATE POLICY "crm_companies_update" ON public.crm_companies
FOR UPDATE TO authenticated
USING (organization_id = public.auth_company_id());

-- Delete policy - users can delete companies in their organization
CREATE POLICY "crm_companies_delete" ON public.crm_companies
FOR DELETE TO authenticated
USING (organization_id = public.auth_company_id());

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_crm_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_companies_updated_at ON public.crm_companies;
CREATE TRIGGER crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_companies_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to find or create a CRM company from enrichment data
CREATE OR REPLACE FUNCTION find_or_create_crm_company(
  p_organization_id UUID,
  p_owner_id UUID,
  p_name VARCHAR(255),
  p_domain VARCHAR(255) DEFAULT NULL,
  p_linkedin_url VARCHAR(500) DEFAULT NULL,
  p_industry VARCHAR(100) DEFAULT NULL,
  p_company_size VARCHAR(50) DEFAULT NULL,
  p_employee_count INTEGER DEFAULT NULL,
  p_revenue VARCHAR(50) DEFAULT NULL,
  p_founded_year INTEGER DEFAULT NULL,
  p_hq_location VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_tech_stack JSONB DEFAULT NULL,
  p_funding_total VARCHAR(50) DEFAULT NULL,
  p_latest_funding JSONB DEFAULT NULL,
  p_explorium_business_id VARCHAR(100) DEFAULT NULL,
  p_source VARCHAR(100) DEFAULT 'enrichment'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_normalized_domain VARCHAR(255);
BEGIN
  -- Normalize domain (remove protocol, www, trailing slash)
  IF p_domain IS NOT NULL THEN
    v_normalized_domain := lower(regexp_replace(regexp_replace(regexp_replace(p_domain, '^https?://', ''), '^www\.', ''), '/$', ''));
  END IF;

  -- Try to find existing company by explorium_business_id first (most reliable)
  IF p_explorium_business_id IS NOT NULL THEN
    SELECT id INTO v_company_id
    FROM crm_companies
    WHERE organization_id = p_organization_id
    AND explorium_business_id = p_explorium_business_id
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      RETURN v_company_id;
    END IF;
  END IF;

  -- Try to find by domain
  IF v_normalized_domain IS NOT NULL THEN
    SELECT id INTO v_company_id
    FROM crm_companies
    WHERE organization_id = p_organization_id
    AND lower(domain) = v_normalized_domain
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      -- Update with enrichment data if available
      UPDATE crm_companies SET
        explorium_business_id = COALESCE(explorium_business_id, p_explorium_business_id),
        industry = COALESCE(industry, p_industry),
        company_size = COALESCE(company_size, p_company_size),
        employee_count = COALESCE(employee_count, p_employee_count),
        annual_revenue = COALESCE(annual_revenue, p_revenue),
        founded_year = COALESCE(founded_year, p_founded_year),
        hq_location = COALESCE(hq_location, p_hq_location),
        description = COALESCE(description, p_description),
        tech_stack = COALESCE(tech_stack, p_tech_stack),
        funding_total = COALESCE(funding_total, p_funding_total),
        latest_funding = COALESCE(latest_funding, p_latest_funding),
        enriched_at = NOW(),
        enrichment_source = 'explorium'
      WHERE id = v_company_id;

      RETURN v_company_id;
    END IF;
  END IF;

  -- Try to find by company name (fuzzy match)
  IF p_name IS NOT NULL THEN
    SELECT id INTO v_company_id
    FROM crm_companies
    WHERE organization_id = p_organization_id
    AND lower(name) = lower(p_name)
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      RETURN v_company_id;
    END IF;
  END IF;

  -- Create new company
  INSERT INTO crm_companies (
    organization_id,
    owner_id,
    name,
    domain,
    linkedin_url,
    industry,
    company_size,
    employee_count,
    annual_revenue,
    founded_year,
    hq_location,
    description,
    tech_stack,
    funding_total,
    latest_funding,
    explorium_business_id,
    source,
    enriched_at,
    enrichment_source,
    company_type,
    stage
  ) VALUES (
    p_organization_id,
    p_owner_id,
    COALESCE(p_name, v_normalized_domain, 'Unknown Company'),
    v_normalized_domain,
    p_linkedin_url,
    p_industry,
    p_company_size,
    p_employee_count,
    p_revenue,
    p_founded_year,
    p_hq_location,
    p_description,
    p_tech_stack,
    p_funding_total,
    p_latest_funding,
    p_explorium_business_id,
    p_source,
    CASE WHEN p_explorium_business_id IS NOT NULL THEN NOW() ELSE NULL END,
    CASE WHEN p_explorium_business_id IS NOT NULL THEN 'explorium' ELSE NULL END,
    'prospect',
    'prospect'
  )
  RETURNING id INTO v_company_id;

  RETURN v_company_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_or_create_crm_company TO authenticated;
GRANT EXECUTE ON FUNCTION find_or_create_crm_company TO service_role;

-- =============================================================================
-- VIEW: Company with contact count
-- =============================================================================

CREATE OR REPLACE VIEW crm_companies_with_contacts AS
SELECT
  c.*,
  COUNT(p.id) as contact_count,
  COUNT(CASE WHEN p.stage = 'won' THEN 1 END) as won_contacts,
  SUM(COALESCE(p.deal_value, 0)) as total_deal_value,
  MAX(p.created_date) as last_contact_added
FROM crm_companies c
LEFT JOIN prospects p ON p.crm_company_id = c.id
GROUP BY c.id;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.crm_companies IS 'CRM companies - tracks client/prospect companies separate from tenant companies';
COMMENT ON COLUMN public.crm_companies.organization_id IS 'The tenant organization this company belongs to';
COMMENT ON COLUMN public.crm_companies.explorium_business_id IS 'Explorium business ID for re-enrichment';
COMMENT ON COLUMN public.prospects.crm_company_id IS 'Link to CRM company record';
