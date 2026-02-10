-- Auto-assign RBAC roles when users are created or role is updated
-- Fixes: users had role in users.role but no entry in rbac_user_roles

-- Backfill existing users missing RBAC roles
INSERT INTO rbac_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN rbac_roles r ON r.name = u.role
LEFT JOIN rbac_user_roles ur ON ur.user_id = u.id
WHERE ur.id IS NULL AND u.role IS NOT NULL
ON CONFLICT DO NOTHING;

-- Trigger: auto-assign RBAC role on user INSERT
CREATE OR REPLACE FUNCTION public.auto_assign_rbac_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id
  FROM public.rbac_roles
  WHERE name = COALESCE(NEW.role, 'user')
  LIMIT 1;

  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.rbac_roles WHERE name = 'user' LIMIT 1;
  END IF;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_roles (user_id, role_id)
    VALUES (NEW.id, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_rbac_role ON public.users;
CREATE TRIGGER trg_auto_assign_rbac_role
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_rbac_role();

-- Trigger: sync RBAC role when users.role is updated
CREATE OR REPLACE FUNCTION public.sync_rbac_role_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT id INTO v_role_id
    FROM public.rbac_roles
    WHERE name = COALESCE(NEW.role, 'user')
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      DELETE FROM public.rbac_user_roles WHERE user_id = NEW.id;
      INSERT INTO public.rbac_user_roles (user_id, role_id)
      VALUES (NEW.id, v_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rbac_role ON public.users;
CREATE TRIGGER trg_sync_rbac_role
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_rbac_role_on_update();
