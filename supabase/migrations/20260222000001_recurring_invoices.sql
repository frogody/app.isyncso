-- ============================================================================
-- Phase 5B: Recurring Invoices
-- Applied: 2026-02-22
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  contact_id UUID REFERENCES public.prospects(id),
  description TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  tax_rate NUMERIC(5,2) DEFAULT 21,
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_generate_date DATE NOT NULL,
  last_generated_at TIMESTAMPTZ,
  auto_send BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  total_generated INTEGER DEFAULT 0,
  max_occurrences INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_company ON public.recurring_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next ON public.recurring_invoices(next_generate_date) WHERE is_active = true;

-- RLS
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_invoices_select" ON public.recurring_invoices
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "recurring_invoices_insert" ON public.recurring_invoices
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "recurring_invoices_update" ON public.recurring_invoices
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "recurring_invoices_delete" ON public.recurring_invoices
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Function to generate invoice from recurring template
CREATE OR REPLACE FUNCTION public.generate_recurring_invoice(p_recurring_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_total NUMERIC;
  v_next_date DATE;
BEGIN
  SELECT * INTO v_rec FROM public.recurring_invoices WHERE id = p_recurring_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring invoice not found or inactive';
  END IF;

  -- Check max occurrences
  IF v_rec.max_occurrences IS NOT NULL AND v_rec.total_generated >= v_rec.max_occurrences THEN
    UPDATE public.recurring_invoices SET is_active = false, updated_at = now() WHERE id = p_recurring_id;
    RAISE EXCEPTION 'Maximum occurrences reached';
  END IF;

  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4);

  -- Calculate totals from items
  SELECT
    COALESCE(SUM((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(v_rec.items) AS item;

  v_tax_amount := v_subtotal * (v_rec.tax_rate / 100);
  v_total := v_subtotal + v_tax_amount;

  -- Create invoice
  INSERT INTO public.invoices (
    company_id, invoice_number, client_name, client_email, client_address,
    contact_id, description, items, subtotal, tax_rate, tax_amount, total,
    status, invoice_type, due_date
  ) VALUES (
    v_rec.company_id, v_invoice_number, v_rec.client_name, v_rec.client_email, v_rec.client_address,
    v_rec.contact_id, v_rec.description, v_rec.items, v_subtotal, v_rec.tax_rate, v_tax_amount, v_total,
    CASE WHEN v_rec.auto_send THEN 'sent' ELSE 'draft' END,
    'customer',
    (now() + interval '30 days')::date
  )
  RETURNING id INTO v_invoice_id;

  -- Calculate next generate date
  v_next_date := CASE v_rec.frequency
    WHEN 'weekly' THEN v_rec.next_generate_date + interval '7 days'
    WHEN 'biweekly' THEN v_rec.next_generate_date + interval '14 days'
    WHEN 'monthly' THEN v_rec.next_generate_date + interval '1 month'
    WHEN 'quarterly' THEN v_rec.next_generate_date + interval '3 months'
    WHEN 'yearly' THEN v_rec.next_generate_date + interval '1 year'
  END;

  -- Update recurring record
  UPDATE public.recurring_invoices SET
    last_generated_at = now(),
    next_generate_date = v_next_date,
    total_generated = total_generated + 1,
    updated_at = now()
  WHERE id = p_recurring_id;

  RETURN v_invoice_id;
END;
$$;
