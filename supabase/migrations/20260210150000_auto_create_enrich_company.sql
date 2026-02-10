-- Updated trigger: auto-link user to company by domain, or create + enrich via edge function

CREATE OR REPLACE FUNCTION public.auto_link_user_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_company_id UUID;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only run if user has no company_id yet
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract domain from email
  v_domain := LOWER(split_part(COALESCE(NEW.email, ''), '@', 2));

  IF v_domain = '' OR v_domain IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip common free email domains
  IF v_domain IN (
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'live.com', 'aol.com', 'protonmail.com', 'mail.com',
    'yahoo.nl', 'hotmail.nl', 'outlook.nl', 'ziggo.nl', 'kpnmail.nl',
    'live.nl', 'upcmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl',
    'home.nl', 'casema.nl', 'chello.nl', 'quicknet.nl', 'tele2.nl',
    'yahoo.co.uk', 'hotmail.co.uk', 'btinternet.com', 'sky.com',
    'yahoo.de', 'web.de', 'gmx.de', 'gmx.net', 't-online.de',
    'yahoo.fr', 'orange.fr', 'free.fr', 'laposte.net',
    'me.com', 'mac.com', 'msn.com', 'ymail.com', 'rocketmail.com',
    'tutanota.com', 'proton.me', 'pm.me', 'hey.com', 'fastmail.com'
  ) THEN
    RETURN NEW;
  END IF;

  -- Find matching company by domain
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE LOWER(domain) = v_domain
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    -- Company exists — link immediately
    NEW.company_id := v_company_id;
    RETURN NEW;
  END IF;

  -- No matching company found — fire async edge function to create + enrich
  -- Uses pg_net for non-blocking HTTP call
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to env vars if app settings not available
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://sfxpmzicgpaxfntqleig.supabase.co';
  END IF;
  IF v_service_key IS NULL OR v_service_key = '' THEN
    v_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU';
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/auto-enrich-company',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'domain', v_domain,
      'user_id', NEW.id::text
    )
  );

  -- Return without company_id — the edge function will set it asynchronously
  RETURN NEW;
END;
$$;

-- Recreate trigger (same as before)
DROP TRIGGER IF EXISTS trg_auto_link_user_company ON public.users;
CREATE TRIGGER trg_auto_link_user_company
  BEFORE INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_user_to_company();
