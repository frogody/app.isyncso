-- ============================================================================
-- Fix P1 (COA initialization) and P2 (invoice numbering) test failures
-- Applied: 2026-02-20
-- ============================================================================

-- P2 FIX: Rename old timestamp-based invoice numbers so they don't pollute the sequence
-- Old numbers like INV-2026-838439 (from Date.now()) were causing the trigger
-- to generate numbers starting at 838440 instead of 000001
UPDATE invoices SET invoice_number = 'LEGACY-' || invoice_number
  WHERE invoice_number ~ '^INV-2026-\d{6}$'
    AND SUBSTRING(invoice_number FROM '\d{6}$')::INT > 10000;
UPDATE invoices SET invoice_number = 'LEGACY-' || invoice_number
  WHERE invoice_number ~ '^INV-\d{6}$';

-- P1 FIX: The following migrations were applied directly to DB via Management API
-- because they were never auto-applied from the migrations folder:
--   1. 20260201_chart_of_accounts_general_ledger.sql (GL tables + functions)
--   2. 20260201_financial_reports.sql (7 report RPCs + saved_reports table)

-- Create vendors/bills tables needed by get_aged_payables RPC
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vendor_code TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  bill_number TEXT,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(15,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  issued_date DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_company ON public.vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_company ON public.bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor ON public.bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select" ON public.vendors FOR SELECT TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "vendors_insert" ON public.vendors FOR INSERT TO authenticated WITH CHECK (company_id = public.auth_company_id());
CREATE POLICY "vendors_update" ON public.vendors FOR UPDATE TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "vendors_delete" ON public.vendors FOR DELETE TO authenticated USING (company_id = public.auth_company_id());

CREATE POLICY "bills_select" ON public.bills FOR SELECT TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "bills_insert" ON public.bills FOR INSERT TO authenticated WITH CHECK (company_id = public.auth_company_id());
CREATE POLICY "bills_update" ON public.bills FOR UPDATE TO authenticated USING (company_id = public.auth_company_id());
CREATE POLICY "bills_delete" ON public.bills FOR DELETE TO authenticated USING (company_id = public.auth_company_id());

-- Fix post_invoice: AR is account 1100 (not 1200 which is Inventory)
CREATE OR REPLACE FUNCTION public.post_invoice(p_invoice_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_coa_exists BOOLEAN;
  v_already_posted BOOLEAN;
  v_je_id UUID;
  v_entry_number TEXT;
  v_ar_account_id UUID;
  v_revenue_account_id UUID;
  v_fiscal_period_id UUID;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  SELECT EXISTS(SELECT 1 FROM accounts WHERE company_id = v_invoice.company_id LIMIT 1) INTO v_coa_exists;
  IF NOT v_coa_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chart of Accounts not initialized. Visit Ledger > Chart of Accounts to set up.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM journal_entries
    WHERE company_id = v_invoice.company_id AND source_type = 'invoice' AND source_id = p_invoice_id AND voided_at IS NULL
  ) INTO v_already_posted;
  IF v_already_posted THEN
    RETURN jsonb_build_object('success', true, 'message', 'Invoice already posted to GL');
  END IF;

  -- AR is 1100, Revenue is 4000
  SELECT id INTO v_ar_account_id FROM accounts
    WHERE company_id = v_invoice.company_id AND code = '1100' AND is_active = true;
  SELECT id INTO v_revenue_account_id FROM accounts
    WHERE company_id = v_invoice.company_id AND code = '4000' AND is_active = true;

  IF v_ar_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accounts Receivable account (1100) not found');
  END IF;
  IF v_revenue_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sales Revenue account (4000) not found');
  END IF;

  SELECT id INTO v_fiscal_period_id FROM fiscal_periods
    WHERE company_id = v_invoice.company_id
      AND start_date <= COALESCE(v_invoice.due_date, CURRENT_DATE)
      AND end_date >= COALESCE(v_invoice.due_date, CURRENT_DATE)
      AND is_closed = false
    LIMIT 1;

  SELECT 'JE-' || LPAD((COALESCE(MAX(
    CASE WHEN entry_number ~ '^\d+$' THEN entry_number::INT
         WHEN entry_number ~ '^JE-\d+$' THEN SUBSTRING(entry_number FROM 'JE-(\d+)')::INT
         ELSE 0 END
  ), 0) + 1)::TEXT, 6, '0')
  INTO v_entry_number
  FROM journal_entries WHERE company_id = v_invoice.company_id;

  INSERT INTO journal_entries (
    id, company_id, entry_number, entry_date, reference,
    source_type, source_id, is_posted, total_debit, total_credit,
    fiscal_period_id, created_by, posted_by, posted_at
  ) VALUES (
    gen_random_uuid(), v_invoice.company_id, v_entry_number,
    COALESCE(v_invoice.payment_date, CURRENT_DATE),
    'Invoice ' || COALESCE(v_invoice.invoice_number, v_invoice.id::TEXT) || ' - ' || COALESCE(v_invoice.client_name, 'Customer'),
    'invoice', p_invoice_id, true, COALESCE(v_invoice.total, 0), COALESCE(v_invoice.total, 0),
    v_fiscal_period_id, v_invoice.user_id, v_invoice.user_id, NOW()
  ) RETURNING id INTO v_je_id;

  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (
    gen_random_uuid(), v_je_id,
    CASE WHEN v_invoice.status = 'paid' THEN
      COALESCE((SELECT id FROM accounts WHERE company_id = v_invoice.company_id AND code = '1000' AND is_active = true), v_ar_account_id)
    ELSE v_ar_account_id END,
    COALESCE(v_invoice.total, 0), 0
  );

  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_revenue_account_id, 0, COALESCE(v_invoice.total, 0));

  UPDATE accounts SET current_balance = current_balance + COALESCE(v_invoice.total, 0)
  WHERE id = CASE WHEN v_invoice.status = 'paid' THEN
    COALESCE((SELECT id FROM accounts WHERE company_id = v_invoice.company_id AND code = '1000' AND is_active = true), v_ar_account_id)
  ELSE v_ar_account_id END;

  UPDATE accounts SET current_balance = current_balance + COALESCE(v_invoice.total, 0)
  WHERE id = v_revenue_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'message', 'Invoice posted to General Ledger'
  );
END;
$$;

-- Fix post_expense: correct category-to-account code mappings
CREATE OR REPLACE FUNCTION public.post_expense(p_expense_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_expense RECORD;
  v_coa_exists BOOLEAN;
  v_already_posted BOOLEAN;
  v_je_id UUID;
  v_entry_number TEXT;
  v_expense_account_id UUID;
  v_cash_account_id UUID;
  v_expense_code TEXT;
  v_fiscal_period_id UUID;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expense not found');
  END IF;

  SELECT EXISTS(SELECT 1 FROM accounts WHERE company_id = v_expense.company_id LIMIT 1) INTO v_coa_exists;
  IF NOT v_coa_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chart of Accounts not initialized. Visit Ledger > Chart of Accounts to set up.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM journal_entries
    WHERE company_id = v_expense.company_id AND source_type = 'expense' AND source_id = p_expense_id AND voided_at IS NULL
  ) INTO v_already_posted;
  IF v_already_posted THEN
    RETURN jsonb_build_object('success', true, 'message', 'Expense already posted to GL');
  END IF;

  -- Correct category-to-COA mapping
  v_expense_code := CASE COALESCE(v_expense.category, 'other')
    WHEN 'software' THEN '6900'    -- Other Expenses
    WHEN 'office' THEN '6300'      -- Office Supplies
    WHEN 'travel' THEN '6900'      -- Other Expenses
    WHEN 'marketing' THEN '6400'   -- Marketing & Advertising
    WHEN 'equipment' THEN '1500'   -- Fixed Assets
    WHEN 'utilities' THEN '6200'   -- Utilities Expense
    WHEN 'salary' THEN '6000'      -- Salaries & Wages
    WHEN 'contractors' THEN '6600' -- Professional Fees
    WHEN 'insurance' THEN '6500'   -- Insurance Expense
    WHEN 'legal' THEN '6600'       -- Professional Fees
    WHEN 'rent' THEN '6100'        -- Rent Expense
    ELSE '6900'                    -- Other Expenses
  END;

  SELECT id INTO v_expense_account_id FROM accounts
    WHERE company_id = v_expense.company_id AND code = v_expense_code AND is_active = true;

  IF v_expense_account_id IS NULL THEN
    SELECT id INTO v_expense_account_id FROM accounts
      WHERE company_id = v_expense.company_id AND code = '6900' AND is_active = true;
  END IF;
  IF v_expense_account_id IS NULL THEN
    SELECT a.id INTO v_expense_account_id FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.company_id = v_expense.company_id AND at.name = 'Expense' AND a.is_active = true
      LIMIT 1;
  END IF;

  IF v_expense_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No expense account found in Chart of Accounts');
  END IF;

  SELECT id INTO v_cash_account_id FROM accounts
    WHERE company_id = v_expense.company_id AND code = '1000' AND is_active = true;
  IF v_cash_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cash/Bank account (1000) not found');
  END IF;

  SELECT id INTO v_fiscal_period_id FROM fiscal_periods
    WHERE company_id = v_expense.company_id
      AND start_date <= COALESCE(v_expense.date, CURRENT_DATE)
      AND end_date >= COALESCE(v_expense.date, CURRENT_DATE)
      AND is_closed = false
    LIMIT 1;

  SELECT 'JE-' || LPAD((COALESCE(MAX(
    CASE WHEN entry_number ~ '^\d+$' THEN entry_number::INT
         WHEN entry_number ~ '^JE-\d+$' THEN SUBSTRING(entry_number FROM 'JE-(\d+)')::INT
         ELSE 0 END
  ), 0) + 1)::TEXT, 6, '0')
  INTO v_entry_number
  FROM journal_entries WHERE company_id = v_expense.company_id;

  INSERT INTO journal_entries (
    id, company_id, entry_number, entry_date, reference,
    source_type, source_id, is_posted, total_debit, total_credit,
    fiscal_period_id, created_by, posted_by, posted_at
  ) VALUES (
    gen_random_uuid(), v_expense.company_id, v_entry_number,
    COALESCE(v_expense.date, CURRENT_DATE),
    'Expense: ' || COALESCE(v_expense.description, 'Business expense') || COALESCE(' - ' || v_expense.vendor, ''),
    'expense', p_expense_id, true, COALESCE(v_expense.amount, 0), COALESCE(v_expense.amount, 0),
    v_fiscal_period_id, v_expense.user_id, v_expense.user_id, NOW()
  ) RETURNING id INTO v_je_id;

  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_expense_account_id, COALESCE(v_expense.amount, 0), 0);

  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_cash_account_id, 0, COALESCE(v_expense.amount, 0));

  UPDATE accounts SET current_balance = current_balance + COALESCE(v_expense.amount, 0)
  WHERE id = v_expense_account_id;

  UPDATE accounts SET current_balance = current_balance - COALESCE(v_expense.amount, 0)
  WHERE id = v_cash_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'message', 'Expense posted to General Ledger'
  );
END;
$$;
