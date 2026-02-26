-- =============================================================================
-- Fix: Remove hardcoded service_role_key from database functions
-- =============================================================================
--
-- SECURITY FIX: The service_role_key was hardcoded as a literal JWT string in
-- multiple trigger functions and cron jobs. This key bypasses ALL Row Level
-- Security policies. Hardcoding it in SQL means it's visible in migration files,
-- pg_proc, and query logs.
--
-- This migration redefines all affected functions to use:
--   current_setting('supabase.service_role_key')
-- which reads the key from Supabase's built-in runtime configuration instead.
--
-- Affected originals:
--   1. 20260202160000_fix_sync_intel_trigger.sql  -> trigger_sync_intel_processor()
--   2. 20260129110000_auto_trigger_sync_intel_queue.sql -> trigger_sync_intel_processor() (superseded by above)
--   3. 20260223210000_product_feed_cron.sql       -> cron.schedule('product-feed-auto-sync')
--   4. 20260210150000_auto_create_enrich_company.sql -> auto_link_user_to_company()
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. trigger_sync_intel_processor()
--    Replaces the version from 20260202160000 that had the literal key in
--    jsonb_build_object(). Now uses current_setting().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_sync_intel_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_triggered TIMESTAMPTZ;
BEGIN
  -- Debounce: only fire once every 10 seconds
  SELECT MAX(created_at) INTO _last_triggered
  FROM sync_intel_queue
  WHERE status = 'pending'
    AND created_at < NEW.created_at;

  -- If there were already pending items less than 10s ago, skip (processor is likely running)
  IF _last_triggered IS NOT NULL AND _last_triggered > (NOW() - INTERVAL '10 seconds') THEN
    RETURN NEW;
  END IF;

  -- Fire the processor via pg_net
  PERFORM net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/process-sync-intel-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
    ),
    body := jsonb_build_object('triggered_by', 'db_trigger')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_sync_intel_processor error: %', SQLERRM;
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. product-feed-auto-sync cron job
--    The original cron.schedule() embedded the literal key in the SQL string.
--    We unschedule the old job and recreate it with current_setting().
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Remove the old cron job that has the hardcoded key
  PERFORM cron.unschedule('product-feed-auto-sync');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule product-feed-auto-sync: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'product-feed-auto-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/product-feed-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
    ),
    body := '{"action": "syncAllActive"}'::jsonb
  );
  $$
);


-- ---------------------------------------------------------------------------
-- 3. auto_link_user_to_company()
--    The original tried current_setting('app.settings.service_role_key') first,
--    then fell back to the hardcoded literal. We now use the correct built-in
--    setting 'supabase.service_role_key' with no hardcoded fallback.
-- ---------------------------------------------------------------------------
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
    -- Company exists - link immediately
    NEW.company_id := v_company_id;
    RETURN NEW;
  END IF;

  -- No matching company found - fire async edge function to create + enrich
  PERFORM net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/auto-enrich-company',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
    ),
    body := jsonb_build_object(
      'domain', v_domain,
      'user_id', NEW.id::text
    )
  );

  -- Return without company_id - the edge function will set it asynchronously
  RETURN NEW;
END;
$$;
