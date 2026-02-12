-- ============================================================
-- Sync Studio Phase 2: Shoot plans for AI-generated product photography
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sync_studio_shoot_plans (
  plan_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_ean         TEXT NOT NULL,
  product_title       TEXT,
  plan_status         TEXT NOT NULL DEFAULT 'pending_approval'
                      CHECK (plan_status IN ('pending_approval','approved','generating','completed')),
  total_shots         INTEGER DEFAULT 0,
  reasoning           TEXT,
  shots               JSONB DEFAULT '[]'::jsonb,
  user_modified       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  approved_at         TIMESTAMPTZ,
  FOREIGN KEY (product_ean, user_id) REFERENCES public.sync_studio_products(ean, user_id) ON DELETE CASCADE,
  UNIQUE (product_ean, user_id)
);

-- Enable RLS
ALTER TABLE public.sync_studio_shoot_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see/manage their own shoot plans
CREATE POLICY "sync_studio_shoot_plans_select"
  ON public.sync_studio_shoot_plans FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_shoot_plans_insert"
  ON public.sync_studio_shoot_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "sync_studio_shoot_plans_update"
  ON public.sync_studio_shoot_plans FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_shoot_plans_delete"
  ON public.sync_studio_shoot_plans FOR DELETE TO authenticated
  USING (user_id = auth_uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_studio_shoot_plans_user_id
  ON public.sync_studio_shoot_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_sync_studio_shoot_plans_product_ean
  ON public.sync_studio_shoot_plans(product_ean);

CREATE INDEX IF NOT EXISTS idx_sync_studio_shoot_plans_plan_status
  ON public.sync_studio_shoot_plans(plan_status);
