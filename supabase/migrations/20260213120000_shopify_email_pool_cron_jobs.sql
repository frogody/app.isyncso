-- pg_cron scheduled jobs for Shopify and Email Pool
-- Requires pg_cron and pg_net extensions (already enabled)

-- ============================================================
-- 1. Shopify Order Backup Poll — every 15 minutes
-- Catches orders missed by webhooks
-- ============================================================
SELECT cron.schedule(
  'shopify-order-backup-poll',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/shopify-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "pollNewOrders"}'::jsonb
  );
  $$
);

-- ============================================================
-- 2. Shopify Inventory Sync — every 15 minutes
-- Periodic inventory comparison between local and Shopify
-- ============================================================
SELECT cron.schedule(
  'shopify-inventory-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/shopify-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "batchInventoryUpdate"}'::jsonb
  );
  $$
);

-- ============================================================
-- 3. Email Pool Health Check — every 10 minutes
-- Checks pool account connection health
-- ============================================================
SELECT cron.schedule(
  'email-pool-health-check',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/process-order-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "healthCheck"}'::jsonb
  );
  $$
);
