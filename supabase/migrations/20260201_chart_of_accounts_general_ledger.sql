-- ============================================================================
-- Chart of Accounts & General Ledger Schema
-- Foundation for the Bookkeeping Module
-- ============================================================================

-- 1. ACCOUNT TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read account_types"
  ON public.account_types FOR SELECT TO authenticated
  USING (true);

-- Seed account types
INSERT INTO public.account_types (name, normal_balance, display_order) VALUES
  ('Asset',     'debit',  1),
  ('Liability', 'credit', 2),
  ('Equity',    'credit', 3),
  ('Revenue',   'credit', 4),
  ('Expense',   'debit',  5)
ON CONFLICT (name) DO NOTHING;


-- 2. ACCOUNTS (Chart of Accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  account_type_id UUID NOT NULL REFERENCES public.account_types(id),
  parent_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'EUR',
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_company_code ON public.accounts(company_id, code);
CREATE INDEX IF NOT EXISTS idx_accounts_company_type ON public.accounts(company_id, account_type_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select" ON public.accounts
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "accounts_insert" ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "accounts_update" ON public.accounts
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "accounts_delete" ON public.accounts
  FOR DELETE TO authenticated
  USING (company_id = public.auth_company_id() AND is_system = false);


-- 3. FISCAL PERIODS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, start_date, end_date),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_company ON public.fiscal_periods(company_id, start_date);

ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_periods_select" ON public.fiscal_periods
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "fiscal_periods_insert" ON public.fiscal_periods
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "fiscal_periods_update" ON public.fiscal_periods
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "fiscal_periods_delete" ON public.fiscal_periods
  FOR DELETE TO authenticated
  USING (company_id = public.auth_company_id() AND is_closed = false);


-- 4. JOURNAL ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id),
  reference TEXT,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'invoice', 'expense', 'bill', 'payment')),
  source_id UUID,
  is_posted BOOLEAN NOT NULL DEFAULT false,
  is_adjusting BOOLEAN NOT NULL DEFAULT false,
  is_reversing BOOLEAN NOT NULL DEFAULT false,
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, entry_number)
);

-- Debits must equal credits when posted
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_balanced_when_posted
  CHECK (is_posted = false OR total_debit = total_credit);

CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON public.journal_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_source ON public.journal_entries(company_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_fiscal_period ON public.journal_entries(fiscal_period_id);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_select" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "journal_entries_insert" ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "journal_entries_update" ON public.journal_entries
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "journal_entries_delete" ON public.journal_entries
  FOR DELETE TO authenticated
  USING (company_id = public.auth_company_id() AND is_posted = false);


-- 5. JOURNAL ENTRY LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  description TEXT,
  debit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (debit > 0 OR credit > 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entry_lines_select" ON public.journal_entry_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id AND je.company_id = public.auth_company_id()
  ));

CREATE POLICY "journal_entry_lines_insert" ON public.journal_entry_lines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id AND je.company_id = public.auth_company_id() AND je.is_posted = false
  ));

CREATE POLICY "journal_entry_lines_update" ON public.journal_entry_lines
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id AND je.company_id = public.auth_company_id() AND je.is_posted = false
  ));

CREATE POLICY "journal_entry_lines_delete" ON public.journal_entry_lines
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id AND je.company_id = public.auth_company_id() AND je.is_posted = false
  ));


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate entry_number: JE-000001, JE-000002, ...
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)
  ), 0) + 1
  INTO v_next_num
  FROM public.journal_entries
  WHERE company_id = NEW.company_id;

  NEW.entry_number := 'JE-' || LPAD(v_next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_number
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW
  WHEN (NEW.entry_number IS NULL OR NEW.entry_number = '')
  EXECUTE FUNCTION public.generate_journal_entry_number();

-- Auto-update total_debit / total_credit on journal_entries when lines change
CREATE OR REPLACE FUNCTION public.update_journal_entry_totals()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  v_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  UPDATE public.journal_entries
  SET
    total_debit  = (SELECT COALESCE(SUM(debit), 0)  FROM public.journal_entry_lines WHERE journal_entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM public.journal_entry_lines WHERE journal_entry_id = v_entry_id),
    updated_at = now()
  WHERE id = v_entry_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_journal_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_journal_entry_totals();

-- Auto-set updated_at on accounts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_fiscal_periods_updated_at
  BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Create default Chart of Accounts for a company
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
    (p_company_id, '1510', 'Accumulated Depreciation',  v_asset_id, true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- LIABILITIES (2xxx)
  INSERT INTO public.accounts (company_id, code, name, account_type_id, is_system) VALUES
    (p_company_id, '2000', 'Accounts Payable',     v_liability_id, true),
    (p_company_id, '2100', 'Credit Card Payable',  v_liability_id, true),
    (p_company_id, '2200', 'Accrued Expenses',     v_liability_id, true),
    (p_company_id, '2300', 'Sales Tax Payable',    v_liability_id, true),
    (p_company_id, '2400', 'Payroll Liabilities',  v_liability_id, true),
    (p_company_id, '2500', 'Loans Payable',        v_liability_id, true),
    (p_company_id, '2600', 'Unearned Revenue',     v_liability_id, true)
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


-- Post a journal entry (validate, mark posted, update account balances)
CREATE OR REPLACE FUNCTION public.post_journal_entry(p_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_total_debit  DECIMAL(15,2);
  v_total_credit DECIMAL(15,2);
  v_line RECORD;
  v_normal_balance TEXT;
BEGIN
  -- Fetch the entry
  SELECT * INTO v_entry FROM public.journal_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Journal entry not found');
  END IF;

  IF v_entry.is_posted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Journal entry is already posted');
  END IF;

  IF v_entry.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot post a voided entry');
  END IF;

  -- Calculate totals from lines
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE journal_entry_id = p_entry_id;

  IF v_total_debit = 0 AND v_total_credit = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Journal entry has no lines');
  END IF;

  IF v_total_debit <> v_total_credit THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Debits (%s) do not equal credits (%s)', v_total_debit, v_total_credit));
  END IF;

  -- Check fiscal period is not closed
  IF v_entry.fiscal_period_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.fiscal_periods WHERE id = v_entry.fiscal_period_id AND is_closed = true) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Fiscal period is closed');
    END IF;
  END IF;

  -- Update account balances
  FOR v_line IN
    SELECT jel.*, at.normal_balance
    FROM public.journal_entry_lines jel
    JOIN public.accounts a ON a.id = jel.account_id
    JOIN public.account_types at ON at.id = a.account_type_id
    WHERE jel.journal_entry_id = p_entry_id
  LOOP
    -- Debit-normal accounts: debits increase, credits decrease
    -- Credit-normal accounts: credits increase, debits decrease
    IF v_line.normal_balance = 'debit' THEN
      UPDATE public.accounts
      SET current_balance = current_balance + v_line.debit - v_line.credit,
          updated_at = now()
      WHERE id = v_line.account_id;
    ELSE
      UPDATE public.accounts
      SET current_balance = current_balance + v_line.credit - v_line.debit,
          updated_at = now()
      WHERE id = v_line.account_id;
    END IF;
  END LOOP;

  -- Mark as posted
  UPDATE public.journal_entries
  SET
    is_posted = true,
    total_debit = v_total_debit,
    total_credit = v_total_credit,
    posted_by = auth.uid(),
    posted_at = now(),
    updated_at = now()
  WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'entry_number', v_entry.entry_number,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit
  );
END;
$$;
