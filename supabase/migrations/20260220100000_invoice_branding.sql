-- Invoice Branding: Add invoice_branding JSONB column to companies table
-- Stores branding preferences for PDF invoice generation (template, colors, bank details, etc.)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS invoice_branding JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.companies.invoice_branding IS 'Invoice branding config: template, company details, bank info, logo preference, footer text';
