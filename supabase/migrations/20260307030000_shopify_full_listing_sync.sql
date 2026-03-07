-- Shopify Full Listing Sync — additional columns for product mapping data
-- Tracks full Shopify product data and sync timestamps

ALTER TABLE shopify_product_mappings
  ADD COLUMN IF NOT EXISTS shopify_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_full_sync_at TIMESTAMPTZ;
