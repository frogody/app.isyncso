-- Add version history column for the AI Store Builder
-- Persists labeled config snapshots so users can restore previous versions across page reloads.
ALTER TABLE public.portal_settings
ADD COLUMN IF NOT EXISTS store_builder_version_history JSONB DEFAULT '[]'::jsonb;
