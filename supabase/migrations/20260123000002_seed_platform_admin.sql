-- ============================================================================
-- Seed Platform Admin
-- Add initial super_admin user(s) to platform_admins table
-- ============================================================================

-- Add users with super_admin role as platform super_admins
INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
SELECT
  auth_id,
  'super_admin',
  '["all"]'::jsonb,
  true
FROM public.users
WHERE role = 'super_admin'
  AND auth_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Add users with admin role as platform admins
INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
SELECT
  auth_id,
  'admin',
  '["settings.view", "settings.edit", "users.view", "audit.view"]'::jsonb,
  true
FROM public.users
WHERE role = 'admin'
  AND auth_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- If no platform admins exist, add the first user as super_admin
INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
SELECT
  auth_id,
  'super_admin',
  '["all"]'::jsonb,
  true
FROM public.users
WHERE auth_id IS NOT NULL
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- Log the seeding
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.platform_admins;
  RAISE NOTICE 'Platform admins seeded. Total count: %', admin_count;
END $$;
