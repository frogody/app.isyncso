-- Add company and location fields to candidates table for nest imports
-- These fields match the data available in typical candidate/talent CSV exports

-- Company info fields
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_domain TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_hq TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_linkedin TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS employee_count INTEGER;

-- Location fields
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS work_address TEXT;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_candidates_company_domain ON public.candidates(company_domain);
CREATE INDEX IF NOT EXISTS idx_candidates_industry ON public.candidates(industry);

COMMENT ON COLUMN public.candidates.company_domain IS 'Company website domain (e.g., example.com)';
COMMENT ON COLUMN public.candidates.company_hq IS 'Company headquarters location';
COMMENT ON COLUMN public.candidates.company_linkedin IS 'Company LinkedIn page URL';
COMMENT ON COLUMN public.candidates.company_description IS 'Description of the company';
COMMENT ON COLUMN public.candidates.company_type IS 'Type of company (Private, Public, etc)';
COMMENT ON COLUMN public.candidates.employee_count IS 'Number of employees at the company';
COMMENT ON COLUMN public.candidates.work_address IS 'Person work/office address';
