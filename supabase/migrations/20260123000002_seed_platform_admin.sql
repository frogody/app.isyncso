-- ============================================================================
-- Seed Platform Admin
-- Add platform owners as super_admin
-- ============================================================================

-- Platform Owners: Only David and Gody have super_admin access
-- david@isyncso.com and gody@isyncso.com

-- Clear any existing entries and add only the platform owners
DELETE FROM public.platform_admins
WHERE user_id NOT IN (
  SELECT auth_id FROM public.users
  WHERE email IN ('david@isyncso.com', 'gody@isyncso.com')
);

-- Add platform owners as super_admin
INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
SELECT
  auth_id,
  'super_admin',
  '["all"]'::jsonb,
  true
FROM public.users
WHERE email IN ('david@isyncso.com', 'gody@isyncso.com')
  AND auth_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  role = 'super_admin',
  permissions = '["all"]'::jsonb,
  is_active = true,
  updated_at = NOW();

-- Log the seeding
DO $$
DECLARE
  admin_count INTEGER;
  admin_emails TEXT;
BEGIN
  SELECT COUNT(*), string_agg(u.email, ', ')
  INTO admin_count, admin_emails
  FROM public.platform_admins pa
  JOIN public.users u ON u.auth_id = pa.user_id;

  RAISE NOTICE 'Platform admins seeded. Count: %, Emails: %', admin_count, admin_emails;
END $$;
