-- Ensure enrichment_config table exists with all required options
-- This is idempotent and safe to run multiple times

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS enrichment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE enrichment_config ENABLE ROW LEVEL SECURITY;

-- 3. Create read policy (anyone can read)
DROP POLICY IF EXISTS "Anyone can read enrichment config" ON enrichment_config;
CREATE POLICY "Anyone can read enrichment config"
  ON enrichment_config FOR SELECT
  USING (true);

-- 4. Insert/update all enrichment options
INSERT INTO enrichment_config (key, credits, label, description, display_order, is_active) VALUES
  ('linkedin_enrich', 5, 'LinkedIn Data', 'Contact info, skills, work history, education from Explorium', 1, true),
  ('company_enrich', 3, 'Company Data', 'Firmographics, funding, tech stack, employee data from Explorium', 2, true),
  ('sync_intel', 10, 'SYNC Intelligence', 'AI-powered company intelligence + candidate analysis', 3, true),
  ('full_package', 12, 'Full Package', 'All enrichments combined - LinkedIn + Company + AI Analysis', 4, true)
ON CONFLICT (key) DO UPDATE SET
  credits = EXCLUDED.credits,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
