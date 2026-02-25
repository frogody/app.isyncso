-- ============================================================================
-- ensure_fiscal_periods() — Auto-create quarterly fiscal periods
-- Called by post_expense_with_tax when no period exists for the expense date.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_fiscal_periods(
  p_company_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id UUID;
  v_year INTEGER := EXTRACT(YEAR FROM p_date);
  q INTEGER;
  v_start DATE;
  v_end DATE;
BEGIN
  -- Try to find existing open period
  SELECT id INTO v_period_id FROM fiscal_periods
    WHERE company_id = p_company_id
      AND start_date <= p_date
      AND end_date >= p_date
      AND is_closed = false
    LIMIT 1;

  IF v_period_id IS NOT NULL THEN
    RETURN v_period_id;
  END IF;

  -- Create all 4 quarters for the year
  FOR q IN 1..4 LOOP
    v_start := make_date(v_year, (q - 1) * 3 + 1, 1);
    v_end := (make_date(v_year, q * 3, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date;

    INSERT INTO fiscal_periods (company_id, name, start_date, end_date, is_closed)
    VALUES (p_company_id, format('Q%s %s', q, v_year), v_start, v_end, false)
    ON CONFLICT (company_id, start_date, end_date) DO NOTHING;
  END LOOP;

  -- Return the matching period
  SELECT id INTO v_period_id FROM fiscal_periods
    WHERE company_id = p_company_id
      AND start_date <= p_date
      AND end_date >= p_date
      AND is_closed = false
    LIMIT 1;

  RETURN v_period_id;
END;
$$;
