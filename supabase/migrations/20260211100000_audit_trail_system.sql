-- ============================================================
-- AUDIT TRAIL SYSTEM
-- Add created_by/updated_by to Blueprint-touched tables
-- Create product_activity_log for field-level audit history
-- ============================================================

-- === 1. ADD created_by / updated_by COLUMNS ===

-- Products (main target — has neither)
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- stock_purchase_line_items (has neither)
ALTER TABLE stock_purchase_line_items ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE stock_purchase_line_items ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- expected_deliveries (has neither)
ALTER TABLE expected_deliveries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE expected_deliveries ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- inventory (has neither)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- receiving_log (has received_by but no created_by/updated_by)
ALTER TABLE receiving_log ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE receiving_log ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Tables that already have created_by, need updated_by only
ALTER TABLE purchase_groups ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE pallets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);


-- === 2. CREATE product_activity_log TABLE ===

CREATE TABLE IF NOT EXISTS product_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Who and when (references public.users so PostgREST can resolve joins)
    actor_id UUID NOT NULL REFERENCES public.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- What happened
    action TEXT NOT NULL CHECK (action IN (
        'created', 'updated', 'status_changed', 'published', 'archived',
        'price_changed', 'stock_adjusted', 'image_added', 'image_removed',
        'channel_added', 'channel_removed', 'supplier_added', 'supplier_removed',
        'deleted'
    )),

    -- Human-readable summary
    summary TEXT NOT NULL,

    -- Field-level diffs: { "field_name": { "old": <value>, "new": <value> } }
    changes JSONB,

    -- Context
    source TEXT DEFAULT 'app' CHECK (source IN ('app', 'sync', 'api', 'import', 'trigger')),
    metadata JSONB
);


-- === 3. INDEXES ===

CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_activity_log_product ON product_activity_log(product_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_activity_log_company ON product_activity_log(company_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_activity_log_actor ON product_activity_log(actor_id);


-- === 4. RLS ===

ALTER TABLE product_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_activity_log_company_access" ON product_activity_log
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());


-- === 5. AUTO-SET updated_by TRIGGER ===

CREATE OR REPLACE FUNCTION set_audit_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to all tables with updated_by
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'products', 'stock_purchase_line_items', 'expected_deliveries',
        'inventory', 'receiving_log', 'purchase_groups', 'shipments', 'pallets'
    ]) LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_audit_updated_by ON %I', tbl, tbl
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%I_audit_updated_by BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_audit_updated_by()',
            tbl, tbl
        );
    END LOOP;
END;
$$;
