-- Add company identity columns for smart invoice import vendor/buyer distinction
-- Plus all missing columns expected by Settings.jsx saveCompany/loadCompany
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS kvk_number TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  -- Contact fields
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  -- Editable company profile fields
  ADD COLUMN IF NOT EXISTS tech_stack JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_files JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS size_range TEXT,
  ADD COLUMN IF NOT EXISTS revenue_range TEXT,
  ADD COLUMN IF NOT EXISTS headquarters TEXT,
  ADD COLUMN IF NOT EXISTS founded_year TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS hq_city TEXT,
  ADD COLUMN IF NOT EXISTS hq_state TEXT,
  ADD COLUMN IF NOT EXISTS hq_country TEXT,
  -- Enrichment / read-only fields
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT,
  ADD COLUMN IF NOT EXISTS naics_description TEXT,
  ADD COLUMN IF NOT EXISTS sic_description TEXT,
  ADD COLUMN IF NOT EXISTS total_funding NUMERIC,
  ADD COLUMN IF NOT EXISTS funding_stage TEXT,
  ADD COLUMN IF NOT EXISTS funding_data JSONB,
  ADD COLUMN IF NOT EXISTS data_completeness NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tech_stack_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.companies.vat_number IS 'Company VAT/BTW number for identity matching';
COMMENT ON COLUMN public.companies.kvk_number IS 'Company KVK/registration number';
COMMENT ON COLUMN public.companies.legal_address IS 'Official registered address';
