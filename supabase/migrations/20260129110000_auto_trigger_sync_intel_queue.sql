-- Auto-trigger process-sync-intel-queue edge function on new queue inserts
-- Uses pg_net for async HTTP calls with a debounce mechanism

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Debounce log table — prevents hammering the function during bulk inserts
CREATE TABLE IF NOT EXISTS public.sync_intel_trigger_log (
  id SERIAL PRIMARY KEY,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sync_intel_trigger_log_at
  ON public.sync_intel_trigger_log(triggered_at);

-- Trigger function: calls edge function via pg_net, debounced to 10s
CREATE OR REPLACE FUNCTION public.trigger_sync_intel_processor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  last_trigger TIMESTAMPTZ;
BEGIN
  -- Check debounce window
  SELECT MAX(triggered_at) INTO last_trigger
  FROM sync_intel_trigger_log
  WHERE triggered_at > NOW() - INTERVAL '10 seconds';

  IF last_trigger IS NOT NULL THEN
    -- Within debounce window, skip
    RETURN NULL;
  END IF;

  -- Log this trigger
  INSERT INTO sync_intel_trigger_log (triggered_at) VALUES (NOW());

  -- Fire async HTTP POST to the edge function
  PERFORM net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/process-sync-intel-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU"}'::jsonb,
    body := '{"triggered_by":"database_trigger"}'::jsonb
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never fail the original INSERT
  RAISE WARNING 'trigger_sync_intel_processor error: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Attach trigger — FOR EACH STATEMENT so bulk inserts fire once
DROP TRIGGER IF EXISTS auto_process_sync_intel_queue ON public.sync_intel_queue;

CREATE TRIGGER auto_process_sync_intel_queue
  AFTER INSERT ON public.sync_intel_queue
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_sync_intel_processor();

COMMENT ON TRIGGER auto_process_sync_intel_queue ON public.sync_intel_queue IS
  'Auto-invokes process-sync-intel-queue edge function on new inserts, debounced to 10s.';

-- Cleanup old trigger logs (keep 24h)
CREATE OR REPLACE FUNCTION public.cleanup_sync_intel_trigger_log()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM sync_intel_trigger_log
  WHERE triggered_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Schedule daily cleanup via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-sync-intel-trigger-log',
      '0 3 * * *',
      'SELECT public.cleanup_sync_intel_trigger_log()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available, skipping scheduled cleanup';
END;
$$;
