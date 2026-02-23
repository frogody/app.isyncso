-- =============================================================================
-- Product Feed Enhancements — Channable-style features
-- Adds: category_mappings, master_rule_group support
-- =============================================================================

-- Add category_mappings JSONB column to product_feeds
ALTER TABLE product_feeds
  ADD COLUMN IF NOT EXISTS category_mappings JSONB DEFAULT '[]';

-- Add master_rule_group column (for future master rules feature)
ALTER TABLE product_feeds
  ADD COLUMN IF NOT EXISTS master_rule_group_id UUID;

-- Create master rule groups table
CREATE TABLE IF NOT EXISTS product_feed_master_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    rules JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for master rules
ALTER TABLE product_feed_master_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view master rules"
  ON product_feed_master_rules FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "Company members can manage master rules"
  ON product_feed_master_rules FOR ALL TO authenticated
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

-- Index
CREATE INDEX IF NOT EXISTS idx_master_rules_company
  ON product_feed_master_rules(company_id);

-- Add FK for master_rule_group_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_feeds_master_rule_group_fk'
  ) THEN
    ALTER TABLE product_feeds
      ADD CONSTRAINT product_feeds_master_rule_group_fk
      FOREIGN KEY (master_rule_group_id) REFERENCES product_feed_master_rules(id) ON DELETE SET NULL;
  END IF;
END $$;
