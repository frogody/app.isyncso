-- Finance Onboarding: Add columns to companies table for onboarding wizard
-- finance_onboarding_completed: gate flag for showing wizard vs finance pages
-- hq_address: street address (split from legal_address)
-- hq_postal_code: postal code (split from legal_address)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS finance_onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS hq_address TEXT;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS hq_postal_code TEXT;

-- hq_city and hq_country already exist on companies table
-- kvk_number, vat_number, legal_address already exist on companies table
