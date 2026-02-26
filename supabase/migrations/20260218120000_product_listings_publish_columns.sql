-- Add publishing columns to product_listings table
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft';
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS publish_error TEXT;
