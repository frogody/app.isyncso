-- ================================================================
-- BLUEPRINT FOUNDATION MIGRATION
-- Task: P0-1 (Create all new tables + column additions)
--       P0-2 (RLS policies)
--       P0-3 (Database triggers)
--       P0-4 (Composite indexes)
-- ================================================================
-- This migration creates all schema changes required by the
-- Blueprint Client Build Plan, deployed upfront for clean
-- dependency management across Phases 1-5, Email Pool, and Shopify.
--
-- Convention: ALL tables use company_id scoped via get_user_company_id().
-- This is the inventory/logistics domain. Do NOT use organization_id.
-- ================================================================

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- PURCHASE GROUPS: Group multiple purchases under one moment
CREATE TABLE IF NOT EXISTS purchase_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id),
    sales_channel TEXT CHECK (sales_channel IN ('b2b', 'b2c', 'mixed', 'undecided')),
    remarks TEXT,
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'partially_received', 'complete', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECEIVING SESSIONS: Group scans into receiving moments
CREATE TABLE IF NOT EXISTS receiving_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    started_by UUID REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    total_items_received INTEGER DEFAULT 0,
    total_eans_scanned INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHIPMENTS: Group pallets into outbound shipments
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_code TEXT NOT NULL,
    shipment_type TEXT NOT NULL CHECK (shipment_type IN ('b2b', 'b2c_lvb')),
    destination TEXT,
    customer_id UUID REFERENCES customers(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'packing', 'packed', 'shipped', 'delivered', 'verified')),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'discrepancy')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    bol_shipment_id TEXT,
    bol_received_at TIMESTAMPTZ,
    carrier TEXT,
    tracking_code TEXT,
    total_pallets INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    shipped_at TIMESTAMPTZ,
    shipped_by UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PALLETS: Individual pallets within a shipment
CREATE TABLE IF NOT EXISTS pallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    pallet_code TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    status TEXT DEFAULT 'packing' CHECK (status IN ('packing', 'packed', 'shipped')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, pallet_code)
);

-- PALLET ITEMS: Products on each pallet
CREATE TABLE IF NOT EXISTS pallet_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pallet_id UUID NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    ean TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    verified_quantity INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pallet_id, product_id)
);

-- RETURNS: B2C return tracking
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    return_code TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('bolcom', 'shopify', 'manual', 'other')),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'received', 'inspected', 'processed')),
    sales_order_id UUID REFERENCES sales_orders(id),
    customer_id UUID REFERENCES customers(id),
    bol_return_id TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RETURN ITEMS: Individual items in a return
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    ean TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT CHECK (reason IN ('defective', 'wrong_item', 'not_as_described', 'no_longer_needed', 'arrived_late', 'other')),
    reason_notes TEXT,
    action TEXT CHECK (action IN ('restock', 'dispose', 'inspect', 'pending')),
    action_completed BOOLEAN DEFAULT FALSE,
    receiving_log_id UUID REFERENCES receiving_log(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCT SALES CHANNELS: Junction table — a product can be on
-- multiple channels simultaneously (B2B + B2C/bol.com + Shopify)
CREATE TABLE IF NOT EXISTS product_sales_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL REFERENCES products(id),
    channel TEXT NOT NULL CHECK (channel IN ('b2b', 'b2c', 'bolcom', 'shopify')),
    is_active BOOLEAN DEFAULT true,
    listed_at TIMESTAMPTZ DEFAULT NOW(),
    listed_by UUID REFERENCES auth.users(id),
    delisted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, product_id, channel)
);

-- CHANNEL AUDIT LOG: Track B2B/B2C channel changes
CREATE TABLE IF NOT EXISTS channel_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    purchase_group_id UUID REFERENCES purchase_groups(id),
    old_channel TEXT,
    new_channel TEXT,
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 2. COLUMN ADDITIONS TO EXISTING TABLES
-- ============================================================

-- stock_purchases: add manual entry support + grouping
ALTER TABLE stock_purchases ADD COLUMN IF NOT EXISTS entry_method TEXT DEFAULT 'invoice'
    CHECK (entry_method IN ('invoice', 'manual'));
ALTER TABLE stock_purchases ADD COLUMN IF NOT EXISTS purchase_group_id UUID REFERENCES purchase_groups(id);
ALTER TABLE stock_purchases ADD COLUMN IF NOT EXISTS sales_channel TEXT
    CHECK (sales_channel IN ('b2b', 'b2c', 'mixed', 'undecided'));

-- stock_purchase_line_items: add URL, country, channel
ALTER TABLE stock_purchase_line_items ADD COLUMN IF NOT EXISTS order_url TEXT;
ALTER TABLE stock_purchase_line_items ADD COLUMN IF NOT EXISTS country_of_purchase TEXT DEFAULT 'NL';
ALTER TABLE stock_purchase_line_items ADD COLUMN IF NOT EXISTS sales_channel TEXT
    CHECK (sales_channel IN ('b2b', 'b2c', 'undecided'));

-- expected_deliveries: add channel + purchase group link
ALTER TABLE expected_deliveries ADD COLUMN IF NOT EXISTS sales_channel TEXT
    CHECK (sales_channel IN ('b2b', 'b2c', 'undecided'));
ALTER TABLE expected_deliveries ADD COLUMN IF NOT EXISTS purchase_group_id UUID REFERENCES purchase_groups(id);

-- receiving_log: add session link
ALTER TABLE receiving_log ADD COLUMN IF NOT EXISTS receiving_session_id UUID REFERENCES receiving_sessions(id);

-- inventory: add channel-based stock allocation
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_allocated_b2b INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_allocated_b2c INTEGER DEFAULT 0;


-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE purchase_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_audit_log ENABLE ROW LEVEL SECURITY;

-- Company-scoped access policies (using get_user_company_id() pattern)
CREATE POLICY "purchase_groups_company_access" ON purchase_groups
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "receiving_sessions_company_access" ON receiving_sessions
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "shipments_company_access" ON shipments
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "pallets_company_access" ON pallets
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "returns_company_access" ON returns
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "product_sales_channels_company_access" ON product_sales_channels
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "channel_audit_log_company_access" ON channel_audit_log
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id());

-- Child tables without company_id: access via parent
CREATE POLICY "pallet_items_access" ON pallet_items
    FOR ALL TO authenticated
    USING (
        pallet_id IN (
            SELECT id FROM pallets WHERE company_id = get_user_company_id()
        )
    );

CREATE POLICY "return_items_access" ON return_items
    FOR ALL TO authenticated
    USING (
        return_id IN (
            SELECT id FROM returns WHERE company_id = get_user_company_id()
        )
    );


-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Purchase Groups
CREATE INDEX IF NOT EXISTS idx_purchase_groups_company ON purchase_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_groups_company_date ON purchase_groups(company_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_groups_company_status ON purchase_groups(company_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_groups_supplier ON purchase_groups(supplier_id) WHERE supplier_id IS NOT NULL;

-- Receiving Sessions
CREATE INDEX IF NOT EXISTS idx_receiving_sessions_company ON receiving_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_receiving_sessions_company_status ON receiving_sessions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_receiving_sessions_company_started ON receiving_sessions(company_id, started_at DESC);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_company_status ON shipments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_company_type ON shipments(company_id, shipment_type);
CREATE INDEX IF NOT EXISTS idx_shipments_bol_id ON shipments(bol_shipment_id) WHERE bol_shipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_company_created ON shipments(company_id, created_at DESC);

-- Pallets
CREATE INDEX IF NOT EXISTS idx_pallets_shipment ON pallets(shipment_id);
CREATE INDEX IF NOT EXISTS idx_pallets_company ON pallets(company_id);
CREATE INDEX IF NOT EXISTS idx_pallets_company_code ON pallets(company_id, pallet_code);

-- Pallet Items
CREATE INDEX IF NOT EXISTS idx_pallet_items_pallet ON pallet_items(pallet_id);
CREATE INDEX IF NOT EXISTS idx_pallet_items_product ON pallet_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pallet_items_ean ON pallet_items(ean) WHERE ean IS NOT NULL;

-- Returns
CREATE INDEX IF NOT EXISTS idx_returns_company ON returns(company_id);
CREATE INDEX IF NOT EXISTS idx_returns_company_status ON returns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_returns_sales_order ON returns(sales_order_id) WHERE sales_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_returns_bol_return ON returns(bol_return_id) WHERE bol_return_id IS NOT NULL;

-- Return Items
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON return_items(product_id);

-- Product Sales Channels
CREATE INDEX IF NOT EXISTS idx_product_sales_channels_company ON product_sales_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_channels_product ON product_sales_channels(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_channels_active ON product_sales_channels(company_id, channel) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_sales_channels_product_active ON product_sales_channels(product_id, is_active) WHERE is_active = true;

-- Channel Audit Log
CREATE INDEX IF NOT EXISTS idx_channel_audit_company ON channel_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_audit_product ON channel_audit_log(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_audit_company_changed ON channel_audit_log(company_id, changed_at DESC);

-- FK indexes on new columns added to existing tables
CREATE INDEX IF NOT EXISTS idx_stock_purchases_group ON stock_purchases(purchase_group_id) WHERE purchase_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_deliveries_group ON expected_deliveries(purchase_group_id) WHERE purchase_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receiving_log_session ON receiving_log(receiving_session_id) WHERE receiving_session_id IS NOT NULL;


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp for tables that have it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables with updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'purchase_groups', 'shipments', 'pallets', 'pallet_items', 'returns'
    ]) LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            tbl
        );
    END LOOP;
EXCEPTION WHEN duplicate_object THEN
    -- Triggers already exist, skip
    NULL;
END;
$$;

-- Auto-update purchase_groups totals when stock_purchases change
CREATE OR REPLACE FUNCTION update_purchase_group_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchase_group_id IS NOT NULL THEN
        UPDATE purchase_groups SET
            total_items = (
                SELECT COALESCE(SUM(li.quantity), 0)
                FROM stock_purchase_line_items li
                JOIN stock_purchases sp ON sp.id = li.stock_purchase_id
                WHERE sp.purchase_group_id = NEW.purchase_group_id
            ),
            total_value = (
                SELECT COALESCE(SUM(li.line_total), 0)
                FROM stock_purchase_line_items li
                JOIN stock_purchases sp ON sp.id = li.stock_purchase_id
                WHERE sp.purchase_group_id = NEW.purchase_group_id
            ),
            updated_at = NOW()
        WHERE id = NEW.purchase_group_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Wire the trigger (fires when a purchase is assigned/changed to a group)
DROP TRIGGER IF EXISTS trg_update_purchase_group_totals ON stock_purchases;
CREATE TRIGGER trg_update_purchase_group_totals
    AFTER INSERT OR UPDATE OF purchase_group_id ON stock_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_group_totals();

-- Auto-update shipment totals when pallets/items change
CREATE OR REPLACE FUNCTION update_shipment_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_shipment_id UUID;
BEGIN
    -- Get shipment_id from the pallet
    IF TG_TABLE_NAME = 'pallets' THEN
        v_shipment_id := COALESCE(NEW.shipment_id, OLD.shipment_id);
    ELSIF TG_TABLE_NAME = 'pallet_items' THEN
        SELECT shipment_id INTO v_shipment_id FROM pallets WHERE id = COALESCE(NEW.pallet_id, OLD.pallet_id);
    END IF;

    IF v_shipment_id IS NOT NULL THEN
        UPDATE shipments SET
            total_pallets = (SELECT COUNT(*) FROM pallets WHERE shipment_id = v_shipment_id),
            total_items = (
                SELECT COALESCE(SUM(pi.quantity), 0)
                FROM pallet_items pi
                JOIN pallets p ON p.id = pi.pallet_id
                WHERE p.shipment_id = v_shipment_id
            ),
            updated_at = NOW()
        WHERE id = v_shipment_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_shipment_totals_pallets ON pallets;
CREATE TRIGGER trg_update_shipment_totals_pallets
    AFTER INSERT OR DELETE ON pallets
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_totals();

DROP TRIGGER IF EXISTS trg_update_shipment_totals_items ON pallet_items;
CREATE TRIGGER trg_update_shipment_totals_items
    AFTER INSERT OR UPDATE OF quantity OR DELETE ON pallet_items
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_totals();

-- Auto-update receiving_sessions totals when receiving_log entries are added
CREATE OR REPLACE FUNCTION update_receiving_session_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receiving_session_id IS NOT NULL THEN
        UPDATE receiving_sessions SET
            total_items_received = (
                SELECT COALESCE(SUM(quantity_received), 0)
                FROM receiving_log
                WHERE receiving_session_id = NEW.receiving_session_id
            ),
            total_eans_scanned = (
                SELECT COUNT(DISTINCT product_id)
                FROM receiving_log
                WHERE receiving_session_id = NEW.receiving_session_id
            )
        WHERE id = NEW.receiving_session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_receiving_session_totals ON receiving_log;
CREATE TRIGGER trg_update_receiving_session_totals
    AFTER INSERT OR UPDATE OF receiving_session_id, quantity_received ON receiving_log
    FOR EACH ROW
    EXECUTE FUNCTION update_receiving_session_totals();
