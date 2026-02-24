-- Fix bills table: add missing columns that FinanceBills.jsx expects
-- These were missing, causing empty fields when bills were saved from Smart Import

ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS vendor_invoice_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS ap_account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS created_by UUID;

-- Backfill bill_date from issued_date for existing rows
UPDATE public.bills SET bill_date = issued_date WHERE bill_date IS NULL AND issued_date IS NOT NULL;

-- Backfill total_amount from amount for existing rows
UPDATE public.bills SET total_amount = amount WHERE total_amount IS NULL OR total_amount = 0;
