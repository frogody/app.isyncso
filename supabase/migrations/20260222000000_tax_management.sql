-- ============================================================================
-- Phase 5A: Tax Management
-- Applied: 2026-02-22
-- ============================================================================

-- Tax rates table
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_company ON public.tax_rates(company_id);

-- RLS
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_rates_select" ON public.tax_rates
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tax_rates_insert" ON public.tax_rates
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tax_rates_update" ON public.tax_rates
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tax_rates_delete" ON public.tax_rates
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Tax periods table
CREATE TABLE IF NOT EXISTS public.tax_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filed', 'closed')),
  tax_collected NUMERIC(15,2) DEFAULT 0,
  tax_paid NUMERIC(15,2) DEFAULT 0,
  net_tax NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  filed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_periods_company ON public.tax_periods(company_id);

-- RLS
ALTER TABLE public.tax_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_periods_select" ON public.tax_periods
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tax_periods_insert" ON public.tax_periods
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tax_periods_update" ON public.tax_periods
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tax_periods_delete" ON public.tax_periods
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Add tax_rate_id to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES public.tax_rates(id);

-- Add tax_rate_id and tax_amount to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES public.tax_rates(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;

-- Function to seed default Dutch tax rates for a company
CREATE OR REPLACE FUNCTION public.seed_default_tax_rates(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only seed if no tax rates exist for this company
  IF EXISTS (SELECT 1 FROM public.tax_rates WHERE company_id = p_company_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.tax_rates (company_id, name, rate, description, is_default, is_active) VALUES
    (p_company_id, 'BTW 21%', 21.00, 'Standard Dutch VAT rate', true, true),
    (p_company_id, 'BTW 9%', 9.00, 'Reduced Dutch VAT rate (food, books, medicine)', false, true),
    (p_company_id, 'BTW 0%', 0.00, 'Zero-rated / Exempt', false, true);
END;
$$;
