-- Explorium Enrichment Schema Updates
-- Adds contact enrichment fields to contacts and candidates tables

-- ============================================================================
-- CONTACTS TABLE: Add enrichment fields
-- ============================================================================

-- Contact fields
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS mobile_phone text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS work_phone text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS job_department text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS job_seniority_level text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS skills jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS education jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS work_history jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS age_group text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS interests jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS location_city text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS location_region text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS location_country text;

-- Company fields
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_domain text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_linkedin text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_industry text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_employee_count integer;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_revenue text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_founded_year integer;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_hq_location text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_description text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_tech_stack jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_funding_total text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_latest_funding jsonb;

-- Enrichment tracking
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS enrichment_source text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS explorium_prospect_id text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS explorium_business_id text;

-- ============================================================================
-- CANDIDATES TABLE: Add enrichment fields (some may already exist)
-- ============================================================================

-- Verified contact info from enrichment
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS verified_email text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS verified_phone text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS verified_mobile text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS personal_email text;

-- Enrichment tracking
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS explorium_prospect_id text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS explorium_business_id text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS enrichment_source text;

-- Additional profile data
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS job_department text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS job_seniority_level text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS interests jsonb;

-- ============================================================================
-- PROSPECTS TABLE: Add enrichment fields for CRM prospects
-- ============================================================================

ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS mobile_phone text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS work_phone text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS job_department text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS job_seniority_level text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS skills jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS education jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS work_history jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS age_group text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS interests jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_domain text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_linkedin text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_industry text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_employee_count integer;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_revenue text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_founded_year integer;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_hq_location text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_description text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_tech_stack jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_funding_total text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS company_latest_funding jsonb;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS enrichment_source text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS explorium_prospect_id text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS explorium_business_id text;

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.explorium_prospect_id IS 'Explorium prospect ID for re-enrichment';
COMMENT ON COLUMN public.contacts.explorium_business_id IS 'Explorium business ID for company re-enrichment';
COMMENT ON COLUMN public.contacts.enriched_at IS 'Timestamp of last Explorium enrichment';
COMMENT ON COLUMN public.candidates.explorium_prospect_id IS 'Explorium prospect ID for re-enrichment';
COMMENT ON COLUMN public.candidates.enriched_at IS 'Timestamp of last Explorium enrichment';
