-- Add financial columns to prospects for invoice matching
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_country VARCHAR(2);

-- Index for VAT matching within an org
CREATE INDEX IF NOT EXISTS idx_prospects_vat_org
  ON public.prospects(organization_id, vat_number) WHERE vat_number IS NOT NULL;

-- Index for company name matching within an org
CREATE INDEX IF NOT EXISTS idx_prospects_company_org
  ON public.prospects(organization_id, company) WHERE company IS NOT NULL;
