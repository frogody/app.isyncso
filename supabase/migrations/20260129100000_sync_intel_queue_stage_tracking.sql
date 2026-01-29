-- Add current_stage column to sync_intel_queue for tracking enrichment pipeline progress
-- Stages: pending → linkedin → company → candidate → completed (or failed)

ALTER TABLE public.sync_intel_queue
  ADD COLUMN IF NOT EXISTS current_stage VARCHAR(20) DEFAULT 'pending';

COMMENT ON COLUMN public.sync_intel_queue.current_stage IS
  'Current processing stage: pending, linkedin, company, candidate, completed, failed';

-- Index for querying items by stage (useful for progress monitoring)
CREATE INDEX IF NOT EXISTS idx_sync_intel_queue_stage
  ON public.sync_intel_queue(current_stage)
  WHERE status = 'processing';
