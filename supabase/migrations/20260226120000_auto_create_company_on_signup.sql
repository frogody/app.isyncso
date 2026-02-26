-- Auto-create a company for every new user on signup
-- This ensures every user has a company_id from the start, which is required
-- for creating products, invoices, and other company-scoped resources.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_name TEXT;
BEGIN
  -- Determine user display name
  v_user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create a company for the new user
  v_company_id := gen_random_uuid();
  INSERT INTO public.companies (id, name, email, created_date, updated_date)
  VALUES (v_company_id, v_user_name, NEW.email, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- Note: the existing auto_create_org_for_company trigger on companies
  -- will automatically create an organization with id = company_id

  -- Insert into public.users table with company_id and organization_id set
  INSERT INTO public.users (id, auth_id, email, full_name, avatar_url, company_id, organization_id, created_at)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    v_user_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    v_company_id,
    v_company_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    company_id = COALESCE(users.company_id, EXCLUDED.company_id),
    organization_id = COALESCE(users.organization_id, EXCLUDED.organization_id),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix existing users who have no company_id
-- Create companies for them and assign
DO $$
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN SELECT id, email, full_name FROM public.users WHERE company_id IS NULL LOOP
    v_company_id := gen_random_uuid();

    INSERT INTO public.companies (id, name, email, created_date, updated_date)
    VALUES (
      v_company_id,
      COALESCE(r.full_name, split_part(r.email, '@', 1)),
      r.email,
      NOW(),
      NOW()
    );

    UPDATE public.users
    SET company_id = v_company_id,
        organization_id = COALESCE(organization_id, v_company_id),
        updated_at = NOW()
    WHERE id = r.id;
  END LOOP;
END;
$$;
