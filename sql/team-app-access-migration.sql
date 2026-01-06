-- Team App Access Migration
-- This migration adds team-based app access control

-- ================================================
-- STEP 1: Add company_id to teams table
-- ================================================
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON public.teams(company_id);

-- ================================================
-- STEP 2: Create team_app_access table
-- ================================================
CREATE TABLE IF NOT EXISTS public.team_app_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, app_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_app_access_team_id ON public.team_app_access(team_id);

-- Add comment
COMMENT ON TABLE public.team_app_access IS 'Controls which apps are accessible per team';

-- ================================================
-- STEP 3: Ensure team_members table has proper structure
-- ================================================
-- Add role column if it doesn't exist
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- ================================================
-- STEP 4: RLS Policies for teams table
-- ================================================
-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view teams in their company" ON public.teams;
DROP POLICY IF EXISTS "Admins can manage teams in their company" ON public.teams;

-- Users can view teams in their company
CREATE POLICY "Users can view teams in their company" ON public.teams
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Admins can insert/update/delete teams in their company
CREATE POLICY "Admins can manage teams in their company" ON public.teams
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      -- Check if user is admin or super_admin
      EXISTS (
        SELECT 1 FROM public.rbac_user_roles ur
        JOIN public.rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.hierarchy_level >= 80
      )
    )
  );

-- ================================================
-- STEP 5: RLS Policies for team_members table
-- ================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members in their company" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;

-- Users can view team members in teams they belong to or teams in their company (for admins)
CREATE POLICY "Users can view team members in their company" ON public.team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON t.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- Admins can manage team members
CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON t.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.rbac_user_roles ur
        JOIN public.rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.hierarchy_level >= 80
      )
    )
  );

-- ================================================
-- STEP 6: RLS Policies for team_app_access table
-- ================================================
ALTER TABLE public.team_app_access ENABLE ROW LEVEL SECURITY;

-- Users can view app access for teams in their company
CREATE POLICY "Users can view team app access in their company" ON public.team_app_access
  FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON t.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- Admins can manage app access
CREATE POLICY "Admins can manage team app access" ON public.team_app_access
  FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON t.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.rbac_user_roles ur
        JOIN public.rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.hierarchy_level >= 80
      )
    )
  );

-- ================================================
-- STEP 7: Helper function to get user's effective apps
-- ================================================
CREATE OR REPLACE FUNCTION public.get_user_effective_apps(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hierarchy_level INT;
  v_apps TEXT[];
BEGIN
  -- Check if user is admin (hierarchy >= 80) - they get all apps
  SELECT MAX(r.hierarchy_level) INTO v_hierarchy_level
  FROM public.rbac_user_roles ur
  JOIN public.rbac_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;

  IF v_hierarchy_level >= 80 THEN
    -- Admins get all apps
    RETURN ARRAY['learn', 'growth', 'sentinel', 'finance', 'inbox', 'projects', 'analytics'];
  END IF;

  -- Get union of all enabled apps from user's teams
  SELECT ARRAY_AGG(DISTINCT taa.app_name) INTO v_apps
  FROM public.team_members tm
  JOIN public.team_app_access taa ON tm.team_id = taa.team_id
  WHERE tm.user_id = p_user_id
  AND taa.is_enabled = true;

  -- If user has no team assignments, return empty array (minimal access)
  IF v_apps IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN v_apps;
END;
$$;

-- ================================================
-- STEP 8: Helper function to check if user has app access
-- ================================================
CREATE OR REPLACE FUNCTION public.user_has_app_access(p_user_id UUID, p_app_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hierarchy_level INT;
  v_has_access BOOLEAN;
BEGIN
  -- Check if user is admin (hierarchy >= 80) - they have all access
  SELECT MAX(r.hierarchy_level) INTO v_hierarchy_level
  FROM public.rbac_user_roles ur
  JOIN public.rbac_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;

  IF v_hierarchy_level >= 80 THEN
    RETURN true;
  END IF;

  -- Check if any of user's teams have this app enabled
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_app_access taa ON tm.team_id = taa.team_id
    WHERE tm.user_id = p_user_id
    AND taa.app_name = p_app_name
    AND taa.is_enabled = true
  ) INTO v_has_access;

  RETURN COALESCE(v_has_access, false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_effective_apps(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_app_access(UUID, TEXT) TO authenticated;

-- ================================================
-- STEP 9: Available apps reference
-- ================================================
COMMENT ON FUNCTION public.get_user_effective_apps IS 'Returns array of app names user can access based on team memberships. Apps: learn, growth, sentinel, finance, inbox, projects, analytics';
