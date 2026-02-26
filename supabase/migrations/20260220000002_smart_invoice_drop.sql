-- Smart Invoice Drop: exchange_rates table + expenses/vendors column additions
-- Applied: 2026-02-20

-- =============================================================================
-- 1. Exchange Rates Table (ECB rate cache)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from TEXT NOT NULL,
  currency_to TEXT NOT NULL DEFAULT 'EUR',
  rate NUMERIC(12,6) NOT NULL,
  rate_date DATE NOT NULL,
  source TEXT DEFAULT 'ecb',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(currency_from, currency_to, rate_date)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read rates (needed for frontend display)
CREATE POLICY "exchange_rates_select_authenticated"
  ON public.exchange_rates FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- 2. Add currency conversion columns to expenses
-- =============================================================================
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS original_currency TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id);

-- =============================================================================
-- 3. Add vendor detail columns for Smart Invoice extraction
-- =============================================================================
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS iban TEXT;
