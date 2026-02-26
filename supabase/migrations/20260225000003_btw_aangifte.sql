-- ============================================================================
-- BTW Aangifte System — Dutch VAT Return
-- Tax classification columns + rubric helpers + compute RPC + backfill
-- Applied: 2026-02-25
-- ============================================================================

-- ── 1A. Add tax classification columns ──────────────────────────────────────

-- Expenses (purchases)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_mechanism TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS self_assess_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS supplier_country TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS btw_rubric TEXT;

-- Invoices (sales)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_country TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS btw_rubric TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_mechanism TEXT;

-- Bills (AP — purchases)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS tax_mechanism TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS self_assess_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS supplier_country TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS btw_rubric TEXT;

-- Credit notes
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS btw_rubric TEXT;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS tax_mechanism TEXT;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS counterparty_country TEXT;

-- Tax periods: snapshot storage for filed returns
ALTER TABLE public.tax_periods ADD COLUMN IF NOT EXISTS btw_rubric_data JSONB DEFAULT '{}';


-- ── 1B. Rubric assignment helpers (IMMUTABLE) ───────────────────────────────

-- Assign BTW rubric for PURCHASES (expenses / bills)
CREATE OR REPLACE FUNCTION public.assign_expense_btw_rubric(
  p_tax_mechanism TEXT,
  p_supplier_country TEXT
)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    -- Non-EU service → rubric 4a
    WHEN p_tax_mechanism = 'reverse_charge_non_eu' THEN '4a'
    -- EU (non-NL) service → rubric 4b
    WHEN p_tax_mechanism = 'reverse_charge_eu' THEN '4b'
    -- Domestic reverse charge (construction etc.) → rubric 2a
    WHEN p_tax_mechanism = 'reverse_charge_domestic' THEN '2a'
    -- Standard BTW or NL purchase → no rubric (contributes to 5b only)
    WHEN p_tax_mechanism = 'standard_btw' THEN NULL
    -- Import without VAT → no rubric
    WHEN p_tax_mechanism = 'import_no_vat' THEN NULL
    -- Exempt → no rubric
    WHEN p_tax_mechanism = 'exempt' THEN NULL
    ELSE NULL
  END;
$$;

-- Assign BTW rubric for SALES (invoices)
CREATE OR REPLACE FUNCTION public.assign_invoice_btw_rubric(
  p_client_country TEXT,
  p_tax_rate NUMERIC
)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    -- NL domestic sales
    WHEN UPPER(p_client_country) = 'NL' OR p_client_country IS NULL THEN
      CASE
        WHEN p_tax_rate = 21 THEN '1a'
        WHEN p_tax_rate = 9 THEN '1b'
        WHEN p_tax_rate = 0 THEN '1e'
        WHEN p_tax_rate > 0 THEN '1c'
        ELSE '1a'  -- default NL to 21%
      END
    -- EU countries (intracommunity supply)
    WHEN UPPER(p_client_country) IN (
      'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
      'IE','IT','LV','LT','LU','MT','PL','PT','RO','SK','SI','ES','SE'
    ) THEN '3b'
    -- Non-EU (export)
    ELSE '3a'
  END;
$$;


-- ── 1C. compute_btw_aangifte() RPC ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_btw_aangifte(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_row RECORD;
  v_5a_btw NUMERIC(15,2) := 0;
  v_5b_btw NUMERIC(15,2) := 0;
BEGIN
  -- ── SALES RUBRICS (from invoices) ──────────────────────────────────────
  FOR v_row IN
    SELECT btw_rubric,
           COALESCE(SUM(COALESCE(subtotal, total - COALESCE(tax_amount, 0), 0)), 0) AS omzet,
           COALESCE(SUM(COALESCE(tax_amount, 0)), 0) AS btw
    FROM invoices
    WHERE company_id = p_company_id
      AND btw_rubric IS NOT NULL
      AND created_at::date BETWEEN p_start_date AND p_end_date
      AND status NOT IN ('canceled', 'void', 'draft')
    GROUP BY btw_rubric
  LOOP
    v_result := v_result || jsonb_build_object(
      v_row.btw_rubric,
      jsonb_build_object('omzet', v_row.omzet, 'btw', v_row.btw)
    );
    -- Rubrics 1a-1e contribute BTW to 5a
    IF v_row.btw_rubric IN ('1a','1b','1c','1d','1e') THEN
      v_5a_btw := v_5a_btw + v_row.btw;
    END IF;
    -- Rubrics 3a, 3b, 3c: omzet only (no BTW)
  END LOOP;

  -- ── PURCHASE RUBRICS (from expenses) ───────────────────────────────────

  FOR v_row IN
    SELECT btw_rubric,
           COALESCE(SUM(COALESCE(subtotal, total - COALESCE(tax_amount, 0), 0)), 0) AS omzet,
           COALESCE(SUM(
             CASE
               WHEN tax_mechanism IN ('reverse_charge_eu','reverse_charge_non_eu','reverse_charge_domestic')
               THEN ROUND(COALESCE(subtotal, total - COALESCE(tax_amount, 0), 0) * COALESCE(self_assess_rate, 21) / 100, 2)
               ELSE COALESCE(tax_amount, 0)
             END
           ), 0) AS btw
    FROM expenses
    WHERE company_id = p_company_id
      AND btw_rubric IS NOT NULL
      AND COALESCE(invoice_date, created_at::date) BETWEEN p_start_date AND p_end_date
      AND status NOT IN ('draft', 'archived')
    GROUP BY btw_rubric
  LOOP
    -- Merge with existing (in case same rubric from bills)
    IF v_result ? v_row.btw_rubric THEN
      v_result := v_result || jsonb_build_object(
        v_row.btw_rubric,
        jsonb_build_object(
          'omzet', (v_result->v_row.btw_rubric->>'omzet')::NUMERIC + v_row.omzet,
          'btw', (v_result->v_row.btw_rubric->>'btw')::NUMERIC + v_row.btw
        )
      );
    ELSE
      v_result := v_result || jsonb_build_object(
        v_row.btw_rubric,
        jsonb_build_object('omzet', v_row.omzet, 'btw', v_row.btw)
      );
    END IF;

    -- Rubrics 4a, 4b, 2a: self-assessed BTW contributes to 5a
    IF v_row.btw_rubric IN ('4a','4b','2a') THEN
      v_5a_btw := v_5a_btw + v_row.btw;
    END IF;
  END LOOP;

  -- ── PURCHASE RUBRICS (from bills) ──────────────────────────────────────

  FOR v_row IN
    SELECT btw_rubric,
           COALESCE(SUM(COALESCE(amount, 0)), 0) AS omzet,
           COALESCE(SUM(
             CASE
               WHEN tax_mechanism IN ('reverse_charge_eu','reverse_charge_non_eu','reverse_charge_domestic')
               THEN ROUND(COALESCE(amount, 0) * COALESCE(self_assess_rate, 21) / 100, 2)
               ELSE 0
             END
           ), 0) AS btw
    FROM bills
    WHERE company_id = p_company_id
      AND btw_rubric IS NOT NULL
      AND COALESCE(issued_date, created_at::date) BETWEEN p_start_date AND p_end_date
      AND status NOT IN ('draft', 'void')
    GROUP BY btw_rubric
  LOOP
    IF v_result ? v_row.btw_rubric THEN
      v_result := v_result || jsonb_build_object(
        v_row.btw_rubric,
        jsonb_build_object(
          'omzet', (v_result->v_row.btw_rubric->>'omzet')::NUMERIC + v_row.omzet,
          'btw', (v_result->v_row.btw_rubric->>'btw')::NUMERIC + v_row.btw
        )
      );
    ELSE
      v_result := v_result || jsonb_build_object(
        v_row.btw_rubric,
        jsonb_build_object('omzet', v_row.omzet, 'btw', v_row.btw)
      );
    END IF;

    IF v_row.btw_rubric IN ('4a','4b','2a') THEN
      v_5a_btw := v_5a_btw + v_row.btw;
    END IF;
  END LOOP;

  -- ── 5b: Voorbelasting (ALL deductible input VAT) ──────────────────────

  -- From expenses: standard BTW tax_amount + reverse charge self-assessed
  SELECT COALESCE(SUM(
    CASE
      WHEN tax_mechanism IN ('reverse_charge_eu','reverse_charge_non_eu','reverse_charge_domestic')
      THEN ROUND(COALESCE(subtotal, total - COALESCE(tax_amount, 0), 0) * COALESCE(self_assess_rate, 21) / 100, 2)
      WHEN tax_mechanism = 'standard_btw' OR tax_mechanism IS NULL
      THEN COALESCE(tax_amount, 0)
      ELSE 0
    END
  ), 0) INTO v_5b_btw
  FROM expenses
  WHERE company_id = p_company_id
    AND COALESCE(invoice_date, created_at::date) BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('draft', 'archived')
    AND COALESCE(tax_mechanism, 'standard_btw') NOT IN ('exempt', 'import_no_vat');

  -- From bills: same logic (bills only has amount, no separate tax_amount)
  SELECT v_5b_btw + COALESCE(SUM(
    CASE
      WHEN tax_mechanism IN ('reverse_charge_eu','reverse_charge_non_eu','reverse_charge_domestic')
      THEN ROUND(COALESCE(amount, 0) * COALESCE(self_assess_rate, 21) / 100, 2)
      ELSE 0
    END
  ), 0) INTO v_5b_btw
  FROM bills
  WHERE company_id = p_company_id
    AND COALESCE(issued_date, created_at::date) BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('draft', 'void')
    AND COALESCE(tax_mechanism, 'standard_btw') NOT IN ('exempt', 'import_no_vat');

  -- ── TOTALS (Rubriek 5) ────────────────────────────────────────────────

  v_result := v_result || jsonb_build_object(
    '5a', jsonb_build_object('btw', v_5a_btw),
    '5b', jsonb_build_object('btw', v_5b_btw),
    '5c', jsonb_build_object('btw', v_5a_btw - v_5b_btw),
    '5d', jsonb_build_object('btw', 0)  -- KOR vermindering (not implemented)
  );

  -- Ensure all rubrics exist (fill missing with zeros)
  FOR v_row IN
    SELECT unnest(ARRAY['1a','1b','1c','1d','1e','2a','3a','3b','3c','4a','4b']) AS rubric
  LOOP
    IF NOT (v_result ? v_row.rubric) THEN
      v_result := v_result || jsonb_build_object(
        v_row.rubric,
        jsonb_build_object('omzet', 0, 'btw', 0)
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;


-- ── 1D. Update post_expense_with_tax() — fallback to record columns ─────

CREATE OR REPLACE FUNCTION public.post_expense_with_tax(
  p_expense_id UUID,
  p_tax_mechanism TEXT DEFAULT NULL,
  p_self_assess_rate NUMERIC DEFAULT NULL
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
  v_tax_mechanism TEXT;
  v_self_assess_rate NUMERIC;
BEGIN
  -- Fetch expense
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expense not found');
  END IF;

  -- Use parameter or fall back to expense record columns
  v_tax_mechanism := COALESCE(p_tax_mechanism, v_expense.tax_mechanism, 'standard_btw');
  v_self_assess_rate := COALESCE(p_self_assess_rate, v_expense.self_assess_rate, 0);

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
      AND start_date <= COALESCE(v_expense.date, v_expense.invoice_date, CURRENT_DATE)
      AND end_date >= COALESCE(v_expense.date, v_expense.invoice_date, CURRENT_DATE)
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
    COALESCE(v_expense.date, v_expense.invoice_date, CURRENT_DATE),
    'Expense: ' || COALESCE(v_expense.description, 'Business expense') || COALESCE(' - ' || v_expense.vendor, ''),
    'expense', p_expense_id, true, COALESCE(v_expense.amount, v_expense.total, 0), COALESCE(v_expense.amount, v_expense.total, 0),
    v_fiscal_period_id, v_expense.user_id, v_expense.user_id, NOW()
  ) RETURNING id INTO v_je_id;

  -- Line 1: Debit Expense account (the cost)
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_expense_account_id,
    COALESCE(v_expense.description, 'Expense'), COALESCE(v_expense.amount, v_expense.total, 0), 0);

  -- Line 2: Credit Cash/Bank (the payment)
  INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
  VALUES (gen_random_uuid(), v_je_id, v_cash_account_id,
    'Payment', 0, COALESCE(v_expense.amount, v_expense.total, 0));

  -- Update account balances (standard entries)
  UPDATE accounts SET current_balance = current_balance + COALESCE(v_expense.amount, v_expense.total, 0)
  WHERE id = v_expense_account_id;
  UPDATE accounts SET current_balance = current_balance - COALESCE(v_expense.amount, v_expense.total, 0)
  WHERE id = v_cash_account_id;

  -- ── Reverse charge entries ────────────────────────────────────────────────
  IF v_tax_mechanism IN ('reverse_charge_eu', 'reverse_charge_non_eu') AND v_self_assess_rate > 0 THEN
    v_vat_amount := ROUND(COALESCE(v_expense.amount, v_expense.total, 0) * v_self_assess_rate / 100, 2);

    -- Find VAT accounts
    SELECT id INTO v_voorbelasting_id FROM accounts
      WHERE company_id = v_expense.company_id AND code = '1530' AND is_active = true;
    SELECT id INTO v_btw_afdragen_id FROM accounts
      WHERE company_id = v_expense.company_id AND code = '1520' AND is_active = true;

    IF v_voorbelasting_id IS NOT NULL AND v_btw_afdragen_id IS NOT NULL THEN
      -- Line 3: Debit 1530 Voorbelasting (VAT we can reclaim)
      INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
      VALUES (gen_random_uuid(), v_je_id, v_voorbelasting_id,
        'Verlegde BTW — voorbelasting ' || v_self_assess_rate || '%', v_vat_amount, 0);

      -- Line 4: Credit 1520 BTW af te dragen (VAT we owe)
      INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit)
      VALUES (gen_random_uuid(), v_je_id, v_btw_afdragen_id,
        'Verlegde BTW — af te dragen ' || v_self_assess_rate || '%', 0, v_vat_amount);

      -- Update VAT account balances
      UPDATE accounts SET current_balance = current_balance + v_vat_amount
      WHERE id = v_voorbelasting_id;
      UPDATE accounts SET current_balance = current_balance + v_vat_amount
      WHERE id = v_btw_afdragen_id;

      -- Update JE totals to include reverse charge lines
      UPDATE journal_entries
      SET total_debit = total_debit + v_vat_amount,
          total_credit = total_credit + v_vat_amount
      WHERE id = v_je_id;
    ELSE
      RAISE NOTICE 'VAT accounts 1520/1530 not found for company %. Reverse charge entries skipped.', v_expense.company_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'tax_mechanism', v_tax_mechanism,
    'reverse_charge_vat', COALESCE(v_vat_amount, 0),
    'message', CASE
      WHEN v_tax_mechanism IN ('reverse_charge_eu', 'reverse_charge_non_eu')
        THEN 'Expense posted to GL with reverse charge entries'
      ELSE 'Expense posted to General Ledger'
    END
  );
END;
$$;


-- ── 1E. Backfill existing records ───────────────────────────────────────────

-- Set default tax_mechanism for existing expenses without one
UPDATE public.expenses
SET tax_mechanism = 'standard_btw'
WHERE tax_mechanism IS NULL;

-- Backfill invoices: assign btw_rubric based on tax_rate
-- Default NL domestic at 21% → '1a'
UPDATE public.invoices
SET btw_rubric = CASE
    WHEN COALESCE(tax_rate, 21) = 21 THEN '1a'
    WHEN tax_rate = 9 THEN '1b'
    WHEN tax_rate = 0 THEN '1e'
    ELSE '1c'
  END,
  tax_mechanism = 'standard_btw',
  client_country = 'NL'
WHERE btw_rubric IS NULL
  AND invoice_type = 'customer';
