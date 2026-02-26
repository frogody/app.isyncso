-- ============================================================================
-- Phase 1B: Separate platform billing invoices from customer invoices
-- Applied: 2026-02-21
-- ============================================================================

-- Add invoice_type column to distinguish customer invoices from platform billing
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'customer'
  CHECK (invoice_type IN ('customer', 'platform'));

-- Backfill: Any invoice with a stripe_invoice_id is a platform billing invoice
UPDATE public.invoices SET invoice_type = 'platform'
  WHERE stripe_invoice_id IS NOT NULL AND invoice_type = 'customer';

-- Index for efficient filtering by company + type
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(company_id, invoice_type);
