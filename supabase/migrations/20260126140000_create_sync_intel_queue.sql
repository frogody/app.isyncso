-- Create sync_intel_queue table for background processing of SYNC Intel
-- Candidates from nest purchases are automatically queued for FREE processing

CREATE TABLE IF NOT EXISTS public.sync_intel_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual', -- 'nest_purchase', 'manual', 'bulk_import'
  priority INTEGER NOT NULL DEFAULT 2, -- 1=high, 2=normal, 3=low
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_sync_intel_queue_status ON public.sync_intel_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_intel_queue_priority ON public.sync_intel_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_intel_queue_candidate ON public.sync_intel_queue(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sync_intel_queue_organization ON public.sync_intel_queue(organization_id);

-- Composite index for queue processor query
CREATE INDEX IF NOT EXISTS idx_sync_intel_queue_pending ON public.sync_intel_queue(status, priority, created_at)
  WHERE status = 'pending';

-- RLS policies
ALTER TABLE public.sync_intel_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their organization's queue items
CREATE POLICY "Users can view own organization queue items"
  ON public.sync_intel_queue
  FOR SELECT
  TO authenticated
  USING (organization_id = auth_company_id() OR organization_id IS NULL);

-- Allow authenticated users to insert queue items for their organization
CREATE POLICY "Users can insert queue items for own organization"
  ON public.sync_intel_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = auth_company_id() OR organization_id IS NULL);

-- Service role can do everything (for the edge function)
-- Note: service_role bypasses RLS, so no explicit policy needed

-- Grant permissions
GRANT ALL ON public.sync_intel_queue TO authenticated;
GRANT ALL ON public.sync_intel_queue TO service_role;
