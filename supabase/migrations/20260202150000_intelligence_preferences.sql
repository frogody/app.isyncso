-- Intelligence Preferences: customizable AI analysis settings per organization
CREATE TABLE IF NOT EXISTS intelligence_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID,  -- NULL = org-wide defaults, set = per-user override

  -- Custom signals the recruiter wants the AI to look for
  custom_signals JSONB DEFAULT '[]'::jsonb,

  -- Signal weight overrides (override defaults)
  signal_weights JSONB DEFAULT '{}'::jsonb,

  -- Industry/role-specific instructions for the AI
  industry_context TEXT,
  role_context TEXT,

  -- Companies to treat differently
  company_rules JSONB DEFAULT '[]'::jsonb,

  -- Timing preferences
  timing_preferences JSONB DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One set of preferences per org (or per user within org)
  UNIQUE(organization_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intelligence_preferences_org
  ON intelligence_preferences(organization_id) WHERE is_active = true;

-- RLS
ALTER TABLE intelligence_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own org preferences" ON intelligence_preferences;
CREATE POLICY "Users can read own org preferences"
  ON intelligence_preferences FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own org preferences" ON intelligence_preferences;
CREATE POLICY "Users can insert own org preferences"
  ON intelligence_preferences FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own org preferences" ON intelligence_preferences;
CREATE POLICY "Users can update own org preferences"
  ON intelligence_preferences FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
