-- Deduplicate tax_periods: keep oldest per (company_id, period_name)
DELETE FROM tax_periods
WHERE id NOT IN (
  SELECT DISTINCT ON (company_id, period_name) id
  FROM tax_periods
  ORDER BY company_id, period_name, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE tax_periods
  ADD CONSTRAINT IF NOT EXISTS tax_periods_company_period_unique
  UNIQUE (company_id, period_name);
