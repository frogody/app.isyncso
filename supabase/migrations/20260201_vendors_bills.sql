-- ============================================================================
-- Accounts Payable: Vendors & Bills Schema
-- ============================================================================

-- 1. VENDORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  tax_id TEXT,
  payment_terms INTEGER NOT NULL DEFAULT 30,
  default_expense_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_company_code ON public.vendors(company_id, vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_company_name ON public.vendors(company_id, name);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select" ON public.vendors
  FOR SELECT TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "vendors_insert" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (company_id = public.auth_company_id());
CREATE POLICY "vendors_update" ON public.vendors
  FOR UPDATE TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "vendors_delete" ON public.vendors
  FOR DELETE TO authenticated USING (company_id = public.auth_company_id());


-- 2. BILLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  bill_number TEXT NOT NULL,
  vendor_invoice_number TEXT,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'void')),
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  expense_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ap_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, bill_number),
  CHECK (due_date >= bill_date)
);

CREATE INDEX IF NOT EXISTS idx_bills_company_number ON public.bills(company_id, bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_company_vendor ON public.bills(company_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_company_status ON public.bills(company_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_company_due ON public.bills(company_id, due_date);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills_select" ON public.bills
  FOR SELECT TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated WITH CHECK (company_id = public.auth_company_id());
CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "bills_delete" ON public.bills
  FOR DELETE TO authenticated USING (company_id = public.auth_company_id() AND status = 'draft');


-- 3. BILL LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,4) NOT NULL DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_line_items_bill ON public.bill_line_items(bill_id);

ALTER TABLE public.bill_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_line_items_select" ON public.bill_line_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.company_id = public.auth_company_id()));
CREATE POLICY "bill_line_items_insert" ON public.bill_line_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.company_id = public.auth_company_id()));
CREATE POLICY "bill_line_items_update" ON public.bill_line_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.company_id = public.auth_company_id()));
CREATE POLICY "bill_line_items_delete" ON public.bill_line_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.company_id = public.auth_company_id() AND b.status = 'draft'));


-- 4. BILL PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'card', 'other')),
  reference_number TEXT,
  bank_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON public.bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_company ON public.bill_payments(company_id, payment_date);

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_payments_select" ON public.bill_payments
  FOR SELECT TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "bill_payments_insert" ON public.bill_payments
  FOR INSERT TO authenticated WITH CHECK (company_id = public.auth_company_id());
CREATE POLICY "bill_payments_update" ON public.bill_payments
  FOR UPDATE TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "bill_payments_delete" ON public.bill_payments
  FOR DELETE TO authenticated USING (company_id = public.auth_company_id());


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate vendor code: VND-000001
CREATE OR REPLACE FUNCTION public.generate_vendor_code(p_company_id UUID)
RETURNS TEXT LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(vendor_code FROM 5) AS INTEGER)), 0) + 1
  INTO v_next
  FROM public.vendors
  WHERE company_id = p_company_id;
  RETURN 'VND-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

-- Generate bill number: BILL-000001
CREATE OR REPLACE FUNCTION public.generate_bill_number(p_company_id UUID)
RETURNS TEXT LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 6) AS INTEGER)), 0) + 1
  INTO v_next
  FROM public.bills
  WHERE company_id = p_company_id;
  RETURN 'BILL-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate vendor_code on insert
CREATE OR REPLACE FUNCTION public.trg_generate_vendor_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.vendor_code IS NULL OR NEW.vendor_code = '' THEN
    NEW.vendor_code := public.generate_vendor_code(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_code
  BEFORE INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.trg_generate_vendor_code();

-- Auto-generate bill_number on insert
CREATE OR REPLACE FUNCTION public.trg_generate_bill_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bill_number IS NULL OR NEW.bill_number = '' THEN
    NEW.bill_number := public.generate_bill_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bill_number
  BEFORE INSERT ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_generate_bill_number();

-- Calculate line item tax_amount and total before insert/update
CREATE OR REPLACE FUNCTION public.trg_calculate_line_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- amount is a generated column (quantity * unit_price)
  -- so we use the formula directly here for tax/total calculation
  NEW.tax_amount := ROUND(ROUND(NEW.quantity * NEW.unit_price, 2) * NEW.tax_rate / 100, 2);
  NEW.total := ROUND(NEW.quantity * NEW.unit_price, 2) + NEW.tax_amount;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_line_totals
  BEFORE INSERT OR UPDATE ON public.bill_line_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_calculate_line_totals();

-- Recalculate bill totals when line items change
CREATE OR REPLACE FUNCTION public.calculate_bill_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_bill_id UUID;
  v_subtotal NUMERIC(15,2);
  v_tax NUMERIC(15,2);
  v_total NUMERIC(15,2);
  v_paid NUMERIC(15,2);
  v_status TEXT;
BEGIN
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(tax_amount), 0), COALESCE(SUM(total), 0)
  INTO v_subtotal, v_tax, v_total
  FROM public.bill_line_items WHERE bill_id = v_bill_id;

  SELECT amount_paid, status INTO v_paid, v_status
  FROM public.bills WHERE id = v_bill_id;

  -- Only auto-update status for non-void, non-draft bills
  IF v_status NOT IN ('void', 'draft') THEN
    IF v_paid >= v_total AND v_total > 0 THEN v_status := 'paid';
    ELSIF v_paid > 0 THEN v_status := 'partial';
    ELSE v_status := 'pending';
    END IF;
  END IF;

  UPDATE public.bills SET
    subtotal = v_subtotal,
    tax_amount = v_tax,
    total_amount = v_total,
    balance_due = v_total - v_paid,
    status = v_status,
    updated_at = now()
  WHERE id = v_bill_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_bill_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.bill_line_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_bill_totals();

-- Update bill when payment is recorded/modified
CREATE OR REPLACE FUNCTION public.trg_update_bill_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_bill_id UUID;
  v_total_paid NUMERIC(15,2);
  v_total_amount NUMERIC(15,2);
  v_status TEXT;
BEGIN
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.bill_payments WHERE bill_id = v_bill_id;

  SELECT total_amount, status INTO v_total_amount, v_status
  FROM public.bills WHERE id = v_bill_id;

  IF v_status <> 'void' THEN
    IF v_total_paid >= v_total_amount AND v_total_amount > 0 THEN v_status := 'paid';
    ELSIF v_total_paid > 0 THEN v_status := 'partial';
    ELSE v_status := 'pending';
    END IF;
  END IF;

  UPDATE public.bills SET
    amount_paid = v_total_paid,
    balance_due = v_total_amount - v_total_paid,
    status = v_status,
    updated_at = now()
  WHERE id = v_bill_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_bill_payment_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_bill_on_payment();

-- updated_at triggers
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_bill_line_items_updated_at
  BEFORE UPDATE ON public.bill_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_bill_payments_updated_at
  BEFORE UPDATE ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- POSTING FUNCTIONS (GL integration)
-- ============================================================================

-- Post a bill: creates journal entry debiting expense accounts, crediting AP
CREATE OR REPLACE FUNCTION public.post_bill(p_bill_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bill RECORD;
  v_line RECORD;
  v_je_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_line_order INTEGER := 0;
BEGIN
  SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill not found');
  END IF;

  IF v_bill.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only draft bills can be posted');
  END IF;

  IF v_bill.total_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill has no line items');
  END IF;

  -- Determine AP account: bill-level override or default 2000
  v_ap_account_id := v_bill.ap_account_id;
  IF v_ap_account_id IS NULL THEN
    SELECT id INTO v_ap_account_id FROM public.accounts
    WHERE company_id = v_bill.company_id AND code = '2000' AND is_active = true
    LIMIT 1;
  END IF;
  IF v_ap_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No Accounts Payable account found (code 2000)');
  END IF;

  -- Create journal entry
  INSERT INTO public.journal_entries (
    company_id, entry_date, description, source_type, source_id, created_by
  ) VALUES (
    v_bill.company_id, v_bill.bill_date,
    'Bill ' || v_bill.bill_number || ' — ' || (SELECT name FROM public.vendors WHERE id = v_bill.vendor_id),
    'bill', p_bill_id, auth.uid()
  ) RETURNING id, entry_number INTO v_je_id, v_entry_number;

  -- Debit expense accounts (one line per bill line item)
  FOR v_line IN
    SELECT * FROM public.bill_line_items WHERE bill_id = p_bill_id ORDER BY line_order
  LOOP
    v_line_order := v_line_order + 1;
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, description, debit, credit, line_order
    ) VALUES (
      v_je_id,
      COALESCE(v_line.account_id, v_bill.expense_account_id),
      v_line.description,
      v_line.total,
      0,
      v_line_order
    );
  END LOOP;

  -- Credit Accounts Payable for the total
  v_line_order := v_line_order + 1;
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, description, debit, credit, line_order
  ) VALUES (
    v_je_id,
    v_ap_account_id,
    'Bill ' || v_bill.bill_number || ' payable',
    0,
    v_bill.total_amount,
    v_line_order
  );

  -- Post the journal entry
  PERFORM public.post_journal_entry(v_je_id);

  -- Update bill
  UPDATE public.bills SET
    status = 'pending',
    journal_entry_id = v_je_id,
    ap_account_id = v_ap_account_id,
    updated_at = now()
  WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'success', true,
    'bill_number', v_bill.bill_number,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'total', v_bill.total_amount
  );
END;
$$;

-- Record a payment against a bill: creates journal entry debiting AP, crediting bank
CREATE OR REPLACE FUNCTION public.record_bill_payment(p_payment_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment RECORD;
  v_bill RECORD;
  v_je_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_bank_account_id UUID;
BEGIN
  SELECT * INTO v_payment FROM public.bill_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.journal_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already posted to GL');
  END IF;

  SELECT * INTO v_bill FROM public.bills WHERE id = v_payment.bill_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill not found');
  END IF;

  IF v_bill.status NOT IN ('pending', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill is not payable (status: ' || v_bill.status || ')');
  END IF;

  -- AP account from the bill
  v_ap_account_id := v_bill.ap_account_id;
  IF v_ap_account_id IS NULL THEN
    SELECT id INTO v_ap_account_id FROM public.accounts
    WHERE company_id = v_bill.company_id AND code = '2000' AND is_active = true LIMIT 1;
  END IF;
  IF v_ap_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No Accounts Payable account found');
  END IF;

  -- Bank account from the payment or default 1000
  v_bank_account_id := v_payment.bank_account_id;
  IF v_bank_account_id IS NULL THEN
    SELECT id INTO v_bank_account_id FROM public.accounts
    WHERE company_id = v_bill.company_id AND code = '1000' AND is_active = true LIMIT 1;
  END IF;
  IF v_bank_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No Cash/Bank account found (code 1000)');
  END IF;

  -- Create journal entry
  INSERT INTO public.journal_entries (
    company_id, entry_date, description, source_type, source_id, created_by
  ) VALUES (
    v_bill.company_id, v_payment.payment_date,
    'Payment for ' || v_bill.bill_number || ' — ' || (SELECT name FROM public.vendors WHERE id = v_bill.vendor_id),
    'payment', p_payment_id, auth.uid()
  ) RETURNING id, entry_number INTO v_je_id, v_entry_number;

  -- Debit AP (reduce liability)
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_order)
  VALUES (v_je_id, v_ap_account_id, 'Payment on ' || v_bill.bill_number, v_payment.amount, 0, 1);

  -- Credit Bank (reduce asset)
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_order)
  VALUES (v_je_id, v_bank_account_id, 'Payment on ' || v_bill.bill_number, 0, v_payment.amount, 2);

  -- Post journal entry
  PERFORM public.post_journal_entry(v_je_id);

  -- Link payment to journal entry
  UPDATE public.bill_payments SET journal_entry_id = v_je_id, updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'bill_number', v_bill.bill_number,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'amount_paid', v_payment.amount
  );
END;
$$;
