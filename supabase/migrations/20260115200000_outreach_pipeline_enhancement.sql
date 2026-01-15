-- Migration: Outreach Pipeline Enhancement
-- Created: 2026-01-15
-- Description: Enhances outreach system for multi-stage pipeline UI
--              - Adds subject, content, candidate_name to outreach_tasks
--              - Adds outreach tracking fields to candidates
--              - Updates status/stage constraints for pipeline stages

-- ============================================================================
-- SECTION 1: Enhance outreach_tasks table
-- ============================================================================

-- Add missing columns to outreach_tasks
ALTER TABLE public.outreach_tasks
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS candidate_name TEXT,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Update message_content to content alias (use content as primary)
COMMENT ON COLUMN public.outreach_tasks.content IS 'The outreach message content';
COMMENT ON COLUMN public.outreach_tasks.subject IS 'Email subject line (for email campaigns)';
COMMENT ON COLUMN public.outreach_tasks.candidate_name IS 'Cached candidate name for display';

-- Drop old constraints to recreate with new values
ALTER TABLE public.outreach_tasks
DROP CONSTRAINT IF EXISTS outreach_tasks_task_type_values;

ALTER TABLE public.outreach_tasks
DROP CONSTRAINT IF EXISTS outreach_tasks_status_values;

ALTER TABLE public.outreach_tasks
DROP CONSTRAINT IF EXISTS outreach_tasks_stage_values;

-- Recreate with expanded values
ALTER TABLE public.outreach_tasks
ADD CONSTRAINT outreach_tasks_task_type_values
CHECK (task_type IN ('email', 'linkedin', 'linkedin_connection', 'call', 'initial_outreach', 'follow_up_1', 'follow_up_2', 'check_reply'));

ALTER TABLE public.outreach_tasks
ADD CONSTRAINT outreach_tasks_status_values
CHECK (status IN ('draft', 'pending', 'approved_ready', 'sent', 'replied', 'completed', 'failed', 'cancelled'));

ALTER TABLE public.outreach_tasks
ADD CONSTRAINT outreach_tasks_stage_values
CHECK (stage IN ('initial', 'follow_up_1', 'follow_up_2', 'first_message', 'no_reply', 'connected', 'awaiting_reply', 'completed'));

-- Add unique constraint for preventing duplicate tasks per campaign/candidate/stage
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_tasks_unique_campaign_candidate_stage
ON public.outreach_tasks(campaign_id, candidate_id, stage)
WHERE campaign_id IS NOT NULL;

-- Index for scheduled tasks
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_scheduled
ON public.outreach_tasks(scheduled_at)
WHERE scheduled_at IS NOT NULL AND status = 'approved_ready';

-- ============================================================================
-- SECTION 2: Add outreach tracking fields to candidates
-- ============================================================================

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS outreach_stage TEXT DEFAULT 'initial',
ADD COLUMN IF NOT EXISTS outreach_messages JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;

COMMENT ON COLUMN public.candidates.outreach_status IS 'Current outreach status (pending, contacted, replied, etc.)';
COMMENT ON COLUMN public.candidates.outreach_stage IS 'Current stage in outreach pipeline (initial, follow_up_1, follow_up_2)';
COMMENT ON COLUMN public.candidates.outreach_messages IS 'Stored outreach messages by stage: {initial: {subject, content}, follow_up_1: {...}}';
COMMENT ON COLUMN public.candidates.last_outreach_at IS 'Timestamp of last outreach activity';

-- Constraint for outreach_stage values
ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_outreach_stage_values;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_outreach_stage_values
CHECK (outreach_stage IN ('initial', 'follow_up_1', 'follow_up_2', 'completed'));

-- Index for outreach stage filtering
CREATE INDEX IF NOT EXISTS idx_candidates_outreach_stage
ON public.candidates(outreach_stage)
WHERE outreach_stage IS NOT NULL;

-- ============================================================================
-- SECTION 3: Add helper function for stage progression
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_outreach_stage(current_stage TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE current_stage
        WHEN 'initial' THEN 'follow_up_1'
        WHEN 'follow_up_1' THEN 'follow_up_2'
        WHEN 'follow_up_2' THEN 'completed'
        ELSE 'completed'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_next_outreach_stage IS 'Returns the next outreach stage in the pipeline sequence';

-- ============================================================================
-- SECTION 4: Update trigger for outreach task status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_candidate_outreach_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When a task is marked as sent, update candidate's last_outreach_at
    IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
        UPDATE public.candidates
        SET
            last_outreach_at = NOW(),
            outreach_status = 'contacted',
            outreach_stage = NEW.stage
        WHERE id = NEW.candidate_id;
    END IF;

    -- When a task is marked as replied, update candidate status
    IF NEW.status = 'replied' AND (OLD.status IS NULL OR OLD.status != 'replied') THEN
        UPDATE public.candidates
        SET outreach_status = 'replied'
        WHERE id = NEW.candidate_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS outreach_tasks_update_candidate_trigger ON public.outreach_tasks;

CREATE TRIGGER outreach_tasks_update_candidate_trigger
    AFTER UPDATE ON public.outreach_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_outreach_on_task_change();

-- ============================================================================
-- End of Migration
-- ============================================================================
