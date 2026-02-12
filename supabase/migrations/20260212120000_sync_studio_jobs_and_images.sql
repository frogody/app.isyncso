-- ============================================================
-- Sync Studio Phase 3: Batch generation jobs and generated images
-- ============================================================

-- -----------------------------------------------------------
-- Table 1: sync_studio_jobs
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_studio_jobs (
  job_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  total_products   INTEGER NOT NULL DEFAULT 0,
  total_images     INTEGER NOT NULL DEFAULT 0,
  images_completed INTEGER NOT NULL DEFAULT 0,
  images_failed    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.sync_studio_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies (owner-only via auth_uid() wrapper)
CREATE POLICY "sync_studio_jobs_select"
  ON public.sync_studio_jobs FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_jobs_insert"
  ON public.sync_studio_jobs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "sync_studio_jobs_update"
  ON public.sync_studio_jobs FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_jobs_delete"
  ON public.sync_studio_jobs FOR DELETE TO authenticated
  USING (user_id = auth_uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_studio_jobs_user_id
  ON public.sync_studio_jobs (user_id);

CREATE INDEX IF NOT EXISTS idx_sync_studio_jobs_status
  ON public.sync_studio_jobs (status);

-- -----------------------------------------------------------
-- Table 2: sync_studio_generated_images
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_studio_generated_images (
  image_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES public.sync_studio_jobs(job_id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES public.sync_studio_shoot_plans(plan_id) ON DELETE CASCADE,
  product_ean   TEXT NOT NULL,
  shot_number   INTEGER NOT NULL,
  image_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','generating','completed','failed')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sync_studio_generated_images ENABLE ROW LEVEL SECURITY;

-- RLS policies (scoped through parent job ownership)
CREATE POLICY "sync_studio_generated_images_select"
  ON public.sync_studio_generated_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sync_studio_jobs j
      WHERE j.job_id = sync_studio_generated_images.job_id
        AND j.user_id = auth_uid()
    )
  );

CREATE POLICY "sync_studio_generated_images_insert"
  ON public.sync_studio_generated_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sync_studio_jobs j
      WHERE j.job_id = sync_studio_generated_images.job_id
        AND j.user_id = auth_uid()
    )
  );

CREATE POLICY "sync_studio_generated_images_update"
  ON public.sync_studio_generated_images FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sync_studio_jobs j
      WHERE j.job_id = sync_studio_generated_images.job_id
        AND j.user_id = auth_uid()
    )
  );

CREATE POLICY "sync_studio_generated_images_delete"
  ON public.sync_studio_generated_images FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sync_studio_jobs j
      WHERE j.job_id = sync_studio_generated_images.job_id
        AND j.user_id = auth_uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_studio_generated_images_job_id
  ON public.sync_studio_generated_images (job_id);

CREATE INDEX IF NOT EXISTS idx_sync_studio_generated_images_plan_id
  ON public.sync_studio_generated_images (plan_id);

CREATE INDEX IF NOT EXISTS idx_sync_studio_generated_images_product_ean
  ON public.sync_studio_generated_images (product_ean);

CREATE INDEX IF NOT EXISTS idx_sync_studio_generated_images_status
  ON public.sync_studio_generated_images (status);
