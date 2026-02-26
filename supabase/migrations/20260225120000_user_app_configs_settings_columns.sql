-- Add missing settings columns to user_app_configs
-- These are used by Settings.jsx but were missing from the schema

ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS sound_effects BOOLEAN DEFAULT false;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS achievement_toasts BOOLEAN DEFAULT true;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT false;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'daily';
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notify_courses BOOLEAN DEFAULT true;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notify_streaks BOOLEAN DEFAULT true;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notify_badges BOOLEAN DEFAULT true;
ALTER TABLE public.user_app_configs ADD COLUMN IF NOT EXISTS notify_compliance BOOLEAN DEFAULT true;
