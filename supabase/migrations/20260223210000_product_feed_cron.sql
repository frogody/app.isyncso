-- =============================================================================
-- Product Feed Auto-Sync Cron Job
-- Fires every 15 minutes. The syncAllActive action in the edge function
-- checks each feed's sync_interval vs last_sync_at and only syncs feeds due.
-- =============================================================================

SELECT cron.schedule(
  'product-feed-auto-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/product-feed-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU'
    ),
    body := '{"action": "syncAllActive"}'::jsonb
  );
  $$
);
