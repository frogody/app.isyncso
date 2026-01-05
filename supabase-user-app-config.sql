-- ============================================
-- User App Config Table Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create user_app_configs table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled_apps TEXT[] DEFAULT ARRAY['learn', 'growth', 'sentinel'],
  app_order TEXT[] DEFAULT ARRAY['learn', 'growth', 'sentinel'],
  dashboard_widgets TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Enable RLS
-- ============================================
ALTER TABLE public.user_app_configs ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
-- ============================================
DROP POLICY IF EXISTS "Users can view own config" ON public.user_app_configs;
DROP POLICY IF EXISTS "Users can insert own config" ON public.user_app_configs;
DROP POLICY IF EXISTS "Users can update own config" ON public.user_app_configs;
DROP POLICY IF EXISTS "Users can delete own config" ON public.user_app_configs;

-- 4. Create RLS policies
-- ============================================

-- Users can view their own config
CREATE POLICY "Users can view own config"
ON public.user_app_configs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own config
CREATE POLICY "Users can insert own config"
ON public.user_app_configs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own config
CREATE POLICY "Users can update own config"
ON public.user_app_configs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own config
CREATE POLICY "Users can delete own config"
ON public.user_app_configs
FOR DELETE
USING (auth.uid() = user_id);

-- 5. Grant permissions
-- ============================================
GRANT ALL ON public.user_app_configs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 6. Create updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_app_configs_updated_at ON public.user_app_configs;

CREATE TRIGGER update_user_app_configs_updated_at
  BEFORE UPDATE ON public.user_app_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Done! User app configs table is ready.
-- ============================================
