-- Add company identity columns for smart invoice import vendor/buyer distinction
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS kvk_number TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT;

COMMENT ON COLUMN public.companies.vat_number IS 'Company VAT/BTW number for identity matching';
COMMENT ON COLUMN public.companies.kvk_number IS 'Company KVK/registration number';
COMMENT ON COLUMN public.companies.legal_address IS 'Official registered address';
