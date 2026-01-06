-- ============================================
-- Setup iSyncSO Team Members
-- Ensures gody@isyncso.com and david@isyncso.com
-- are under the same company and team
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_org_id UUID;
  v_team_id UUID;
  v_gody_id UUID;
  v_david_id UUID;
  v_super_admin_role_id UUID;
BEGIN
  -- ============================================
  -- 1. Find or create the iSyncSO company
  -- ============================================
  SELECT id INTO v_company_id FROM public.companies WHERE domain = 'isyncso.com' LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, domain, created_date, updated_date)
    VALUES ('iSyncSO', 'isyncso.com', NOW(), NOW())
    RETURNING id INTO v_company_id;
    RAISE NOTICE 'Created company iSyncSO with ID: %', v_company_id;
  ELSE
    RAISE NOTICE 'Found existing company iSyncSO with ID: %', v_company_id;
  END IF;

  -- ============================================
  -- 2. Find or create the organization (for teams)
  -- ============================================
  SELECT id INTO v_org_id FROM public.organizations WHERE domain = 'isyncso.com' LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, domain, created_date, updated_date)
    VALUES ('iSyncSO', 'isyncso.com', NOW(), NOW())
    RETURNING id INTO v_org_id;
    RAISE NOTICE 'Created organization iSyncSO with ID: %', v_org_id;
  ELSE
    RAISE NOTICE 'Found existing organization iSyncSO with ID: %', v_org_id;
  END IF;

  -- ============================================
  -- 3. Find the users by email
  -- ============================================
  SELECT id INTO v_gody_id FROM public.users WHERE email = 'gody@isyncso.com' LIMIT 1;
  SELECT id INTO v_david_id FROM public.users WHERE email = 'david@isyncso.com' LIMIT 1;

  IF v_gody_id IS NULL THEN
    RAISE NOTICE 'WARNING: User gody@isyncso.com not found - they need to sign up first';
  ELSE
    RAISE NOTICE 'Found user gody@isyncso.com with ID: %', v_gody_id;
  END IF;

  IF v_david_id IS NULL THEN
    RAISE NOTICE 'WARNING: User david@isyncso.com not found - they need to sign up first';
  ELSE
    RAISE NOTICE 'Found user david@isyncso.com with ID: %', v_david_id;
  END IF;

  -- ============================================
  -- 4. Update users to be in the same company
  -- ============================================
  IF v_gody_id IS NOT NULL THEN
    UPDATE public.users
    SET company_id = v_company_id, updated_at = NOW()
    WHERE id = v_gody_id;
    RAISE NOTICE 'Updated gody@isyncso.com company_id to: %', v_company_id;
  END IF;

  IF v_david_id IS NOT NULL THEN
    UPDATE public.users
    SET company_id = v_company_id, updated_at = NOW()
    WHERE id = v_david_id;
    RAISE NOTICE 'Updated david@isyncso.com company_id to: %', v_company_id;
  END IF;

  -- ============================================
  -- 5. Find or create the Core Team
  -- ============================================
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE organization_id = v_org_id AND name = 'Core Team'
  LIMIT 1;

  IF v_team_id IS NULL THEN
    INSERT INTO public.teams (organization_id, name, description, created_date, updated_date)
    VALUES (v_org_id, 'Core Team', 'iSyncSO Core Team Members', NOW(), NOW())
    RETURNING id INTO v_team_id;
    RAISE NOTICE 'Created team "Core Team" with ID: %', v_team_id;
  ELSE
    RAISE NOTICE 'Found existing team "Core Team" with ID: %', v_team_id;
  END IF;

  -- ============================================
  -- 6. Add users to the team (upsert pattern)
  -- ============================================
  IF v_gody_id IS NOT NULL THEN
    -- Check if already a member
    IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = v_team_id AND user_id = v_gody_id) THEN
      INSERT INTO public.team_members (team_id, user_id, role, created_date, updated_date)
      VALUES (v_team_id, v_gody_id, 'admin', NOW(), NOW());
      RAISE NOTICE 'Added gody@isyncso.com to Core Team as admin';
    ELSE
      UPDATE public.team_members SET role = 'admin', updated_date = NOW()
      WHERE team_id = v_team_id AND user_id = v_gody_id;
      RAISE NOTICE 'Updated gody@isyncso.com role in Core Team to admin';
    END IF;
  END IF;

  IF v_david_id IS NOT NULL THEN
    -- Check if already a member
    IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = v_team_id AND user_id = v_david_id) THEN
      INSERT INTO public.team_members (team_id, user_id, role, created_date, updated_date)
      VALUES (v_team_id, v_david_id, 'admin', NOW(), NOW());
      RAISE NOTICE 'Added david@isyncso.com to Core Team as admin';
    ELSE
      UPDATE public.team_members SET role = 'admin', updated_date = NOW()
      WHERE team_id = v_team_id AND user_id = v_david_id;
      RAISE NOTICE 'Updated david@isyncso.com role in Core Team to admin';
    END IF;
  END IF;

  -- ============================================
  -- 7. Assign super_admin roles via RBAC
  -- ============================================
  SELECT id INTO v_super_admin_role_id FROM public.rbac_roles WHERE name = 'super_admin' LIMIT 1;

  IF v_super_admin_role_id IS NOT NULL THEN
    -- Assign super_admin to gody
    IF v_gody_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.rbac_user_roles
        WHERE user_id = v_gody_id AND role_id = v_super_admin_role_id AND scope_type = 'global'
      ) THEN
        INSERT INTO public.rbac_user_roles (user_id, role_id, scope_type, scope_id, created_at)
        VALUES (v_gody_id, v_super_admin_role_id, 'global', NULL, NOW());
        RAISE NOTICE 'Assigned super_admin role to gody@isyncso.com';
      ELSE
        RAISE NOTICE 'gody@isyncso.com already has super_admin role';
      END IF;
    END IF;

    -- Assign super_admin to david
    IF v_david_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.rbac_user_roles
        WHERE user_id = v_david_id AND role_id = v_super_admin_role_id AND scope_type = 'global'
      ) THEN
        INSERT INTO public.rbac_user_roles (user_id, role_id, scope_type, scope_id, created_at)
        VALUES (v_david_id, v_super_admin_role_id, 'global', NULL, NOW());
        RAISE NOTICE 'Assigned super_admin role to david@isyncso.com';
      ELSE
        RAISE NOTICE 'david@isyncso.com already has super_admin role';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'WARNING: super_admin role not found in rbac_roles - run RBAC setup first';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Setup complete!';
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE 'Team ID: %', v_team_id;
  RAISE NOTICE '============================================';

END $$;

-- ============================================
-- Verification queries
-- ============================================

-- Show users in iSyncSO company
SELECT
  'USERS IN ISYNCSO COMPANY' as section,
  u.id as user_id,
  u.email,
  u.full_name,
  u.company_id,
  c.name as company_name,
  c.domain as company_domain
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE u.email IN ('gody@isyncso.com', 'david@isyncso.com');

-- Show team memberships
SELECT
  'TEAM MEMBERSHIPS' as section,
  u.email,
  t.name as team_name,
  tm.role,
  o.name as organization_name
FROM public.team_members tm
JOIN public.users u ON tm.user_id = u.id
JOIN public.teams t ON tm.team_id = t.id
LEFT JOIN public.organizations o ON t.organization_id = o.id
WHERE u.email IN ('gody@isyncso.com', 'david@isyncso.com');

-- Show RBAC roles
SELECT
  'RBAC ROLES' as section,
  u.email,
  r.name as role_name,
  r.hierarchy_level,
  ur.scope_type
FROM public.rbac_user_roles ur
JOIN public.users u ON ur.user_id = u.id
JOIN public.rbac_roles r ON ur.role_id = r.id
WHERE u.email IN ('gody@isyncso.com', 'david@isyncso.com')
ORDER BY r.hierarchy_level DESC;

-- ============================================
-- Done! Both users should now be:
-- 1. In the same company (iSyncSO)
-- 2. In the same team (Core Team)
-- 3. Have super_admin RBAC roles (hierarchy_level = 100)
-- ============================================
