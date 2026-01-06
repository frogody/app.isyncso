-- ============================================
-- RBAC System - Complete Implementation
-- Role-Based Access Control for iSyncSO
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. RBAC TABLES
-- ============================================

-- Roles table - defines all available roles
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  hierarchy_level INTEGER NOT NULL DEFAULT 0, -- Higher = more power
  is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table - defines all granular permissions
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'courses.view', 'users.edit'
  resource TEXT NOT NULL, -- e.g., 'courses', 'users', 'finance'
  action TEXT NOT NULL, -- e.g., 'view', 'create', 'edit', 'delete', 'manage'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User-Role assignments with scope
CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  scope_type TEXT DEFAULT 'global', -- 'global', 'company', 'department', 'team'
  scope_id UUID, -- ID of company/department/team (null for global)
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id, scope_type, scope_id)
);

-- ============================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user_id ON public.rbac_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_role_id ON public.rbac_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_scope ON public.rbac_user_roles(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_role_id ON public.rbac_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_resource ON public.rbac_permissions(resource);

-- ============================================
-- 3. RLS POLICIES FOR RBAC TABLES
-- ============================================

ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_user_roles ENABLE ROW LEVEL SECURITY;

-- Roles: Everyone can read, only admins can modify
DROP POLICY IF EXISTS "rbac_roles_select" ON public.rbac_roles;
CREATE POLICY "rbac_roles_select" ON public.rbac_roles
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rbac_roles_insert" ON public.rbac_roles;
CREATE POLICY "rbac_roles_insert" ON public.rbac_roles
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 80
  )
);

DROP POLICY IF EXISTS "rbac_roles_update" ON public.rbac_roles;
CREATE POLICY "rbac_roles_update" ON public.rbac_roles
FOR UPDATE TO authenticated USING (
  NOT is_system_role AND EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 80
  )
);

DROP POLICY IF EXISTS "rbac_roles_delete" ON public.rbac_roles;
CREATE POLICY "rbac_roles_delete" ON public.rbac_roles
FOR DELETE TO authenticated USING (
  NOT is_system_role AND EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 100
  )
);

-- Permissions: Everyone can read, only super admins can modify
DROP POLICY IF EXISTS "rbac_permissions_select" ON public.rbac_permissions;
CREATE POLICY "rbac_permissions_select" ON public.rbac_permissions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rbac_permissions_all" ON public.rbac_permissions;
CREATE POLICY "rbac_permissions_all" ON public.rbac_permissions
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 100
  )
);

-- Role-Permissions: Everyone can read, admins can modify
DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_select" ON public.rbac_role_permissions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rbac_role_permissions_all" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_all" ON public.rbac_role_permissions
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 80
  )
);

-- User-Roles: Users can see their own, admins can see/modify all
DROP POLICY IF EXISTS "rbac_user_roles_select" ON public.rbac_user_roles;
CREATE POLICY "rbac_user_roles_select" ON public.rbac_user_roles
FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 60
  )
);

DROP POLICY IF EXISTS "rbac_user_roles_insert" ON public.rbac_user_roles;
CREATE POLICY "rbac_user_roles_insert" ON public.rbac_user_roles
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 60
  )
);

DROP POLICY IF EXISTS "rbac_user_roles_delete" ON public.rbac_user_roles;
CREATE POLICY "rbac_user_roles_delete" ON public.rbac_user_roles
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.hierarchy_level >= 60
  )
);

GRANT ALL ON public.rbac_roles TO authenticated;
GRANT ALL ON public.rbac_permissions TO authenticated;
GRANT ALL ON public.rbac_role_permissions TO authenticated;
GRANT ALL ON public.rbac_user_roles TO authenticated;

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.rbac_user_roles ur
    JOIN public.rbac_role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.rbac_permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id AND p.name = p_permission_name
  );
END;
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID,
  p_role_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.rbac_user_roles ur
    JOIN public.rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.name = p_role_name
  );
END;
$$;

-- Get user's highest hierarchy level
CREATE OR REPLACE FUNCTION public.get_user_hierarchy_level(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_level INTEGER;
BEGIN
  SELECT COALESCE(MAX(r.hierarchy_level), 0) INTO max_level
  FROM public.rbac_user_roles ur
  JOIN public.rbac_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;

  RETURN max_level;
END;
$$;

-- Get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name, p.resource, p.action
  FROM public.rbac_user_roles ur
  JOIN public.rbac_role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.rbac_permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id;
END;
$$;

-- Get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE(
  role_name TEXT,
  hierarchy_level INTEGER,
  scope_type TEXT,
  scope_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.hierarchy_level, ur.scope_type, ur.scope_id
  FROM public.rbac_user_roles ur
  JOIN public.rbac_roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;
END;
$$;

-- Check if user is admin (hierarchy >= 80)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_user_hierarchy_level(p_user_id) >= 80;
END;
$$;

-- Check if user is super admin (hierarchy >= 100)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_user_hierarchy_level(p_user_id) >= 100;
END;
$$;

-- Check if user is manager or above (hierarchy >= 60)
CREATE OR REPLACE FUNCTION public.is_manager(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_user_hierarchy_level(p_user_id) >= 60;
END;
$$;

-- Assign default role to new user
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Get the 'user' role ID
  SELECT id INTO default_role_id FROM public.rbac_roles WHERE name = 'user';

  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_roles (user_id, role_id, scope_type)
    VALUES (NEW.id, default_role_id, 'global')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 5. DEFAULT ROLES
-- ============================================

INSERT INTO public.rbac_roles (name, description, hierarchy_level, is_system_role)
VALUES
  ('super_admin', 'Full system access - can manage everything', 100, true),
  ('admin', 'Company administrator - can manage company resources', 80, true),
  ('manager', 'Team/Department manager - can manage assigned teams', 60, true),
  ('user', 'Standard user - can access assigned features', 40, true),
  ('learner', 'Learning-only user - can access courses and training', 30, true),
  ('viewer', 'Read-only access - can view but not modify', 20, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. DEFAULT PERMISSIONS
-- ============================================

-- Users permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('users.view', 'users', 'view', 'View user profiles'),
  ('users.create', 'users', 'create', 'Create new users'),
  ('users.edit', 'users', 'edit', 'Edit user profiles'),
  ('users.delete', 'users', 'delete', 'Delete users'),
  ('users.manage', 'users', 'manage', 'Full user management')
ON CONFLICT (name) DO NOTHING;

-- Teams permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('teams.view', 'teams', 'view', 'View teams'),
  ('teams.create', 'teams', 'create', 'Create new teams'),
  ('teams.edit', 'teams', 'edit', 'Edit teams'),
  ('teams.delete', 'teams', 'delete', 'Delete teams'),
  ('teams.manage', 'teams', 'manage', 'Full team management')
ON CONFLICT (name) DO NOTHING;

-- Departments permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('departments.view', 'departments', 'view', 'View departments'),
  ('departments.create', 'departments', 'create', 'Create new departments'),
  ('departments.edit', 'departments', 'edit', 'Edit departments'),
  ('departments.delete', 'departments', 'delete', 'Delete departments'),
  ('departments.manage', 'departments', 'manage', 'Full department management')
ON CONFLICT (name) DO NOTHING;

-- Companies permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('companies.view', 'companies', 'view', 'View company info'),
  ('companies.edit', 'companies', 'edit', 'Edit company info'),
  ('companies.manage', 'companies', 'manage', 'Full company management')
ON CONFLICT (name) DO NOTHING;

-- Courses permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('courses.view', 'courses', 'view', 'View courses'),
  ('courses.create', 'courses', 'create', 'Create new courses'),
  ('courses.edit', 'courses', 'edit', 'Edit courses'),
  ('courses.delete', 'courses', 'delete', 'Delete courses'),
  ('courses.manage', 'courses', 'manage', 'Full course management'),
  ('courses.enroll', 'courses', 'enroll', 'Enroll in courses')
ON CONFLICT (name) DO NOTHING;

-- Workflows permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('workflows.view', 'workflows', 'view', 'View workflows'),
  ('workflows.create', 'workflows', 'create', 'Create new workflows'),
  ('workflows.edit', 'workflows', 'edit', 'Edit workflows'),
  ('workflows.delete', 'workflows', 'delete', 'Delete workflows'),
  ('workflows.manage', 'workflows', 'manage', 'Full workflow management'),
  ('workflows.execute', 'workflows', 'execute', 'Execute workflows')
ON CONFLICT (name) DO NOTHING;

-- Projects permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('projects.view', 'projects', 'view', 'View projects'),
  ('projects.create', 'projects', 'create', 'Create new projects'),
  ('projects.edit', 'projects', 'edit', 'Edit projects'),
  ('projects.delete', 'projects', 'delete', 'Delete projects'),
  ('projects.manage', 'projects', 'manage', 'Full project management')
ON CONFLICT (name) DO NOTHING;

-- Finance permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('finance.view', 'finance', 'view', 'View financial data'),
  ('finance.create', 'finance', 'create', 'Create invoices/expenses'),
  ('finance.edit', 'finance', 'edit', 'Edit financial records'),
  ('finance.delete', 'finance', 'delete', 'Delete financial records'),
  ('finance.manage', 'finance', 'manage', 'Full finance management'),
  ('finance.export', 'finance', 'export', 'Export financial reports')
ON CONFLICT (name) DO NOTHING;

-- Inbox permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('inbox.view', 'inbox', 'view', 'View messages'),
  ('inbox.send', 'inbox', 'send', 'Send messages'),
  ('inbox.manage', 'inbox', 'manage', 'Manage channels and messages')
ON CONFLICT (name) DO NOTHING;

-- Analytics permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('analytics.view', 'analytics', 'view', 'View analytics dashboards'),
  ('analytics.export', 'analytics', 'export', 'Export analytics data'),
  ('analytics.manage', 'analytics', 'manage', 'Configure analytics')
ON CONFLICT (name) DO NOTHING;

-- Settings permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('settings.view', 'settings', 'view', 'View settings'),
  ('settings.edit', 'settings', 'edit', 'Edit settings'),
  ('settings.manage', 'settings', 'manage', 'Full settings management')
ON CONFLICT (name) DO NOTHING;

-- Integrations permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('integrations.view', 'integrations', 'view', 'View integrations'),
  ('integrations.create', 'integrations', 'create', 'Create integrations'),
  ('integrations.edit', 'integrations', 'edit', 'Edit integrations'),
  ('integrations.delete', 'integrations', 'delete', 'Delete integrations'),
  ('integrations.manage', 'integrations', 'manage', 'Full integration management')
ON CONFLICT (name) DO NOTHING;

-- Admin permissions
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
  ('admin.access', 'admin', 'access', 'Access admin panel'),
  ('admin.users', 'admin', 'users', 'Manage users from admin'),
  ('admin.roles', 'admin', 'roles', 'Manage roles and permissions'),
  ('admin.system', 'admin', 'system', 'System administration')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- Helper function to assign permission to role
CREATE OR REPLACE FUNCTION assign_permission_to_role(p_role_name TEXT, p_permission_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_role_id UUID;
  v_permission_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM public.rbac_roles WHERE name = p_role_name;
  SELECT id INTO v_permission_id FROM public.rbac_permissions WHERE name = p_permission_name;

  IF v_role_id IS NOT NULL AND v_permission_id IS NOT NULL THEN
    INSERT INTO public.rbac_role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Super Admin gets ALL permissions
DO $$
DECLARE
  perm RECORD;
BEGIN
  FOR perm IN SELECT name FROM public.rbac_permissions LOOP
    PERFORM assign_permission_to_role('super_admin', perm.name);
  END LOOP;
END $$;

-- Admin permissions (everything except admin.system)
SELECT assign_permission_to_role('admin', 'users.view');
SELECT assign_permission_to_role('admin', 'users.create');
SELECT assign_permission_to_role('admin', 'users.edit');
SELECT assign_permission_to_role('admin', 'users.delete');
SELECT assign_permission_to_role('admin', 'users.manage');
SELECT assign_permission_to_role('admin', 'teams.view');
SELECT assign_permission_to_role('admin', 'teams.create');
SELECT assign_permission_to_role('admin', 'teams.edit');
SELECT assign_permission_to_role('admin', 'teams.delete');
SELECT assign_permission_to_role('admin', 'teams.manage');
SELECT assign_permission_to_role('admin', 'departments.view');
SELECT assign_permission_to_role('admin', 'departments.create');
SELECT assign_permission_to_role('admin', 'departments.edit');
SELECT assign_permission_to_role('admin', 'departments.delete');
SELECT assign_permission_to_role('admin', 'departments.manage');
SELECT assign_permission_to_role('admin', 'companies.view');
SELECT assign_permission_to_role('admin', 'companies.edit');
SELECT assign_permission_to_role('admin', 'companies.manage');
SELECT assign_permission_to_role('admin', 'courses.view');
SELECT assign_permission_to_role('admin', 'courses.create');
SELECT assign_permission_to_role('admin', 'courses.edit');
SELECT assign_permission_to_role('admin', 'courses.delete');
SELECT assign_permission_to_role('admin', 'courses.manage');
SELECT assign_permission_to_role('admin', 'courses.enroll');
SELECT assign_permission_to_role('admin', 'workflows.view');
SELECT assign_permission_to_role('admin', 'workflows.create');
SELECT assign_permission_to_role('admin', 'workflows.edit');
SELECT assign_permission_to_role('admin', 'workflows.delete');
SELECT assign_permission_to_role('admin', 'workflows.manage');
SELECT assign_permission_to_role('admin', 'workflows.execute');
SELECT assign_permission_to_role('admin', 'projects.view');
SELECT assign_permission_to_role('admin', 'projects.create');
SELECT assign_permission_to_role('admin', 'projects.edit');
SELECT assign_permission_to_role('admin', 'projects.delete');
SELECT assign_permission_to_role('admin', 'projects.manage');
SELECT assign_permission_to_role('admin', 'finance.view');
SELECT assign_permission_to_role('admin', 'finance.create');
SELECT assign_permission_to_role('admin', 'finance.edit');
SELECT assign_permission_to_role('admin', 'finance.delete');
SELECT assign_permission_to_role('admin', 'finance.manage');
SELECT assign_permission_to_role('admin', 'finance.export');
SELECT assign_permission_to_role('admin', 'inbox.view');
SELECT assign_permission_to_role('admin', 'inbox.send');
SELECT assign_permission_to_role('admin', 'inbox.manage');
SELECT assign_permission_to_role('admin', 'analytics.view');
SELECT assign_permission_to_role('admin', 'analytics.export');
SELECT assign_permission_to_role('admin', 'analytics.manage');
SELECT assign_permission_to_role('admin', 'settings.view');
SELECT assign_permission_to_role('admin', 'settings.edit');
SELECT assign_permission_to_role('admin', 'settings.manage');
SELECT assign_permission_to_role('admin', 'integrations.view');
SELECT assign_permission_to_role('admin', 'integrations.create');
SELECT assign_permission_to_role('admin', 'integrations.edit');
SELECT assign_permission_to_role('admin', 'integrations.delete');
SELECT assign_permission_to_role('admin', 'integrations.manage');
SELECT assign_permission_to_role('admin', 'admin.access');
SELECT assign_permission_to_role('admin', 'admin.users');
SELECT assign_permission_to_role('admin', 'admin.roles');

-- Manager permissions
SELECT assign_permission_to_role('manager', 'users.view');
SELECT assign_permission_to_role('manager', 'users.edit');
SELECT assign_permission_to_role('manager', 'teams.view');
SELECT assign_permission_to_role('manager', 'teams.edit');
SELECT assign_permission_to_role('manager', 'departments.view');
SELECT assign_permission_to_role('manager', 'companies.view');
SELECT assign_permission_to_role('manager', 'courses.view');
SELECT assign_permission_to_role('manager', 'courses.create');
SELECT assign_permission_to_role('manager', 'courses.edit');
SELECT assign_permission_to_role('manager', 'courses.enroll');
SELECT assign_permission_to_role('manager', 'workflows.view');
SELECT assign_permission_to_role('manager', 'workflows.create');
SELECT assign_permission_to_role('manager', 'workflows.edit');
SELECT assign_permission_to_role('manager', 'workflows.execute');
SELECT assign_permission_to_role('manager', 'projects.view');
SELECT assign_permission_to_role('manager', 'projects.create');
SELECT assign_permission_to_role('manager', 'projects.edit');
SELECT assign_permission_to_role('manager', 'finance.view');
SELECT assign_permission_to_role('manager', 'finance.create');
SELECT assign_permission_to_role('manager', 'finance.edit');
SELECT assign_permission_to_role('manager', 'finance.export');
SELECT assign_permission_to_role('manager', 'inbox.view');
SELECT assign_permission_to_role('manager', 'inbox.send');
SELECT assign_permission_to_role('manager', 'analytics.view');
SELECT assign_permission_to_role('manager', 'analytics.export');
SELECT assign_permission_to_role('manager', 'settings.view');
SELECT assign_permission_to_role('manager', 'integrations.view');

-- User permissions
SELECT assign_permission_to_role('user', 'users.view');
SELECT assign_permission_to_role('user', 'teams.view');
SELECT assign_permission_to_role('user', 'departments.view');
SELECT assign_permission_to_role('user', 'companies.view');
SELECT assign_permission_to_role('user', 'courses.view');
SELECT assign_permission_to_role('user', 'courses.enroll');
SELECT assign_permission_to_role('user', 'workflows.view');
SELECT assign_permission_to_role('user', 'workflows.execute');
SELECT assign_permission_to_role('user', 'projects.view');
SELECT assign_permission_to_role('user', 'projects.create');
SELECT assign_permission_to_role('user', 'projects.edit');
SELECT assign_permission_to_role('user', 'finance.view');
SELECT assign_permission_to_role('user', 'finance.create');
SELECT assign_permission_to_role('user', 'inbox.view');
SELECT assign_permission_to_role('user', 'inbox.send');
SELECT assign_permission_to_role('user', 'analytics.view');
SELECT assign_permission_to_role('user', 'settings.view');

-- Learner permissions (focused on courses)
SELECT assign_permission_to_role('learner', 'users.view');
SELECT assign_permission_to_role('learner', 'courses.view');
SELECT assign_permission_to_role('learner', 'courses.enroll');
SELECT assign_permission_to_role('learner', 'inbox.view');
SELECT assign_permission_to_role('learner', 'inbox.send');

-- Viewer permissions (read-only)
SELECT assign_permission_to_role('viewer', 'users.view');
SELECT assign_permission_to_role('viewer', 'teams.view');
SELECT assign_permission_to_role('viewer', 'departments.view');
SELECT assign_permission_to_role('viewer', 'companies.view');
SELECT assign_permission_to_role('viewer', 'courses.view');
SELECT assign_permission_to_role('viewer', 'workflows.view');
SELECT assign_permission_to_role('viewer', 'projects.view');
SELECT assign_permission_to_role('viewer', 'finance.view');
SELECT assign_permission_to_role('viewer', 'inbox.view');
SELECT assign_permission_to_role('viewer', 'analytics.view');
SELECT assign_permission_to_role('viewer', 'settings.view');

-- Clean up helper function
DROP FUNCTION IF EXISTS assign_permission_to_role(TEXT, TEXT);

-- ============================================
-- Done!
-- ============================================
SELECT 'RBAC system created successfully!' as status;
