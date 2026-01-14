-- Migration: Talent Module RBAC Permissions
-- Created: 2026-01-14
-- Description: Adds RBAC permissions for the Talent recruitment module
--              Enables talent.view, talent.edit, talent.admin permissions

-- ============================================================================
-- SECTION 1: Add Talent Permissions
-- ============================================================================

-- Talent permissions for recruitment module
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('talent.view', 'talent', 'view', 'View talent module, candidates, campaigns, and analytics'),
  ('talent.create', 'talent', 'create', 'Create candidates, campaigns, projects, and roles'),
  ('talent.edit', 'talent', 'edit', 'Edit candidates, campaigns, projects, and roles'),
  ('talent.delete', 'talent', 'delete', 'Delete candidates, campaigns, projects, and roles'),
  ('talent.manage', 'talent', 'manage', 'Full talent module management including settings'),
  ('talent.admin', 'talent', 'admin', 'Admin access to talent module with all capabilities'),
  ('talent.intelligence', 'talent', 'intelligence', 'Generate and view Flight Risk Intelligence reports'),
  ('talent.outreach', 'talent', 'outreach', 'Create and send outreach messages to candidates')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SECTION 2: Assign Talent Permissions to Roles
-- ============================================================================

-- Helper function to get role ID by name
DO $$
DECLARE
  v_super_admin_role_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_user_role_id UUID;
  v_talent_view_id UUID;
  v_talent_create_id UUID;
  v_talent_edit_id UUID;
  v_talent_delete_id UUID;
  v_talent_manage_id UUID;
  v_talent_admin_id UUID;
  v_talent_intelligence_id UUID;
  v_talent_outreach_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO v_super_admin_role_id FROM public.rbac_roles WHERE name = 'super_admin';
  SELECT id INTO v_admin_role_id FROM public.rbac_roles WHERE name = 'admin';
  SELECT id INTO v_manager_role_id FROM public.rbac_roles WHERE name = 'manager';
  SELECT id INTO v_user_role_id FROM public.rbac_roles WHERE name = 'user';

  -- Get permission IDs
  SELECT id INTO v_talent_view_id FROM public.rbac_permissions WHERE name = 'talent.view';
  SELECT id INTO v_talent_create_id FROM public.rbac_permissions WHERE name = 'talent.create';
  SELECT id INTO v_talent_edit_id FROM public.rbac_permissions WHERE name = 'talent.edit';
  SELECT id INTO v_talent_delete_id FROM public.rbac_permissions WHERE name = 'talent.delete';
  SELECT id INTO v_talent_manage_id FROM public.rbac_permissions WHERE name = 'talent.manage';
  SELECT id INTO v_talent_admin_id FROM public.rbac_permissions WHERE name = 'talent.admin';
  SELECT id INTO v_talent_intelligence_id FROM public.rbac_permissions WHERE name = 'talent.intelligence';
  SELECT id INTO v_talent_outreach_id FROM public.rbac_permissions WHERE name = 'talent.outreach';

  -- Super Admin gets all talent permissions
  IF v_super_admin_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_role_permissions (role_id, permission_id)
    VALUES
      (v_super_admin_role_id, v_talent_view_id),
      (v_super_admin_role_id, v_talent_create_id),
      (v_super_admin_role_id, v_talent_edit_id),
      (v_super_admin_role_id, v_talent_delete_id),
      (v_super_admin_role_id, v_talent_manage_id),
      (v_super_admin_role_id, v_talent_admin_id),
      (v_super_admin_role_id, v_talent_intelligence_id),
      (v_super_admin_role_id, v_talent_outreach_id)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Assigned all talent permissions to super_admin role';
  END IF;

  -- Admin gets all talent permissions except admin
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_role_permissions (role_id, permission_id)
    VALUES
      (v_admin_role_id, v_talent_view_id),
      (v_admin_role_id, v_talent_create_id),
      (v_admin_role_id, v_talent_edit_id),
      (v_admin_role_id, v_talent_delete_id),
      (v_admin_role_id, v_talent_manage_id),
      (v_admin_role_id, v_talent_intelligence_id),
      (v_admin_role_id, v_talent_outreach_id)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Assigned talent permissions to admin role';
  END IF;

  -- Manager gets view, create, edit, intelligence, and outreach
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_role_permissions (role_id, permission_id)
    VALUES
      (v_manager_role_id, v_talent_view_id),
      (v_manager_role_id, v_talent_create_id),
      (v_manager_role_id, v_talent_edit_id),
      (v_manager_role_id, v_talent_intelligence_id),
      (v_manager_role_id, v_talent_outreach_id)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Assigned talent permissions to manager role';
  END IF;

  -- User gets view and intelligence (read-only with intelligence viewing)
  IF v_user_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_role_permissions (role_id, permission_id)
    VALUES
      (v_user_role_id, v_talent_view_id),
      (v_user_role_id, v_talent_intelligence_id)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Assigned talent view permission to user role';
  END IF;

END $$;

-- ============================================================================
-- SECTION 3: Add indexes for talent permission queries
-- ============================================================================

-- Index for faster permission lookups on talent resource
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_talent
  ON public.rbac_permissions(resource)
  WHERE resource = 'talent';

-- ============================================================================
-- End of Migration
-- ============================================================================
