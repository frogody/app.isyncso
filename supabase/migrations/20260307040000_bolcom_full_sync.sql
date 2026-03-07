-- bol.com Full Sync — additional columns for offer mapping data
-- Mirrors shopify_product_mappings pattern (bolcom_data JSONB + last_full_sync_at)

ALTER TABLE bolcom_offer_mappings
  ADD COLUMN IF NOT EXISTS bolcom_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_full_sync_at TIMESTAMPTZ;

-- Index on bolcom_offer_id for fast lookups when resolving process statuses
CREATE INDEX IF NOT EXISTS idx_bolcom_offer_mappings_offer_id
  ON bolcom_offer_mappings(bolcom_offer_id) WHERE bolcom_offer_id IS NOT NULL;

-- Metadata column on pending process statuses for passing context (ean, product_id)
ALTER TABLE bolcom_pending_process_statuses
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
