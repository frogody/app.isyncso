-- ============================================================================
-- Track & Trace Map Feature — Database Migration
-- Creates shipment_checkpoints table, alters tracking_jobs, creates geocode_cache
-- ============================================================================

-- ─── 1. New table: shipment_checkpoints ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipment_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_job_id UUID NOT NULL REFERENCES public.tracking_jobs(id) ON DELETE CASCADE,

  -- Status (AfterShip normalized tags)
  status_tag VARCHAR(50) NOT NULL,
  status_subtag VARCHAR(50),
  status_description TEXT,
  message TEXT,

  -- Location (geocoded)
  location_name TEXT,
  city VARCHAR(150),
  state VARCHAR(100),
  country_iso3 CHAR(3),
  zip VARCHAR(20),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Timing
  checkpoint_time TIMESTAMPTZ NOT NULL,

  -- Source
  source VARCHAR(20) NOT NULL DEFAULT 'aftership',
  raw_event JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Deduplicate
  UNIQUE(tracking_job_id, checkpoint_time, status_tag)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_job
  ON public.shipment_checkpoints(tracking_job_id, checkpoint_time);

-- RLS
ALTER TABLE public.shipment_checkpoints ENABLE ROW LEVEL SECURITY;

-- Back-office: company-scoped via tracking_jobs
CREATE POLICY "checkpoints_company_select" ON public.shipment_checkpoints
  FOR SELECT TO authenticated
  USING (tracking_job_id IN (
    SELECT id FROM public.tracking_jobs WHERE company_id = auth_company_id()
  ));

CREATE POLICY "checkpoints_company_insert" ON public.shipment_checkpoints
  FOR INSERT TO authenticated
  WITH CHECK (tracking_job_id IN (
    SELECT id FROM public.tracking_jobs WHERE company_id = auth_company_id()
  ));

-- Portal clients: read-only access to their own orders' checkpoints
CREATE POLICY "checkpoints_portal_client" ON public.shipment_checkpoints
  FOR SELECT TO authenticated
  USING (tracking_job_id IN (
    SELECT tj.id FROM public.tracking_jobs tj
    JOIN public.shipping_tasks st ON st.id = tj.shipping_task_id
    JOIN public.b2b_orders bo ON bo.id = st.b2b_order_id
    JOIN public.portal_clients pc ON pc.id = bo.client_id
    WHERE pc.auth_user_id = auth_uid()
  ));

-- Service role bypass (edge functions)
-- Not needed: service_role bypasses RLS

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_checkpoints;


-- ─── 2. Alter tracking_jobs — add AfterShip columns ────────────────────────

ALTER TABLE public.tracking_jobs
  ADD COLUMN IF NOT EXISTS aftership_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS aftership_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS aftership_tag VARCHAR(50),
  ADD COLUMN IF NOT EXISTS aftership_subtag VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expected_delivery TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin_city VARCHAR(150),
  ADD COLUMN IF NOT EXISTS origin_country_iso3 CHAR(3),
  ADD COLUMN IF NOT EXISTS destination_city VARCHAR(150),
  ADD COLUMN IF NOT EXISTS destination_country_iso3 CHAR(3),
  ADD COLUMN IF NOT EXISTS tracking_source VARCHAR(20) DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_tracking_jobs_aftership
  ON public.tracking_jobs(aftership_id)
  WHERE aftership_id IS NOT NULL;


-- ─── 3. Geocoding cache ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key TEXT UNIQUE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
