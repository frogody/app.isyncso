-- ============================================
-- Auto-assign super_admin to company founders
-- Users who create a new organization become super_admin
-- ============================================

-- Function to assign founder role (super_admin) to a user for their company
-- Uses SECURITY DEFINER to bypass RLS since new users don't have any roles yet
CREATE OR REPLACE FUNCTION public.assign_founder_role(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_role_id UUID;
  v_existing_role UUID;
BEGIN
  -- Get super_admin role ID
  SELECT id INTO v_super_admin_role_id
  FROM public.rbac_roles
  WHERE name = 'super_admin'
  LIMIT 1;

  IF v_super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'super_admin role not found';
  END IF;

  -- Check if user already has super_admin for this company
  SELECT id INTO v_existing_role
  FROM public.rbac_user_roles
  WHERE user_id = p_user_id
    AND role_id = v_super_admin_role_id
    AND scope_type = 'company'
    AND scope_id = p_company_id;

  IF v_existing_role IS NOT NULL THEN
    -- Already has the role, return true
    RETURN TRUE;
  END IF;

  -- Assign super_admin role to user for this company
  INSERT INTO public.rbac_user_roles (
    user_id,
    role_id,
    scope_type,
    scope_id,
    assigned_by
  ) VALUES (
    p_user_id,
    v_super_admin_role_id,
    'company',
    p_company_id,
    p_user_id  -- Self-assigned as founder
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'assign_founder_role failed: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_founder_role(UUID, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.assign_founder_role IS
  'Assigns super_admin role to a user for a specific company. Used during onboarding when user creates a new organization.';
