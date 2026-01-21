-- Full Enrichment Columns for Prospects
-- Adds comprehensive enrichment data storage

-- ============================================================================
-- PROSPECTS TABLE: Full enrichment fields
-- ============================================================================

-- Contact information
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS email_status TEXT; -- valid, invalid, catch-all

-- Location details
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS location_region TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS location_country TEXT;

-- Professional info
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS job_department TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS job_seniority_level TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS gender TEXT;

-- Skills, education, work history as JSONB
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Company info (from contact enrichment)
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_domain TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_linkedin TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_industry TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_employee_count INTEGER;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_revenue TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_founded_year INTEGER;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_hq_location TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Technology stack (from business technographics)
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_tech_stack JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_tech_categories JSONB DEFAULT '{}'::jsonb;

-- Funding & growth (from business funding enrichment)
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_funding_total TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_funding_rounds JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_investors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_last_funding JSONB;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_is_ipo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_ticker TEXT;

-- Social media presence
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS social_activity JSONB DEFAULT '{}'::jsonb;

-- Intent signals
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS intent_topics JSONB DEFAULT '[]'::jsonb;

-- Full raw enrichment data (for future display options)
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;

-- Enrichment tracking
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS explorium_prospect_id TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS explorium_business_id TEXT;

-- Link to CRM companies
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES for faster querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospects_enriched_at ON public.prospects(enriched_at);
CREATE INDEX IF NOT EXISTS idx_prospects_explorium_prospect ON public.prospects(explorium_prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospects_crm_company ON public.prospects(crm_company_id);

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_prospects_skills ON public.prospects USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_prospects_tech_stack ON public.prospects USING gin(company_tech_stack);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.prospects.enrichment_data IS 'Full raw enrichment response for flexible display';
COMMENT ON COLUMN public.prospects.company_tech_categories IS 'Tech stack organized by category (CRM, analytics, etc.)';
COMMENT ON COLUMN public.prospects.intent_topics IS 'Bombora intent topics showing what company is researching';
