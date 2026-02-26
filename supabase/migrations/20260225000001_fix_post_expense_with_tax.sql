-- ============================================================================
-- Fix post_expense_with_tax() RPC
-- 1. Use ensure_fiscal_periods() instead of bare lookup (auto-creates periods)
-- 2. Fix GL code mapping (advertising→6400, salary→6000, contractors→6600)
-- ============================================================================

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

  -- FIXED: Map expense category to correct GL account codes
  v_expense_code := CASE COALESCE(v_expense.category, 'other')
    WHEN 'software' THEN '6100'
    WHEN 'hosting' THEN '6110'
    WHEN 'office' THEN '6300'              -- Office Supplies (was: 5000 COGS)
    WHEN 'office_supplies' THEN '6300'     -- Office Supplies (was: 5000 COGS)
    WHEN 'travel' THEN '6200'
    WHEN 'marketing' THEN '6400'           -- FIX: Marketing & Advertising (was: 6300)
    WHEN 'advertising' THEN '6400'         -- FIX: Marketing & Advertising (was: 6300)
    WHEN 'equipment' THEN '1500'
    WHEN 'utilities' THEN '6200'
    WHEN 'telecom' THEN '6200'             -- Utilities (was: 6400 which is Marketing)
    WHEN 'salary' THEN '6000'              -- FIX: Salaries & Wages (was: 5100 nonexistent)
    WHEN 'contractors' THEN '6600'         -- FIX: Professional Fees (was: 5200 nonexistent)
    WHEN 'insurance' THEN '6500'
    WHEN 'legal' THEN '6600'
    WHEN 'professional_services' THEN '6600'
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

  -- FIXED: Auto-create fiscal periods if needed, then find the matching one
  v_fiscal_period_id := ensure_fiscal_periods(v_expense.company_id, COALESCE(v_expense.date, CURRENT_DATE));

  IF v_fiscal_period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not create fiscal period for expense date');
  END IF;

  -- Generate entry number
  SELECT 'JE-' || LPAD((COALESCE(MAX(
    CASE WHEN entry_number ~ '^\d+$' THEN entry_number::INT
         WHEN entry_number ~ '^JE-\d+$' THEN SUBSTRING(entry_number FROM 'JE-(\d+)')::INT
         ELSE 0 END
  ), 0) + 1)::TEXT, 6, '0')
  INTO v_entry_number
  FROM journal_entries WHERE company_id = v_expense.company_id;

  -- Create journal entry as DRAFT first (is_posted=false)
  -- A trigger recalculates totals on each line insert; the balanced check
  -- constraint only fires when is_posted=true, so we add all lines first.
  INSERT INTO journal_entries (
    id, company_id, entry_number, entry_date, reference,
    source_type, source_id, is_posted, total_debit, total_credit,
    fiscal_period_id, created_by
  ) VALUES (
    gen_random_uuid(), v_expense.company_id, v_entry_number,
    COALESCE(v_expense.date, CURRENT_DATE),
    'Expense: ' || COALESCE(v_expense.description, 'Business expense') || COALESCE(' - ' || v_expense.vendor, ''),
    'expense', p_expense_id, false, 0, 0,
    v_fiscal_period_id, v_expense.user_id
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
      UPDATE accounts SET current_balance = current_balance + v_vat_amount
      WHERE id = v_voorbelasting_id;
      UPDATE accounts SET current_balance = current_balance + v_vat_amount
      WHERE id = v_btw_afdragen_id;
    ELSE
      RAISE NOTICE 'VAT accounts 1520/1530 not found for company %. Reverse charge entries skipped.', v_expense.company_id;
    END IF;
  END IF;

  -- Now mark as posted — trigger has already set correct totals
  UPDATE journal_entries
  SET is_posted = true,
      posted_by = v_expense.user_id,
      posted_at = NOW()
  WHERE id = v_je_id;

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
