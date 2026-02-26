-- ============================================================================
-- post_expense_with_tax() RPC — Reverse charge GL entries
-- Adds VAT accounts 1520 (BTW af te dragen) and 1530 (Voorbelasting)
-- to create_default_chart_of_accounts, then creates the RPC function.
-- ============================================================================

-- ── 1. Add VAT accounts to default Chart of Accounts ──────────────────────────

CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts(p_company_id UUID)
RETURNS VOID LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_asset_id    UUID;
  v_liability_id UUID;
  v_equity_id   UUID;
  v_revenue_id  UUID;
  v_expense_id  UUID;
BEGIN
  SELECT id INTO v_asset_id     FROM public.account_types WHERE name = 'Asset';
  SELECT id INTO v_liability_id FROM public.account_types WHERE name = 'Liability';
  SELECT id INTO v_equity_id    FROM public.account_types WHERE name = 'Equity';
  SELECT id INTO v_revenue_id   FROM public.account_types WHERE name = 'Revenue';
  SELECT id INTO v_expense_id   FROM public.account_types WHERE name = 'Expense';

  -- ASSETS (1xxx)
  INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system) VALUES
    (p_company_id, '1000', 'Cash',                      v_asset_id, true),
    (p_company_id, '1010', 'Petty Cash',                v_asset_id, true),
    (p_company_id, '1100', 'Accounts Receivable',       v_asset_id, true),
    (p_company_id, '1200', 'Inventory',                 v_asset_id, true),
    (p_company_id, '1300', 'Prepaid Expenses',          v_asset_id, true),
    (p_company_id, '1500', 'Fixed Assets',              v_asset_id, true),
    (p_company_id, '1510', 'Accumulated Depreciation',  v_asset_id, true),
    -- NEW: VAT accounts
    (p_company_id, '1530', 'Voorbelasting (BTW te vorderen)', v_asset_id, true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- LIABILITIES (2xxx)
  INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system) VALUES
    (p_company_id, '2000', 'Accounts Payable',     v_liability_id, true),
    (p_company_id, '2100', 'Credit Card Payable',  v_liability_id, true),
    (p_company_id, '2200', 'Accrued Expenses',     v_liability_id, true),
    (p_company_id, '2300', 'Sales Tax Payable',    v_liability_id, true),
    (p_company_id, '2400', 'Payroll Liabilities',  v_liability_id, true),
    (p_company_id, '2500', 'Loans Payable',        v_liability_id, true),
    (p_company_id, '2600', 'Unearned Revenue',     v_liability_id, true),
    -- NEW: BTW payable account
    (p_company_id, '1520', 'BTW af te dragen',     v_liability_id, true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- EQUITY (3xxx)
  INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system) VALUES
    (p_company_id, '3000', 'Owner''s Equity / Capital', v_equity_id, true),
    (p_company_id, '3100', 'Retained Earnings',         v_equity_id, true),
    (p_company_id, '3200', 'Owner''s Draws',             v_equity_id, true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- REVENUE (4xxx)
  INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system) VALUES
    (p_company_id, '4000', 'Sales Revenue',    v_revenue_id, true),
    (p_company_id, '4100', 'Service Revenue',  v_revenue_id, true),
    (p_company_id, '4200', 'Interest Income',  v_revenue_id, true),
    (p_company_id, '4300', 'Other Income',     v_revenue_id, true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- EXPENSES (5xxx-6xxx)
  INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system) VALUES
    (p_company_id, '5000', 'Cost of Goods Sold',        v_expense_id, true),
    (p_company_id, '6000', 'Salaries & Wages',          v_expense_id, true),
    (p_company_id, '6100', 'Rent Expense',              v_expense_id, true),
    (p_company_id, '6110', 'Hosting & Cloud',           v_expense_id, true),
    (p_company_id, '6200', 'Utilities Expense',         v_expense_id, true),
    (p_company_id, '6300', 'Office Supplies',           v_expense_id, true),
    (p_company_id, '6400', 'Marketing & Advertising',   v_expense_id, true),
    (p_company_id, '6500', 'Insurance Expense',         v_expense_id, true),
    (p_company_id, '6600', 'Professional Fees',         v_expense_id, true),
    (p_company_id, '6700', 'Bank Fees',                 v_expense_id, true),
    (p_company_id, '6800', 'Depreciation Expense',      v_expense_id, true),
    (p_company_id, '6900', 'Other Expenses',            v_expense_id, true)
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$;

-- ── 2. Ensure VAT accounts exist for ALL existing companies ───────────────────

DO $$
DECLARE
  v_asset_id UUID;
  v_liability_id UUID;
  v_company RECORD;
BEGIN
  SELECT id INTO v_asset_id FROM public.account_types WHERE name = 'Asset';
  SELECT id INTO v_liability_id FROM public.account_types WHERE name = 'Liability';

  FOR v_company IN
    SELECT DISTINCT company_id FROM public.accounts
  LOOP
    -- 1530 Voorbelasting (VAT receivable) — Asset
    INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system)
    VALUES (v_company.company_id, '1530', 'Voorbelasting (BTW te vorderen)', v_asset_id, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- 1520 BTW af te dragen (VAT payable) — Liability
    INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system)
    VALUES (v_company.company_id, '1520', 'BTW af te dragen', v_liability_id, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- 6110 Hosting & Cloud — Expense (if missing)
    INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system)
    VALUES (v_company.company_id, '6110', 'Hosting & Cloud',
      (SELECT id FROM public.account_types WHERE name = 'Expense'), true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 3. post_expense_with_tax() RPC ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.post_expense_with_tax(
  p_expense_id UUID,
  p_tax_mechanism TEXT DEFAULT 'standard_btw',
  p_self_assess_rate NUMERIC DEFAULT 0
)
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
  v_voorbelasting_id UUID;
  v_btw_afdragen_id UUID;
  v_expense_code TEXT;
  v_fiscal_period_id UUID;
  v_vat_amount NUMERIC(15,2);
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
    RETURN jsonb_build_object('success', false, 'error', 'Chart of Accounts not initialized.');
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
    WHEN 'hosting' THEN '6110'
    WHEN 'office' THEN '5000'
    WHEN 'office_supplies' THEN '5000'
    WHEN 'travel' THEN '6200'
    WHEN 'marketing' THEN '6300'
    WHEN 'advertising' THEN '6300'
    WHEN 'equipment' THEN '1500'
    WHEN 'utilities' THEN '6200'
    WHEN 'telecom' THEN '6400'
    WHEN 'salary' THEN '5100'
    WHEN 'contractors' THEN '5200'
    WHEN 'insurance' THEN '6500'
    WHEN 'legal' THEN '6600'
    WHEN 'professional_services' THEN '6700'
    WHEN 'rent' THEN '6100'
    ELSE '6900'
  END;

  -- Find expense account
  SELECT id INTO v_expense_account_id FROM accounts
    WHERE company_id = v_expense.company_id AND code = v_expense_code AND is_active = true;

  -- Fallback to 6900 then any expense account
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
    RETURN jsonb_build_object('success', false, 'error', 'No expense account found');
  END IF;

  -- Find Cash/Bank account (1000)
  SELECT id INTO v_cash_account_id FROM accounts
    WHERE company_id = v_expense.company_id AND code = '1000' AND is_active = true;
  IF v_cash_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cash/Bank account (1000) not found');
  END IF;

  -- Find fiscal period
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

  -- Line 1: Debit Expense account (the cost)
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_expense_account_id,
    COALESCE(v_expense.description, 'Expense'), COALESCE(v_expense.amount, 0), 0);

  -- Line 2: Credit Cash/Bank (the payment)
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_cash_account_id,
    'Payment', 0, COALESCE(v_expense.amount, 0));

  -- Update account balances (standard entries)
  UPDATE accounts SET current_balance = current_balance + COALESCE(v_expense.amount, 0)
  WHERE id = v_expense_account_id;
  UPDATE accounts SET current_balance = current_balance - COALESCE(v_expense.amount, 0)
  WHERE id = v_cash_account_id;

  -- ── Reverse charge entries ────────────────────────────────────────────────
  IF p_tax_mechanism IN ('reverse_charge_eu', 'reverse_charge_non_eu') AND p_self_assess_rate > 0 THEN
    v_vat_amount := ROUND(COALESCE(v_expense.amount, 0) * p_self_assess_rate / 100, 2);

    -- Find VAT accounts
    SELECT id INTO v_voorbelasting_id FROM accounts
      WHERE company_id = v_expense.company_id AND code = '1530' AND is_active = true;
    SELECT id INTO v_btw_afdragen_id FROM accounts
      WHERE company_id = v_expense.company_id AND code = '1520' AND is_active = true;

    IF v_voorbelasting_id IS NOT NULL AND v_btw_afdragen_id IS NOT NULL THEN
      -- Line 3: Debit 1530 Voorbelasting (VAT we can reclaim)
      INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
      VALUES (gen_random_uuid(), v_je_id, v_voorbelasting_id,
        'Verlegde BTW — voorbelasting ' || p_self_assess_rate || '%', v_vat_amount, 0);

      -- Line 4: Credit 1520 BTW af te dragen (VAT we owe)
      INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
      VALUES (gen_random_uuid(), v_je_id, v_btw_afdragen_id,
        'Verlegde BTW — af te dragen ' || p_self_assess_rate || '%', 0, v_vat_amount);

      -- Update VAT account balances
      -- 1530 is Asset (debit-normal): debit increases
      UPDATE accounts SET current_balance = current_balance + v_vat_amount
      WHERE id = v_voorbelasting_id;
      -- 1520 is Liability (credit-normal): credit increases
      UPDATE accounts SET current_balance = current_balance + v_vat_amount
      WHERE id = v_btw_afdragen_id;

      -- Update JE totals to include reverse charge lines
      UPDATE journal_entries
      SET total_debit = total_debit + v_vat_amount,
          total_credit = total_credit + v_vat_amount
      WHERE id = v_je_id;
    ELSE
      -- VAT accounts not found — log warning but don't fail
      RAISE NOTICE 'VAT accounts 1520/1530 not found for company %. Reverse charge entries skipped.', v_expense.company_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'tax_mechanism', p_tax_mechanism,
    'reverse_charge_vat', COALESCE(v_vat_amount, 0),
    'message', CASE
      WHEN p_tax_mechanism IN ('reverse_charge_eu', 'reverse_charge_non_eu')
        THEN 'Expense posted to GL with reverse charge entries'
      ELSE 'Expense posted to General Ledger'
    END
  );
END;
$$;
