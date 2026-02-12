-- ============================================================
-- Sync Studio Phase 1: Products table for Bol.com catalog mirror
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sync_studio_products (
  ean                 TEXT NOT NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT,
  description         TEXT,
  category_path       TEXT,
  attributes          JSONB DEFAULT '{}'::jsonb,
  price               DECIMAL,
  existing_image_urls TEXT[] DEFAULT '{}',
  bol_quality_score   DECIMAL,
  last_synced_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ean, user_id)
);

-- Enable RLS
ALTER TABLE public.sync_studio_products ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see/manage their own products
CREATE POLICY "sync_studio_products_select"
  ON public.sync_studio_products FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_products_insert"
  ON public.sync_studio_products FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "sync_studio_products_update"
  ON public.sync_studio_products FOR UPDATE TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_products_delete"
  ON public.sync_studio_products FOR DELETE TO authenticated
  USING (user_id = auth_uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_studio_products_user_id
  ON public.sync_studio_products(user_id);

CREATE INDEX IF NOT EXISTS idx_sync_studio_products_category
  ON public.sync_studio_products(category_path);

-- Sync progress tracking table (for resumable imports)
CREATE TABLE IF NOT EXISTS public.sync_studio_import_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'importing'
                      CHECK (status IN ('importing', 'planning', 'completed', 'failed')),
  total_products      INTEGER DEFAULT 0,
  imported_products   INTEGER DEFAULT 0,
  planned_products    INTEGER DEFAULT 0,
  total_shots_planned INTEGER DEFAULT 0,
  categories_found    INTEGER DEFAULT 0,
  brands_found        INTEGER DEFAULT 0,
  images_found        INTEGER DEFAULT 0,
  current_product     TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

ALTER TABLE public.sync_studio_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_studio_import_jobs_select"
  ON public.sync_studio_import_jobs FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "sync_studio_import_jobs_insert"
  ON public.sync_studio_import_jobs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

CREATE POLICY "sync_studio_import_jobs_update"
  ON public.sync_studio_import_jobs FOR UPDATE TO authenticated
  USING (user_id = auth_uid());
