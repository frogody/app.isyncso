-- ============================================================================
-- Phase 6: Bank Reconciliation
-- Applied: 2026-02-23
-- ============================================================================

-- ── Fix journal_entries source_type constraint (add credit_note + bank_reconciliation) ──
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_source_type_check;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_source_type_check
  CHECK (source_type IN ('manual', 'invoice', 'expense', 'bill', 'payment', 'credit_note', 'bank_reconciliation'));

-- ══════════════════════════════════════════════════════════════════════════════
-- Table: bank_accounts
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id),  -- FK to GL cash account
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  iban TEXT,
  bic_swift TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_reconciled_at TIMESTAMPTZ,
  last_imported_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON public.bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_gl ON public.bank_accounts(account_id);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════════════
-- Table: bank_transactions
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,  -- positive = credit (inflow), negative = debit (outflow)
  running_balance NUMERIC(15,2),
  reference TEXT,
  counterparty_name TEXT,
  counterparty_iban TEXT,
  category TEXT,
  -- Matching fields
  matched_journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  matched_journal_line_id UUID REFERENCES public.journal_entry_lines(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'matched', 'manually_matched', 'excluded')),
  match_confidence NUMERIC(3,2),  -- 0.00 to 1.00
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  reconciliation_id UUID,  -- will FK to bank_reconciliations after that table is created
  -- Import metadata
  import_batch_id UUID,
  import_source TEXT DEFAULT 'csv',  -- csv, mt940, camt053, manual
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON public.bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match ON public.bank_transactions(match_status) WHERE match_status = 'unmatched';
CREATE INDEX IF NOT EXISTS idx_bank_transactions_je ON public.bank_transactions(matched_journal_entry_id) WHERE matched_journal_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_transactions_batch ON public.bank_transactions(import_batch_id);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_transactions_insert" ON public.bank_transactions
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_transactions_update" ON public.bank_transactions
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_transactions_delete" ON public.bank_transactions
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════════════
-- Table: bank_reconciliations
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_balance NUMERIC(15,2) NOT NULL,
  book_balance NUMERIC(15,2) NOT NULL,
  difference NUMERIC(15,2) NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  unmatched_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reopened')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON public.bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_company ON public.bank_reconciliations(company_id);

-- Add FK from bank_transactions.reconciliation_id
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT fk_bank_transactions_reconciliation
  FOREIGN KEY (reconciliation_id) REFERENCES public.bank_reconciliations(id) ON DELETE SET NULL;

ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_reconciliations_select" ON public.bank_reconciliations
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_reconciliations_insert" ON public.bank_reconciliations
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_reconciliations_update" ON public.bank_reconciliations
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "bank_reconciliations_delete" ON public.bank_reconciliations
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════════════
-- RPC: auto_match_bank_transactions
-- Tiered matching: exact amount → amount+date → reference → counterparty name
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auto_match_bank_transactions(
  p_bank_account_id UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_bank_account RECORD;
  v_gl_account_id UUID;
  v_matched INTEGER := 0;
  v_total INTEGER := 0;
  v_txn RECORD;
  v_je_line RECORD;
BEGIN
  -- Get bank account and its linked GL account
  SELECT * INTO v_bank_account
  FROM public.bank_accounts
  WHERE id = p_bank_account_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bank account not found');
  END IF;

  v_gl_account_id := v_bank_account.account_id;
  IF v_gl_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bank account not linked to a GL account');
  END IF;

  -- Count unmatched transactions
  SELECT COUNT(*) INTO v_total
  FROM public.bank_transactions
  WHERE bank_account_id = p_bank_account_id AND match_status = 'unmatched';

  -- ── Tier 1: Exact amount + date match ─────────────────────────────────
  FOR v_txn IN
    SELECT bt.*
    FROM public.bank_transactions bt
    WHERE bt.bank_account_id = p_bank_account_id
      AND bt.match_status = 'unmatched'
    ORDER BY bt.transaction_date
  LOOP
    -- For inflows (positive amount), look for credit entries on the GL cash account
    -- For outflows (negative amount), look for debit entries on the GL cash account
    IF v_txn.amount > 0 THEN
      -- Inflow: match to JE line with debit on the cash account (cash increases via debit)
      SELECT jel.* INTO v_je_line
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_gl_account_id
        AND jel.debit = v_txn.amount
        AND je.company_id = p_company_id
        AND je.entry_date = v_txn.transaction_date
        AND je.is_posted = true
        AND NOT EXISTS (
          SELECT 1 FROM public.bank_transactions bt2
          WHERE bt2.matched_journal_line_id = jel.id
            AND bt2.match_status IN ('matched', 'manually_matched')
        )
      ORDER BY je.entry_date
      LIMIT 1;
    ELSE
      -- Outflow: match to JE line with credit on the cash account (cash decreases via credit)
      SELECT jel.* INTO v_je_line
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_gl_account_id
        AND jel.credit = ABS(v_txn.amount)
        AND je.company_id = p_company_id
        AND je.entry_date = v_txn.transaction_date
        AND je.is_posted = true
        AND NOT EXISTS (
          SELECT 1 FROM public.bank_transactions bt2
          WHERE bt2.matched_journal_line_id = jel.id
            AND bt2.match_status IN ('matched', 'manually_matched')
        )
      ORDER BY je.entry_date
      LIMIT 1;
    END IF;

    IF FOUND THEN
      UPDATE public.bank_transactions SET
        matched_journal_entry_id = v_je_line.journal_entry_id,
        matched_journal_line_id = v_je_line.id,
        match_status = 'matched',
        match_confidence = 1.00,
        matched_at = now(),
        updated_at = now()
      WHERE id = v_txn.id;
      v_matched := v_matched + 1;
      CONTINUE;
    END IF;

    -- ── Tier 2: Exact amount (within ±3 days) ───────────────────────────
    IF v_txn.amount > 0 THEN
      SELECT jel.* INTO v_je_line
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_gl_account_id
        AND jel.debit = v_txn.amount
        AND je.company_id = p_company_id
        AND je.entry_date BETWEEN v_txn.transaction_date - 3 AND v_txn.transaction_date + 3
        AND je.is_posted = true
        AND NOT EXISTS (
          SELECT 1 FROM public.bank_transactions bt2
          WHERE bt2.matched_journal_line_id = jel.id
            AND bt2.match_status IN ('matched', 'manually_matched')
        )
      ORDER BY ABS(je.entry_date - v_txn.transaction_date)
      LIMIT 1;
    ELSE
      SELECT jel.* INTO v_je_line
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_gl_account_id
        AND jel.credit = ABS(v_txn.amount)
        AND je.company_id = p_company_id
        AND je.entry_date BETWEEN v_txn.transaction_date - 3 AND v_txn.transaction_date + 3
        AND je.is_posted = true
        AND NOT EXISTS (
          SELECT 1 FROM public.bank_transactions bt2
          WHERE bt2.matched_journal_line_id = jel.id
            AND bt2.match_status IN ('matched', 'manually_matched')
        )
      ORDER BY ABS(je.entry_date - v_txn.transaction_date)
      LIMIT 1;
    END IF;

    IF FOUND THEN
      UPDATE public.bank_transactions SET
        matched_journal_entry_id = v_je_line.journal_entry_id,
        matched_journal_line_id = v_je_line.id,
        match_status = 'matched',
        match_confidence = 0.85,
        matched_at = now(),
        updated_at = now()
      WHERE id = v_txn.id;
      v_matched := v_matched + 1;
      CONTINUE;
    END IF;

    -- ── Tier 3: Reference match (description contains JE entry_number) ──
    SELECT jel.* INTO v_je_line
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = v_gl_account_id
      AND je.company_id = p_company_id
      AND je.is_posted = true
      AND (
        (v_txn.amount > 0 AND jel.debit > 0)
        OR (v_txn.amount < 0 AND jel.credit > 0)
      )
      AND (
        v_txn.description ILIKE '%' || je.entry_number || '%'
        OR v_txn.reference ILIKE '%' || je.entry_number || '%'
        OR je.reference ILIKE '%' || COALESCE(v_txn.reference, '') || '%'
      )
      AND COALESCE(v_txn.reference, '') != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.bank_transactions bt2
        WHERE bt2.matched_journal_line_id = jel.id
          AND bt2.match_status IN ('matched', 'manually_matched')
      )
    ORDER BY je.entry_date
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.bank_transactions SET
        matched_journal_entry_id = v_je_line.journal_entry_id,
        matched_journal_line_id = v_je_line.id,
        match_status = 'matched',
        match_confidence = 0.70,
        matched_at = now(),
        updated_at = now()
      WHERE id = v_txn.id;
      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_unmatched', v_total,
    'matched', v_matched,
    'remaining', v_total - v_matched
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- RPC: complete_bank_reconciliation
-- Marks a reconciliation as completed, updates bank account balance
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.complete_bank_reconciliation(
  p_reconciliation_id UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_matched_count INTEGER;
  v_unmatched_count INTEGER;
  v_diff NUMERIC;
BEGIN
  SELECT * INTO v_rec
  FROM public.bank_reconciliations
  WHERE id = p_reconciliation_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reconciliation not found');
  END IF;

  IF v_rec.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reconciliation already completed');
  END IF;

  -- Count matched/unmatched for this reconciliation
  SELECT
    COUNT(*) FILTER (WHERE match_status IN ('matched', 'manually_matched')),
    COUNT(*) FILTER (WHERE match_status = 'unmatched')
  INTO v_matched_count, v_unmatched_count
  FROM public.bank_transactions
  WHERE reconciliation_id = p_reconciliation_id;

  -- Calculate difference
  v_diff := v_rec.statement_balance - v_rec.book_balance;

  -- Update reconciliation
  UPDATE public.bank_reconciliations SET
    matched_count = v_matched_count,
    unmatched_count = v_unmatched_count,
    difference = v_diff,
    status = 'completed',
    completed_at = now(),
    completed_by = auth.uid(),
    updated_at = now()
  WHERE id = p_reconciliation_id;

  -- Update bank account balance and last_reconciled_at
  UPDATE public.bank_accounts SET
    current_balance = v_rec.statement_balance,
    last_reconciled_at = now(),
    updated_at = now()
  WHERE id = v_rec.bank_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'matched_count', v_matched_count,
    'unmatched_count', v_unmatched_count,
    'difference', v_diff
  );
END;
$$;
