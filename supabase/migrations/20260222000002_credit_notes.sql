-- ============================================================================
-- Phase 5C: Credit Notes / Refunds
-- Applied: 2026-02-22
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  credit_note_number TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  amount NUMERIC(15,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'applied', 'void')),
  issued_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_company ON public.credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON public.credit_notes(invoice_id);

-- RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_notes_select" ON public.credit_notes
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "credit_notes_insert" ON public.credit_notes
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "credit_notes_update" ON public.credit_notes
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "credit_notes_delete" ON public.credit_notes
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Post credit note to GL (reverse the invoice entry)
CREATE OR REPLACE FUNCTION public.post_credit_note(p_credit_note_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cn RECORD;
  v_je_id UUID;
  v_je_number TEXT;
BEGIN
  SELECT * INTO v_cn FROM public.credit_notes WHERE id = p_credit_note_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit note not found');
  END IF;

  IF v_cn.status = 'applied' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit note already applied');
  END IF;

  -- Generate JE number
  v_je_number := 'JE-CN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4);

  -- Create journal entry (reverse of invoice: Debit Revenue, Credit AR)
  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description, source_type, source_id, status
  ) VALUES (
    v_cn.company_id, v_je_number, now()::date,
    'Credit Note ' || v_cn.credit_note_number || ' — ' || v_cn.reason,
    'credit_note', v_cn.id, 'posted'
  )
  RETURNING id INTO v_je_id;

  -- Debit Revenue (4000) — reduce revenue
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
  SELECT v_je_id, a.id, 'Revenue reversal — ' || v_cn.credit_note_number, v_cn.amount, 0
  FROM public.accounts a WHERE a.company_id = v_cn.company_id AND a.code = '4000' LIMIT 1;

  -- Debit Tax Payable (2100) if tax exists — reduce tax liability
  IF v_cn.tax_amount > 0 THEN
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    SELECT v_je_id, a.id, 'Tax reversal — ' || v_cn.credit_note_number, v_cn.tax_amount, 0
    FROM public.accounts a WHERE a.company_id = v_cn.company_id AND a.code = '2100' LIMIT 1;
  END IF;

  -- Credit AR (1100) — reduce receivable
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
  SELECT v_je_id, a.id, 'AR reduction — ' || v_cn.credit_note_number, 0, v_cn.total
  FROM public.accounts a WHERE a.company_id = v_cn.company_id AND a.code = '1100' LIMIT 1;

  -- Update credit note status
  UPDATE public.credit_notes SET status = 'applied', applied_at = now(), updated_at = now()
  WHERE id = p_credit_note_id;

  -- If linked to an invoice, reduce its balance
  IF v_cn.invoice_id IS NOT NULL THEN
    UPDATE public.invoices SET
      total = GREATEST(total - v_cn.total, 0),
      updated_at = now()
    WHERE id = v_cn.invoice_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number
  );
END;
$$;
