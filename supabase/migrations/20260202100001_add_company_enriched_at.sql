-- Add company_enriched_at column to track when company was enriched separately
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_enriched_at TIMESTAMPTZ;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_candidates_company_enriched_at
  ON candidates(company_enriched_at)
  WHERE company_enriched_at IS NOT NULL;
