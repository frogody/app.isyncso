-- =============================================================================
-- Product Feed Import System
-- Allows users to add live CSV URLs from suppliers, apply transformation rules,
-- and auto-sync products to their catalog + push offers to bol.com.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. product_feeds — Feed configuration per company
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    delimiter TEXT DEFAULT ',',
    encoding TEXT DEFAULT 'utf-8',
    has_header_row BOOLEAN DEFAULT true,

    -- Sync configuration
    sync_interval TEXT DEFAULT '1h' CHECK (sync_interval IN ('15min', '1h', '4h', '24h', 'manual')),
    is_active BOOLEAN DEFAULT true,
    auto_push_offers BOOLEAN DEFAULT false,

    -- Field mapping: { "csv_column_name": "target_field" }
    field_mapping JSONB DEFAULT '{}',

    -- Transformation rules: array of rule objects
    transformation_rules JSONB DEFAULT '[]',

    -- bol.com defaults for offers created from this feed
    bolcom_defaults JSONB DEFAULT '{"fulfilment_method":"FBR","delivery_code":"2-3d","condition":"NEW"}',

    -- Stats
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    last_sync_summary JSONB DEFAULT '{}',
    total_items INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_feeds_company ON product_feeds(company_id);
CREATE INDEX idx_product_feeds_active ON product_feeds(company_id) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 2. product_feed_items — Links feed CSV rows to local products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES product_feeds(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    company_id UUID NOT NULL,
    source_ean TEXT,
    source_sku TEXT,
    raw_data JSONB DEFAULT '{}',
    transformed_data JSONB DEFAULT '{}',
    is_excluded BOOLEAN DEFAULT false,
    exclude_reason TEXT,
    sync_hash TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feed_id, source_ean)
);

CREATE INDEX idx_feed_items_feed ON product_feed_items(feed_id);
CREATE INDEX idx_feed_items_company ON product_feed_items(company_id);
CREATE INDEX idx_feed_items_ean ON product_feed_items(feed_id, source_ean);
CREATE INDEX idx_feed_items_product ON product_feed_items(product_id) WHERE product_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. product_feed_sync_log — Sync history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_feed_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES product_feeds(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',
    total_rows INTEGER DEFAULT 0,
    imported INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    excluded INTEGER DEFAULT 0,
    unchanged INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    offers_pushed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    triggered_by TEXT DEFAULT 'manual'
);

CREATE INDEX idx_feed_sync_log_feed ON product_feed_sync_log(feed_id);
CREATE INDEX idx_feed_sync_log_company ON product_feed_sync_log(company_id);

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE product_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_feed_sync_log ENABLE ROW LEVEL SECURITY;

-- product_feeds
CREATE POLICY "Users can manage feeds for their company"
    ON product_feeds FOR ALL TO authenticated
    USING (company_id = auth_company_id())
    WITH CHECK (company_id = auth_company_id());

-- product_feed_items
CREATE POLICY "Users can manage feed items for their company"
    ON product_feed_items FOR ALL TO authenticated
    USING (company_id = auth_company_id())
    WITH CHECK (company_id = auth_company_id());

-- product_feed_sync_log
CREATE POLICY "Users can view sync logs for their company"
    ON product_feed_sync_log FOR SELECT TO authenticated
    USING (company_id = auth_company_id());

CREATE POLICY "Service can manage sync logs"
    ON product_feed_sync_log FOR ALL TO authenticated
    USING (company_id = auth_company_id())
    WITH CHECK (company_id = auth_company_id());
