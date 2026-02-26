-- ============================================================================
-- Add tax_mechanism and self_assess_rate to recurring_invoices
-- So recurring templates preserve the tax classification from Smart Import.
-- ============================================================================

ALTER TABLE public.recurring_invoices
  ADD COLUMN IF NOT EXISTS tax_mechanism TEXT DEFAULT 'standard_btw',
  ADD COLUMN IF NOT EXISTS self_assess_rate NUMERIC(5,2) DEFAULT 0;
