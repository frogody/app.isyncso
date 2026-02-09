-- Outreach Preferences table for message customization
-- NOTE: JSONB columns use empty defaults; rich defaults are handled client-side
-- in useOutreachPreferences.js hook (DEFAULT_PREFERENCES constant)
CREATE TABLE IF NOT EXISTS outreach_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Message type configuration (linkedin_connection, linkedin_inmail, linkedin_message, email)
  message_types JSONB DEFAULT '{}'::jsonb,

  -- Message style defaults
  default_tone TEXT DEFAULT 'professional' CHECK (default_tone IN ('professional', 'casual', 'friendly', 'direct')),
  default_language TEXT DEFAULT 'en',
  formality TEXT DEFAULT 'formal' CHECK (formality IN ('formal', 'casual', 'friendly')),

  -- Data point priorities for message content (0-100 values)
  -- Controls WHICH data points the AI prioritizes when crafting messages
  -- Different from intelligence_preferences which controls SCORING weights
  data_point_priorities JSONB DEFAULT '{}'::jsonb,

  -- Free-form custom instructions for the AI
  custom_instructions TEXT DEFAULT '',

  -- LinkedIn workflow settings
  linkedin_workflow JSONB DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: org-wide defaults have NULL campaign_id
-- Per-campaign overrides have campaign_id set
CREATE UNIQUE INDEX idx_outreach_prefs_org_campaign
  ON outreach_preferences(organization_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Indexes
CREATE INDEX idx_outreach_prefs_org ON outreach_preferences(organization_id);
CREATE INDEX idx_outreach_prefs_campaign ON outreach_preferences(campaign_id) WHERE campaign_id IS NOT NULL;

-- RLS
ALTER TABLE outreach_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org outreach preferences"
  ON outreach_preferences FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can insert their org outreach preferences"
  ON outreach_preferences FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "Users can update their org outreach preferences"
  ON outreach_preferences FOR UPDATE TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can delete their org outreach preferences"
  ON outreach_preferences FOR DELETE TO authenticated
  USING (organization_id = auth_company_id());

-- Trigger for updated_at
CREATE TRIGGER outreach_preferences_updated_at
  BEFORE UPDATE ON outreach_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
