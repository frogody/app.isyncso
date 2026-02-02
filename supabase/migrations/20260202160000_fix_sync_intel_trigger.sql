-- Fix: Install the sync_intel_queue trigger that was missing from production.
-- Also add missing current_stage column needed by the processor edge function.

ALTER TABLE sync_intel_queue ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT NULL;

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
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU'
    ),
    body := jsonb_build_object('triggered_by', 'db_trigger')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_sync_intel_processor error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trg_sync_intel_queue_process ON sync_intel_queue;

CREATE TRIGGER trg_sync_intel_queue_process
  AFTER INSERT ON sync_intel_queue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_intel_processor();
