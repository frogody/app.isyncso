-- ============================================================================
-- Finance Critical Fixes Migration
-- A1: Add missing expenses columns (is_recurring, tax_deductible)
-- A4: Sequential invoice numbering via DB function
-- B1: post_invoice() RPC for GL posting
-- B2: post_expense() RPC for GL posting
-- C2: Invoice tax/BTW columns
-- C3: Invoice payment tracking columns
-- ============================================================================

-- ── A1: Add missing expenses columns ────────────────────────────────────────
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT false;

-- ── A4: Sequential invoice numbering ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
  v_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  -- Get the next sequence number for this company and year
  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ ('^INV-' || v_year || '-\d{6}$')
      THEN SUBSTRING(invoice_number FROM '\d{6}$')::INT
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE company_id = p_company_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_number;
END;
$$;

-- Trigger to auto-assign invoice number on INSERT if not provided or uses old format
CREATE OR REPLACE FUNCTION public.trigger_set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if invoice_number is null, empty, or uses the old timestamp format (INV-XXXXXX)
  IF NEW.invoice_number IS NULL
     OR NEW.invoice_number = ''
     OR (NEW.invoice_number ~ '^INV-\d{6}$' AND TG_OP = 'INSERT') THEN
    NEW.invoice_number := generate_invoice_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invoice_number ON public.invoices;
CREATE TRIGGER trg_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_invoice_number();

-- ── C2: Invoice tax/BTW columns ─────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 21,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0;

-- ── C3: Invoice payment tracking columns ────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- ── B1: post_invoice() RPC ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Fetch invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Check if COA exists for this company
  SELECT EXISTS(SELECT 1 FROM accounts WHERE company_id = v_invoice.company_id LIMIT 1)
  INTO v_coa_exists;
  IF NOT v_coa_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chart of Accounts not initialized. Visit Ledger > Chart of Accounts to set up.');
  END IF;

  -- Check if already posted (idempotent)
  SELECT EXISTS(
    SELECT 1 FROM journal_entries
    WHERE company_id = v_invoice.company_id
      AND source_type = 'invoice'
      AND source_id = p_invoice_id
      AND voided_at IS NULL
  ) INTO v_already_posted;
  IF v_already_posted THEN
    RETURN jsonb_build_object('success', true, 'message', 'Invoice already posted to GL');
  END IF;

  -- Find AR account (code 1200) and Revenue account (code 4000)
  SELECT id INTO v_ar_account_id FROM accounts
    WHERE company_id = v_invoice.company_id AND code = '1200' AND is_active = true;
  SELECT id INTO v_revenue_account_id FROM accounts
    WHERE company_id = v_invoice.company_id AND code = '4000' AND is_active = true;

  IF v_ar_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accounts Receivable account (1200) not found');
  END IF;
  IF v_revenue_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sales Revenue account (4000) not found');
  END IF;

  -- Find fiscal period (optional)
  SELECT id INTO v_fiscal_period_id FROM fiscal_periods
    WHERE company_id = v_invoice.company_id
      AND start_date <= COALESCE(v_invoice.due_date, CURRENT_DATE)
      AND end_date >= COALESCE(v_invoice.due_date, CURRENT_DATE)
      AND is_closed = false
    LIMIT 1;

  -- Generate entry number
  SELECT 'JE-' || LPAD((COALESCE(MAX(
    CASE WHEN entry_number ~ '^\d+$' THEN entry_number::INT
         WHEN entry_number ~ '^JE-\d+$' THEN SUBSTRING(entry_number FROM 'JE-(\d+)')::INT
         ELSE 0 END
  ), 0) + 1)::TEXT, 6, '0')
  INTO v_entry_number
  FROM journal_entries WHERE company_id = v_invoice.company_id;

  -- Create journal entry
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

  -- Debit: Accounts Receivable (or Cash if paid)
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (
    gen_random_uuid(), v_je_id,
    CASE WHEN v_invoice.status = 'paid' THEN
      COALESCE((SELECT id FROM accounts WHERE company_id = v_invoice.company_id AND code = '1000' AND is_active = true), v_ar_account_id)
    ELSE v_ar_account_id END,
    COALESCE(v_invoice.total, 0), 0
  );

  -- Credit: Sales Revenue
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_revenue_account_id, 0, COALESCE(v_invoice.total, 0));

  -- Update account balances
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

-- ── B2: post_expense() RPC ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_expense(p_expense_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Fetch expense
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expense not found');
  END IF;

  -- Check if COA exists
  SELECT EXISTS(SELECT 1 FROM accounts WHERE company_id = v_expense.company_id LIMIT 1)
  INTO v_coa_exists;
  IF NOT v_coa_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chart of Accounts not initialized. Visit Ledger > Chart of Accounts to set up.');
  END IF;

  -- Check if already posted (idempotent)
  SELECT EXISTS(
    SELECT 1 FROM journal_entries
    WHERE company_id = v_expense.company_id
      AND source_type = 'expense'
      AND source_id = p_expense_id
      AND voided_at IS NULL
  ) INTO v_already_posted;
  IF v_already_posted THEN
    RETURN jsonb_build_object('success', true, 'message', 'Expense already posted to GL');
  END IF;

  -- Map expense category to account code
  v_expense_code := CASE COALESCE(v_expense.category, 'other')
    WHEN 'software' THEN '6100'
    WHEN 'office' THEN '5000'
    WHEN 'travel' THEN '6200'
    WHEN 'marketing' THEN '6300'
    WHEN 'equipment' THEN '1500'
    WHEN 'utilities' THEN '6400'
    WHEN 'salary' THEN '5100'
    WHEN 'contractors' THEN '5200'
    WHEN 'insurance' THEN '6500'
    WHEN 'legal' THEN '6600'
    ELSE '6900'
  END;

  -- Find expense account
  SELECT id INTO v_expense_account_id FROM accounts
    WHERE company_id = v_expense.company_id AND code = v_expense_code AND is_active = true;

  -- Fallback to generic expense account (6900) if specific not found
  IF v_expense_account_id IS NULL THEN
    SELECT id INTO v_expense_account_id FROM accounts
      WHERE company_id = v_expense.company_id AND code = '6900' AND is_active = true;
  END IF;
  -- Fallback to any expense account
  IF v_expense_account_id IS NULL THEN
    SELECT a.id INTO v_expense_account_id FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.company_id = v_expense.company_id AND at.name = 'Expense' AND a.is_active = true
      LIMIT 1;
  END IF;

  IF v_expense_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No expense account found in Chart of Accounts');
  END IF;

  -- Find Cash/Bank account (1000)
  SELECT id INTO v_cash_account_id FROM accounts
    WHERE company_id = v_expense.company_id AND code = '1000' AND is_active = true;
  IF v_cash_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cash/Bank account (1000) not found');
  END IF;

  -- Find fiscal period (optional)
  SELECT id INTO v_fiscal_period_id FROM fiscal_periods
    WHERE company_id = v_expense.company_id
      AND start_date <= COALESCE(v_expense.date, CURRENT_DATE)
      AND end_date >= COALESCE(v_expense.date, CURRENT_DATE)
      AND is_closed = false
    LIMIT 1;

  -- Generate entry number
  SELECT 'JE-' || LPAD((COALESCE(MAX(
    CASE WHEN entry_number ~ '^\d+$' THEN entry_number::INT
         WHEN entry_number ~ '^JE-\d+$' THEN SUBSTRING(entry_number FROM 'JE-(\d+)')::INT
         ELSE 0 END
  ), 0) + 1)::TEXT, 6, '0')
  INTO v_entry_number
  FROM journal_entries WHERE company_id = v_expense.company_id;

  -- Create journal entry
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

  -- Debit: Expense account
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_expense_account_id, COALESCE(v_expense.amount, 0), 0);

  -- Credit: Cash/Bank
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_cash_account_id, 0, COALESCE(v_expense.amount, 0));

  -- Update account balances
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

-- ── B5: Backfill function ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.backfill_finance_to_gl(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_expense RECORD;
  v_result JSONB;
  v_invoices_posted INT := 0;
  v_expenses_posted INT := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- Post all paid invoices
  FOR v_invoice IN
    SELECT id FROM invoices
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND id NOT IN (
        SELECT source_id FROM journal_entries
        WHERE company_id = p_company_id AND source_type = 'invoice' AND voided_at IS NULL
      )
  LOOP
    v_result := post_invoice(v_invoice.id);
    IF (v_result->>'success')::boolean THEN
      v_invoices_posted := v_invoices_posted + 1;
    ELSE
      v_errors := array_append(v_errors, 'Invoice ' || v_invoice.id || ': ' || (v_result->>'error'));
    END IF;
  END LOOP;

  -- Post all expenses
  FOR v_expense IN
    SELECT id FROM expenses
    WHERE company_id = p_company_id
      AND id NOT IN (
        SELECT source_id FROM journal_entries
        WHERE company_id = p_company_id AND source_type = 'expense' AND voided_at IS NULL
      )
  LOOP
    v_result := post_expense(v_expense.id);
    IF (v_result->>'success')::boolean THEN
      v_expenses_posted := v_expenses_posted + 1;
    ELSE
      v_errors := array_append(v_errors, 'Expense ' || v_expense.id || ': ' || (v_result->>'error'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'invoices_posted', v_invoices_posted,
    'expenses_posted', v_expenses_posted,
    'errors', to_jsonb(v_errors)
  );
END;
$$;
