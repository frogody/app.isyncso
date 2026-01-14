-- Migration: Talent Integration - Flight Risk Intelligence & Outreach Tasks
-- Created: 2026-01-14
-- Description: Extends candidates and campaigns tables with intelligence fields,
--              creates outreach_tasks table for campaign automation

-- ============================================================================
-- SECTION 1: Extend candidates table with Flight Risk Intelligence fields
-- ============================================================================

-- Intelligence score (0-100) representing overall flight risk assessment
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS intelligence_score INTEGER;

-- Add CHECK constraint for intelligence_score range
ALTER TABLE candidates
ADD CONSTRAINT candidates_intelligence_score_range
CHECK (intelligence_score IS NULL OR (intelligence_score >= 0 AND intelligence_score <= 100));

-- Intelligence level categorization
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS intelligence_level TEXT;

ALTER TABLE candidates
ADD CONSTRAINT candidates_intelligence_level_values
CHECK (intelligence_level IS NULL OR intelligence_level IN ('Low', 'Medium', 'High', 'Critical'));

-- Urgency level for outreach timing
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS intelligence_urgency TEXT;

ALTER TABLE candidates
ADD CONSTRAINT candidates_intelligence_urgency_values
CHECK (intelligence_urgency IS NULL OR intelligence_urgency IN ('Low', 'Medium', 'High'));

-- JSONB array of factors contributing to flight risk score
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS intelligence_factors JSONB DEFAULT '[]';

-- JSONB array of timing-related intelligence data
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS intelligence_timing JSONB DEFAULT '[]';

-- Recommended approach for candidate engagement
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS recommended_approach TEXT;

ALTER TABLE candidates
ADD CONSTRAINT candidates_recommended_approach_values
CHECK (recommended_approach IS NULL OR recommended_approach IN ('nurture', 'targeted', 'immediate'));

-- Recommended timeline for outreach
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS recommended_timeline TEXT;

-- Timestamp of last intelligence update
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS last_intelligence_update TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN candidates.intelligence_score IS 'Flight risk score from 0-100, higher indicates greater risk of leaving current role';
COMMENT ON COLUMN candidates.intelligence_level IS 'Categorized flight risk level: Low, Medium, High, or Critical';
COMMENT ON COLUMN candidates.intelligence_urgency IS 'Urgency level for outreach: Low, Medium, or High';
COMMENT ON COLUMN candidates.intelligence_factors IS 'JSON array of factors contributing to the intelligence score';
COMMENT ON COLUMN candidates.intelligence_timing IS 'JSON array of timing-related signals and predictions';
COMMENT ON COLUMN candidates.recommended_approach IS 'Suggested engagement approach: nurture, targeted, or immediate';
COMMENT ON COLUMN candidates.recommended_timeline IS 'Recommended timeframe for initiating contact';
COMMENT ON COLUMN candidates.last_intelligence_update IS 'Timestamp when intelligence data was last refreshed';

-- ============================================================================
-- SECTION 2: Extend campaigns table
-- ============================================================================

-- JSONB array of matched candidate references
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS matched_candidates JSONB DEFAULT '[]';

-- JSONB object for message styling configuration
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS message_style JSONB DEFAULT '{}';

-- Campaign type classification
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'growth';

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_campaign_type_values
CHECK (campaign_type IN ('growth', 'recruitment'));

-- Add comments for documentation
COMMENT ON COLUMN campaigns.matched_candidates IS 'JSON array of candidate IDs and metadata matched to this campaign';
COMMENT ON COLUMN campaigns.message_style IS 'JSON object containing message styling preferences (tone, length, format)';
COMMENT ON COLUMN campaigns.campaign_type IS 'Type of campaign: growth (existing relationships) or recruitment (new candidates)';

-- ============================================================================
-- SECTION 3: Create outreach_tasks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    message_content TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    stage TEXT NOT NULL DEFAULT 'first_message',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT outreach_tasks_task_type_values
        CHECK (task_type IN ('initial_outreach', 'follow_up_1', 'follow_up_2', 'check_reply')),
    CONSTRAINT outreach_tasks_status_values
        CHECK (status IN ('pending', 'approved_ready', 'sent', 'completed', 'cancelled')),
    CONSTRAINT outreach_tasks_stage_values
        CHECK (stage IN ('first_message', 'follow_up_1', 'follow_up_2', 'no_reply', 'connected', 'awaiting_reply')),
    CONSTRAINT outreach_tasks_attempt_number_positive
        CHECK (attempt_number >= 1)
);

COMMENT ON TABLE outreach_tasks IS 'Stores outreach tasks for campaign automation, tracking messages sent to candidates';

-- ============================================================================
-- SECTION 4: Enable Row Level Security (RLS) on outreach_tasks
-- ============================================================================

ALTER TABLE outreach_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY outreach_tasks_organization_policy ON outreach_tasks
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- SECTION 5: Create indexes for efficient queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_candidates_intelligence_score
    ON candidates(intelligence_score)
    WHERE intelligence_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_intelligence_level
    ON candidates(intelligence_level)
    WHERE intelligence_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_intelligence_urgency
    ON candidates(intelligence_urgency)
    WHERE intelligence_urgency IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_recommended_approach
    ON candidates(recommended_approach)
    WHERE recommended_approach IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_last_intelligence_update
    ON candidates(last_intelligence_update)
    WHERE last_intelligence_update IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_intelligence_composite
    ON candidates(intelligence_level, intelligence_urgency, recommended_approach)
    WHERE intelligence_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_organization_id
    ON outreach_tasks(organization_id);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_campaign_id
    ON outreach_tasks(campaign_id)
    WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_candidate_id
    ON outreach_tasks(candidate_id);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_status
    ON outreach_tasks(status);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_task_type
    ON outreach_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_stage
    ON outreach_tasks(stage);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_created_at
    ON outreach_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_queue
    ON outreach_tasks(organization_id, status, created_at)
    WHERE status IN ('pending', 'approved_ready');

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_campaign_status
    ON outreach_tasks(campaign_id, status)
    WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_matched_candidates
    ON campaigns USING GIN (matched_candidates);

-- ============================================================================
-- SECTION 6: Create updated_at trigger for outreach_tasks
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outreach_tasks_updated_at_trigger ON outreach_tasks;

CREATE TRIGGER outreach_tasks_updated_at_trigger
    BEFORE UPDATE ON outreach_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- End of Migration
-- ============================================================================
