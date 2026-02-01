-- ============================================================================
-- Financial Report Functions
-- Generates Trial Balance, P&L, Balance Sheet, Cash Flow, Aging Reports
-- ============================================================================


-- ============================================================================
-- 1. TRIAL BALANCE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_trial_balance(
  p_company_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  normal_balance TEXT,
  debit_balance DECIMAL(15,2),
  credit_balance DECIMAL(15,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    at.name AS account_type,
    at.normal_balance,
    -- Debit-normal accounts: show net debit (or 0)
    CASE WHEN at.normal_balance = 'debit'
      THEN GREATEST(a.opening_balance + COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0), 0)
      ELSE GREATEST(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0), 0)
    END AS debit_balance,
    -- Credit-normal accounts: show net credit (or 0)
    CASE WHEN at.normal_balance = 'credit'
      THEN GREATEST(a.opening_balance + COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0), 0)
      ELSE GREATEST(COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0), 0)
    END AS credit_balance
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id
        AND je.is_posted = true
        AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  WHERE a.company_id = p_company_id
    AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.opening_balance, at.name, at.normal_balance, at.display_order
  HAVING a.opening_balance != 0
    OR COALESCE(SUM(jel.debit), 0) != 0
    OR COALESCE(SUM(jel.credit), 0) != 0
  ORDER BY at.display_order, a.code;
END;
$$;


-- ============================================================================
-- 2. PROFIT & LOSS (Income Statement)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_profit_loss(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  amount DECIMAL(15,2),
  category TEXT,
  is_summary BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_revenue DECIMAL(15,2) := 0;
  v_total_expense DECIMAL(15,2) := 0;
BEGIN
  -- Revenue accounts (credit-normal: credits - debits = positive revenue)
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    at.name,
    COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0),
    'Revenue'::TEXT,
    false
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Revenue'
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id
        AND je.is_posted = true
        AND je.voided_at IS NULL
        AND je.entry_date BETWEEN p_start_date AND p_end_date
    )
  WHERE a.company_id = p_company_id AND a.is_active = true
  GROUP BY a.id, a.code, a.name, at.name
  HAVING COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) != 0
  ORDER BY a.code;

  -- Get total revenue
  SELECT COALESCE(SUM(COALESCE(s.credit, 0) - COALESCE(s.debit, 0)), 0)
  INTO v_total_revenue
  FROM public.journal_entry_lines s
  JOIN public.accounts a2 ON a2.id = s.account_id AND a2.company_id = p_company_id
  JOIN public.account_types at2 ON at2.id = a2.account_type_id AND at2.name = 'Revenue'
  WHERE EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = s.journal_entry_id
      AND je.company_id = p_company_id
      AND je.is_posted = true
      AND je.voided_at IS NULL
      AND je.entry_date BETWEEN p_start_date AND p_end_date
  );

  -- Revenue total row
  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Total Revenue'::TEXT, 'Revenue'::TEXT, v_total_revenue, 'Revenue'::TEXT, true;

  -- Expense accounts (debit-normal: debits - credits = positive expense)
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    at.name,
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0),
    'Expense'::TEXT,
    false
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Expense'
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id
        AND je.is_posted = true
        AND je.voided_at IS NULL
        AND je.entry_date BETWEEN p_start_date AND p_end_date
    )
  WHERE a.company_id = p_company_id AND a.is_active = true
  GROUP BY a.id, a.code, a.name, at.name
  HAVING COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) != 0
  ORDER BY a.code;

  -- Get total expense
  SELECT COALESCE(SUM(COALESCE(s.debit, 0) - COALESCE(s.credit, 0)), 0)
  INTO v_total_expense
  FROM public.journal_entry_lines s
  JOIN public.accounts a2 ON a2.id = s.account_id AND a2.company_id = p_company_id
  JOIN public.account_types at2 ON at2.id = a2.account_type_id AND at2.name = 'Expense'
  WHERE EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = s.journal_entry_id
      AND je.company_id = p_company_id
      AND je.is_posted = true
      AND je.voided_at IS NULL
      AND je.entry_date BETWEEN p_start_date AND p_end_date
  );

  -- Expense total row
  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Total Expenses'::TEXT, 'Expense'::TEXT, v_total_expense, 'Expense'::TEXT, true;

  -- Net Income row
  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Net Income'::TEXT, ''::TEXT, v_total_revenue - v_total_expense, 'Net Income'::TEXT, true;
END;
$$;


-- ============================================================================
-- 3. BALANCE SHEET
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_balance_sheet(
  p_company_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  balance DECIMAL(15,2),
  category TEXT,
  subcategory TEXT,
  is_summary BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_assets DECIMAL(15,2) := 0;
  v_total_liabilities DECIMAL(15,2) := 0;
  v_total_equity DECIMAL(15,2) := 0;
  v_retained_earnings DECIMAL(15,2) := 0;
  v_current_net_income DECIMAL(15,2) := 0;
  v_fy_start DATE;
BEGIN
  -- Determine fiscal year start (assume Jan 1 of current year of as_of_date)
  v_fy_start := DATE_TRUNC('year', p_as_of_date)::DATE;

  -- Calculate retained earnings (all prior period P&L up to fiscal year start)
  SELECT
    COALESCE(SUM(CASE WHEN at.name = 'Revenue' THEN jel.credit - jel.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN at.name = 'Expense' THEN jel.debit - jel.credit ELSE 0 END), 0)
  INTO v_retained_earnings
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date < v_fy_start
  JOIN public.accounts a ON a.id = jel.account_id
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name IN ('Revenue', 'Expense');

  -- Calculate current period net income (fiscal year start to as_of_date)
  SELECT
    COALESCE(SUM(CASE WHEN at.name = 'Revenue' THEN jel.credit - jel.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN at.name = 'Expense' THEN jel.debit - jel.credit ELSE 0 END), 0)
  INTO v_current_net_income
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN v_fy_start AND p_as_of_date
  JOIN public.accounts a ON a.id = jel.account_id
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name IN ('Revenue', 'Expense');

  -- ASSETS
  RETURN QUERY
  SELECT
    a.id, a.code, a.name, 'Asset'::TEXT,
    a.opening_balance + COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0),
    'Assets'::TEXT,
    CASE
      WHEN a.code < '1400' THEN 'Current Assets'
      WHEN a.code < '1800' THEN 'Fixed Assets'
      ELSE 'Other Assets'
    END::TEXT,
    false
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Asset'
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  WHERE a.company_id = p_company_id AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.opening_balance
  HAVING a.opening_balance + COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) != 0
  ORDER BY a.code;

  -- Calculate total assets
  SELECT COALESCE(SUM(a.opening_balance + sub.net), 0) INTO v_total_assets
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Asset'
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) AS net
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = a.id AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  ) sub ON true
  WHERE a.company_id = p_company_id AND a.is_active = true;

  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Total Assets'::TEXT, 'Asset'::TEXT, v_total_assets, 'Assets'::TEXT, ''::TEXT, true;

  -- LIABILITIES
  RETURN QUERY
  SELECT
    a.id, a.code, a.name, 'Liability'::TEXT,
    a.opening_balance + COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0),
    'Liabilities'::TEXT,
    CASE
      WHEN a.code < '2500' THEN 'Current Liabilities'
      ELSE 'Long-term Liabilities'
    END::TEXT,
    false
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Liability'
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  WHERE a.company_id = p_company_id AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.opening_balance
  HAVING a.opening_balance + COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) != 0
  ORDER BY a.code;

  SELECT COALESCE(SUM(a.opening_balance + sub.net), 0) INTO v_total_liabilities
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Liability'
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) AS net
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = a.id AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  ) sub ON true
  WHERE a.company_id = p_company_id AND a.is_active = true;

  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Total Liabilities'::TEXT, 'Liability'::TEXT, v_total_liabilities, 'Liabilities'::TEXT, ''::TEXT, true;

  -- EQUITY (explicit equity accounts)
  RETURN QUERY
  SELECT
    a.id, a.code, a.name, 'Equity'::TEXT,
    a.opening_balance + COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0),
    'Equity'::TEXT,
    'Equity'::TEXT,
    false
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Equity'
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  WHERE a.company_id = p_company_id AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.opening_balance
  ORDER BY a.code;

  -- Retained Earnings (computed)
  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Retained Earnings (prior periods)'::TEXT, 'Equity'::TEXT, v_retained_earnings, 'Equity'::TEXT, 'Equity'::TEXT, false;

  -- Current Period Net Income
  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Current Period Net Income'::TEXT, 'Equity'::TEXT, v_current_net_income, 'Equity'::TEXT, 'Equity'::TEXT, false;

  -- Total Equity
  SELECT COALESCE(SUM(a.opening_balance + sub.net), 0) INTO v_total_equity
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Equity'
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) AS net
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = a.id AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_as_of_date
    )
  ) sub ON true
  WHERE a.company_id = p_company_id AND a.is_active = true;

  v_total_equity := v_total_equity + v_retained_earnings + v_current_net_income;

  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Total Equity'::TEXT, 'Equity'::TEXT, v_total_equity, 'Equity'::TEXT, ''::TEXT, true;

  -- Total Liabilities + Equity
  RETURN QUERY SELECT NULL::UUID, ''::TEXT, 'Total Liabilities & Equity'::TEXT, ''::TEXT, v_total_liabilities + v_total_equity, 'Total'::TEXT, ''::TEXT, true;
END;
$$;


-- ============================================================================
-- 4. CASH FLOW STATEMENT (Simplified Indirect Method)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_cash_flow(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  description TEXT,
  amount DECIMAL(15,2),
  sort_order INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net_income DECIMAL(15,2) := 0;
  v_depreciation DECIMAL(15,2) := 0;
  v_ar_change DECIMAL(15,2) := 0;
  v_inventory_change DECIMAL(15,2) := 0;
  v_prepaid_change DECIMAL(15,2) := 0;
  v_ap_change DECIMAL(15,2) := 0;
  v_accrued_change DECIMAL(15,2) := 0;
  v_fixed_asset_change DECIMAL(15,2) := 0;
  v_lt_debt_change DECIMAL(15,2) := 0;
  v_equity_change DECIMAL(15,2) := 0;
  v_operating_total DECIMAL(15,2) := 0;
  v_investing_total DECIMAL(15,2) := 0;
  v_financing_total DECIMAL(15,2) := 0;
  v_beginning_cash DECIMAL(15,2) := 0;
  v_ending_cash DECIMAL(15,2) := 0;
BEGIN
  -- Helper: get net change for accounts matching code pattern in date range
  -- Net Income
  SELECT
    COALESCE(SUM(CASE WHEN at.name = 'Revenue' THEN jel.credit - jel.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN at.name = 'Expense' THEN jel.debit - jel.credit ELSE 0 END), 0)
  INTO v_net_income
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name IN ('Revenue', 'Expense');

  -- Depreciation add-back (debit changes to depreciation expense accounts)
  SELECT COALESCE(SUM(jel.debit - jel.credit), 0) INTO v_depreciation
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND (a.code LIKE '68%' OR a.name ILIKE '%depreciation%expense%');

  -- Working capital changes (increase in asset = use of cash = negative)
  -- AR change
  SELECT COALESCE(SUM(jel.debit - jel.credit), 0) INTO v_ar_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '11%';

  -- Inventory change
  SELECT COALESCE(SUM(jel.debit - jel.credit), 0) INTO v_inventory_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '12%';

  -- Prepaid change
  SELECT COALESCE(SUM(jel.debit - jel.credit), 0) INTO v_prepaid_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '13%';

  -- AP change (increase in liability = source of cash = positive)
  SELECT COALESCE(SUM(jel.credit - jel.debit), 0) INTO v_ap_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '20%';

  -- Accrued liabilities change
  SELECT COALESCE(SUM(jel.credit - jel.debit), 0) INTO v_accrued_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '22%';

  -- INVESTING: Fixed assets change (increase = cash used = negative)
  SELECT COALESCE(SUM(jel.debit - jel.credit), 0) INTO v_fixed_asset_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '15%' AND a.code NOT LIKE '151%';

  -- FINANCING: Long-term debt change
  SELECT COALESCE(SUM(jel.credit - jel.debit), 0) INTO v_lt_debt_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id AND a.code LIKE '25%';

  -- FINANCING: Equity changes (owner contributions/draws)
  SELECT COALESCE(SUM(jel.credit - jel.debit), 0) INTO v_equity_change
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  JOIN public.accounts a ON a.id = jel.account_id
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Equity'
  WHERE a.company_id = p_company_id;

  -- Cash balances (accounts 10xx)
  SELECT COALESCE(SUM(a.opening_balance + sub.net), 0) INTO v_ending_cash
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Asset'
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(jel.debit - jel.credit), 0) AS net
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = a.id AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date <= p_end_date
    )
  ) sub ON true
  WHERE a.company_id = p_company_id AND a.code LIKE '10%';

  SELECT COALESCE(SUM(a.opening_balance + sub.net), 0) INTO v_beginning_cash
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id AND at.name = 'Asset'
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(jel.debit - jel.credit), 0) AS net
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = a.id AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date < p_start_date
    )
  ) sub ON true
  WHERE a.company_id = p_company_id AND a.code LIKE '10%';

  v_operating_total := v_net_income + v_depreciation - v_ar_change - v_inventory_change - v_prepaid_change + v_ap_change + v_accrued_change;
  v_investing_total := -v_fixed_asset_change;
  v_financing_total := v_lt_debt_change + v_equity_change;

  -- OPERATING ACTIVITIES
  RETURN QUERY VALUES ('Operating Activities'::TEXT, 'Net Income'::TEXT, v_net_income, 10);
  IF v_depreciation != 0 THEN
    RETURN QUERY VALUES ('Operating Activities', 'Depreciation & Amortization', v_depreciation, 11);
  END IF;
  IF v_ar_change != 0 THEN
    RETURN QUERY VALUES ('Operating Activities', 'Change in Accounts Receivable', -v_ar_change, 12);
  END IF;
  IF v_inventory_change != 0 THEN
    RETURN QUERY VALUES ('Operating Activities', 'Change in Inventory', -v_inventory_change, 13);
  END IF;
  IF v_prepaid_change != 0 THEN
    RETURN QUERY VALUES ('Operating Activities', 'Change in Prepaid Expenses', -v_prepaid_change, 14);
  END IF;
  IF v_ap_change != 0 THEN
    RETURN QUERY VALUES ('Operating Activities', 'Change in Accounts Payable', v_ap_change, 15);
  END IF;
  IF v_accrued_change != 0 THEN
    RETURN QUERY VALUES ('Operating Activities', 'Change in Accrued Liabilities', v_accrued_change, 16);
  END IF;
  RETURN QUERY VALUES ('Operating Activities', 'Net Cash from Operations', v_operating_total, 19);

  -- INVESTING ACTIVITIES
  IF v_fixed_asset_change != 0 THEN
    RETURN QUERY VALUES ('Investing Activities', 'Capital Expenditures', -v_fixed_asset_change, 20);
  END IF;
  RETURN QUERY VALUES ('Investing Activities', 'Net Cash from Investing', v_investing_total, 29);

  -- FINANCING ACTIVITIES
  IF v_lt_debt_change != 0 THEN
    RETURN QUERY VALUES ('Financing Activities', 'Change in Long-term Debt', v_lt_debt_change, 30);
  END IF;
  IF v_equity_change != 0 THEN
    RETURN QUERY VALUES ('Financing Activities', 'Owner Contributions / Draws', v_equity_change, 31);
  END IF;
  RETURN QUERY VALUES ('Financing Activities', 'Net Cash from Financing', v_financing_total, 39);

  -- SUMMARY
  RETURN QUERY VALUES ('Summary', 'Net Change in Cash', v_operating_total + v_investing_total + v_financing_total, 40);
  RETURN QUERY VALUES ('Summary', 'Beginning Cash Balance', v_beginning_cash, 41);
  RETURN QUERY VALUES ('Summary', 'Ending Cash Balance', v_ending_cash, 42);
END;
$$;


-- ============================================================================
-- 5. ACCOUNT ACTIVITY (Drill-down)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_account_activity(
  p_company_id UUID,
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  entry_date DATE,
  entry_number TEXT,
  description TEXT,
  reference TEXT,
  debit DECIMAL(15,2),
  credit DECIMAL(15,2),
  running_balance DECIMAL(15,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening DECIMAL(15,2) := 0;
  v_normal_balance TEXT;
  v_running DECIMAL(15,2);
BEGIN
  -- Get normal balance direction
  SELECT at.normal_balance INTO v_normal_balance
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id
  WHERE a.id = p_account_id;

  -- Calculate opening balance (all posted entries before start_date)
  SELECT
    a.opening_balance + CASE WHEN v_normal_balance = 'debit'
      THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
      ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
    END
  INTO v_opening
  FROM public.accounts a
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = p_company_id AND je.is_posted = true AND je.voided_at IS NULL
        AND je.entry_date < p_start_date
    )
  WHERE a.id = p_account_id
  GROUP BY a.id, a.opening_balance;

  v_opening := COALESCE(v_opening, 0);
  v_running := v_opening;

  -- Opening balance row
  RETURN QUERY SELECT
    p_start_date, ''::TEXT, 'Opening Balance'::TEXT, ''::TEXT,
    0::DECIMAL(15,2), 0::DECIMAL(15,2), v_opening;

  -- Transaction rows with running balance
  RETURN QUERY
  SELECT
    je.entry_date,
    je.entry_number,
    COALESCE(jel.description, je.description, '')::TEXT,
    COALESCE(je.reference, '')::TEXT,
    jel.debit,
    jel.credit,
    v_opening + SUM(
      CASE WHEN v_normal_balance = 'debit'
        THEN jel.debit - jel.credit
        ELSE jel.credit - jel.debit
      END
    ) OVER (ORDER BY je.entry_date, je.entry_number, jel.line_order)
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.company_id = p_company_id
    AND je.is_posted = true
    AND je.voided_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  WHERE jel.account_id = p_account_id
  ORDER BY je.entry_date, je.entry_number, jel.line_order;
END;
$$;


-- ============================================================================
-- 6. AGED PAYABLES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_aged_payables(
  p_company_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE (
  vendor_id UUID,
  vendor_name TEXT,
  vendor_code TEXT,
  current_amount DECIMAL(15,2),
  days_30 DECIMAL(15,2),
  days_60 DECIMAL(15,2),
  days_90 DECIMAL(15,2),
  over_90 DECIMAL(15,2),
  total DECIMAL(15,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS vendor_id,
    v.name AS vendor_name,
    v.vendor_code,
    COALESCE(SUM(CASE WHEN b.due_date >= p_as_of_date THEN b.balance_due ELSE 0 END), 0) AS current_amount,
    COALESCE(SUM(CASE WHEN b.due_date < p_as_of_date AND b.due_date >= p_as_of_date - 30 THEN b.balance_due ELSE 0 END), 0) AS days_30,
    COALESCE(SUM(CASE WHEN b.due_date < p_as_of_date - 30 AND b.due_date >= p_as_of_date - 60 THEN b.balance_due ELSE 0 END), 0) AS days_60,
    COALESCE(SUM(CASE WHEN b.due_date < p_as_of_date - 60 AND b.due_date >= p_as_of_date - 90 THEN b.balance_due ELSE 0 END), 0) AS days_90,
    COALESCE(SUM(CASE WHEN b.due_date < p_as_of_date - 90 THEN b.balance_due ELSE 0 END), 0) AS over_90,
    COALESCE(SUM(b.balance_due), 0) AS total
  FROM public.vendors v
  JOIN public.bills b ON b.vendor_id = v.id
    AND b.company_id = p_company_id
    AND b.status IN ('pending', 'partial')
    AND b.balance_due > 0
  WHERE v.company_id = p_company_id
  GROUP BY v.id, v.name, v.vendor_code
  HAVING COALESCE(SUM(b.balance_due), 0) > 0
  ORDER BY COALESCE(SUM(b.balance_due), 0) DESC;
END;
$$;


-- ============================================================================
-- 7. AGED RECEIVABLES (based on invoices table)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_aged_receivables(
  p_company_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  customer_name TEXT,
  issued_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  total_amount DECIMAL(10,2),
  current_amount DECIMAL(10,2),
  days_30 DECIMAL(10,2),
  days_60 DECIMAL(10,2),
  days_90 DECIMAL(10,2),
  over_90 DECIMAL(10,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Uses the invoices table; groups by individual invoice since no customer entity
  RETURN QUERY
  SELECT
    i.id AS invoice_id,
    i.invoice_number,
    COALESCE(i.notes, 'Customer')::TEXT AS customer_name,
    i.issued_at AS issued_date,
    i.due_at AS due_date,
    i.total AS total_amount,
    CASE WHEN i.due_at >= p_as_of_date::TIMESTAMPTZ THEN i.total ELSE 0::DECIMAL(10,2) END AS current_amount,
    CASE WHEN i.due_at < p_as_of_date::TIMESTAMPTZ AND i.due_at >= (p_as_of_date - 30)::TIMESTAMPTZ THEN i.total ELSE 0::DECIMAL(10,2) END AS days_30,
    CASE WHEN i.due_at < (p_as_of_date - 30)::TIMESTAMPTZ AND i.due_at >= (p_as_of_date - 60)::TIMESTAMPTZ THEN i.total ELSE 0::DECIMAL(10,2) END AS days_60,
    CASE WHEN i.due_at < (p_as_of_date - 60)::TIMESTAMPTZ AND i.due_at >= (p_as_of_date - 90)::TIMESTAMPTZ THEN i.total ELSE 0::DECIMAL(10,2) END AS days_90,
    CASE WHEN i.due_at < (p_as_of_date - 90)::TIMESTAMPTZ THEN i.total ELSE 0::DECIMAL(10,2) END AS over_90
  FROM public.invoices i
  WHERE i.company_id = p_company_id
    AND i.status IN ('pending', 'overdue')
    AND i.total > 0
  ORDER BY i.due_at ASC NULLS LAST;
END;
$$;


-- ============================================================================
-- 8. SAVED REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('trial_balance', 'profit_loss', 'balance_sheet', 'cash_flow', 'aged_payables', 'aged_receivables', 'account_activity')),
  report_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_company ON public.saved_reports(company_id, report_type);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_reports_select" ON public.saved_reports
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "saved_reports_insert" ON public.saved_reports
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "saved_reports_update" ON public.saved_reports
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "saved_reports_delete" ON public.saved_reports
  FOR DELETE TO authenticated
  USING (company_id = public.auth_company_id());
