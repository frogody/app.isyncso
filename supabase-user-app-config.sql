-- ============================================
-- User App Config Table Fix
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop and recreate table with correct schema
-- ============================================
DROP TABLE IF EXISTS public.user_app_configs CASCADE;

CREATE TABLE public.user_app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  enabled_apps TEXT[] DEFAULT ARRAY['learn', 'growth', 'sentinel'],
  app_order TEXT[] DEFAULT ARRAY['learn', 'growth', 'sentinel'],
  dashboard_widgets TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id
CREATE UNIQUE INDEX user_app_configs_user_id_idx ON public.user_app_configs(user_id);

-- 2. Enable RLS
-- ============================================
ALTER TABLE public.user_app_configs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies - allow all operations for authenticated users on their own data
-- ============================================
CREATE POLICY "Users can view own config"
ON public.user_app_configs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
ON public.user_app_configs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
ON public.user_app_configs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own config"
ON public.user_app_configs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Grant permissions
-- ============================================
GRANT ALL ON public.user_app_configs TO authenticated;

-- 5. Create updated_at trigger
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
-- Also fix departments table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID,
  head_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view departments" ON public.departments;
CREATE POLICY "Users can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

GRANT ALL ON public.departments TO authenticated;

-- ============================================
-- Done!
-- ============================================
SELECT 'Tables created successfully!' as status;
