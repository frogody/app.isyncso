-- Add client_vat column to invoices for storing customer VAT number from Smart Import
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_vat TEXT;
