-- Fix compute_btw_aangifte RPC:
-- 1. Use bill_date as primary date column (was issued_date only)
-- 2. Include standard BTW bill tax_amount in 5b (voorbelasting)
-- 3. Use subtotal instead of amount for bills reverse charge calculation

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
           COALESCE(SUM(COALESCE(subtotal, amount, 0)), 0) AS omzet,
           COALESCE(SUM(
             CASE
               WHEN tax_mechanism IN ('reverse_charge_eu','reverse_charge_non_eu','reverse_charge_domestic')
               THEN ROUND(COALESCE(subtotal, amount, 0) * COALESCE(self_assess_rate, 21) / 100, 2)
               ELSE COALESCE(tax_amount, 0)
             END
           ), 0) AS btw
    FROM bills
    WHERE company_id = p_company_id
      AND btw_rubric IS NOT NULL
      AND COALESCE(bill_date, issued_date, created_at::date) BETWEEN p_start_date AND p_end_date
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

  -- From bills: reverse charge self-assessed + standard BTW tax_amount
  SELECT v_5b_btw + COALESCE(SUM(
    CASE
      WHEN tax_mechanism IN ('reverse_charge_eu','reverse_charge_non_eu','reverse_charge_domestic')
      THEN ROUND(COALESCE(subtotal, amount, 0) * COALESCE(self_assess_rate, 21) / 100, 2)
      WHEN COALESCE(tax_mechanism, 'standard_btw') = 'standard_btw'
      THEN COALESCE(tax_amount, 0)
      ELSE 0
    END
  ), 0) INTO v_5b_btw
  FROM bills
  WHERE company_id = p_company_id
    AND COALESCE(bill_date, issued_date, created_at::date) BETWEEN p_start_date AND p_end_date
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
