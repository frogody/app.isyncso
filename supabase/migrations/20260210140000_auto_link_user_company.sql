-- Auto-link users to companies based on email domain

CREATE OR REPLACE FUNCTION public.auto_link_user_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_company_id UUID;
BEGIN
  -- Only run if user has no company_id yet
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract domain from email
  v_domain := split_part(COALESCE(NEW.email, ''), '@', 2);

  IF v_domain = '' OR v_domain IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip common free email domains
  IF v_domain IN (
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'live.com', 'aol.com', 'protonmail.com', 'mail.com'
  ) THEN
    RETURN NEW;
  END IF;

  -- Find matching company by domain
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE LOWER(domain) = LOWER(v_domain)
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    NEW.company_id := v_company_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on user insert/update
DROP TRIGGER IF EXISTS trg_auto_link_user_company ON public.users;
CREATE TRIGGER trg_auto_link_user_company
  BEFORE INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_user_to_company();

-- Backfill: link existing unlinked users to companies by email domain
UPDATE public.users u
SET company_id = c.id
FROM public.companies c
WHERE u.company_id IS NULL
  AND split_part(u.email, '@', 2) = LOWER(c.domain)
  AND split_part(u.email, '@', 2) NOT IN (
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'live.com', 'aol.com', 'protonmail.com', 'mail.com'
  );
