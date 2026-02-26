-- Fix store_announcements table: add missing columns referenced by b2b-portal-api
-- The API queries for store_id, active, starts_at, priority but the original migration
-- only created organization_id, is_pinned, expires_at, type columns.

-- Add store_id (references the b2b_store_configs table)
ALTER TABLE public.store_announcements
  ADD COLUMN IF NOT EXISTS store_id UUID;

-- Add active flag (defaults to true)
ALTER TABLE public.store_announcements
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add starts_at for scheduled announcements
ALTER TABLE public.store_announcements
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

-- Rename expires_at to ends_at to match API usage (keep expires_at as alias)
-- Actually, keep expires_at AND add ends_at as the API uses ends_at
ALTER TABLE public.store_announcements
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Add priority for ordering (higher = shown first)
ALTER TABLE public.store_announcements
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Copy expires_at values to ends_at if any exist
UPDATE public.store_announcements SET ends_at = expires_at WHERE ends_at IS NULL AND expires_at IS NOT NULL;

-- Index for API query pattern
CREATE INDEX IF NOT EXISTS idx_announcements_store_active
  ON public.store_announcements(store_id, active)
  WHERE active = true;
