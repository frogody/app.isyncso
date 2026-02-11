-- Phase 3a: Pallet Management enhancements
-- Tables (shipments, pallets, pallet_items) already exist from Phase 0 foundation.
-- This migration adds missing columns, updates constraints, and adds the auto-number trigger.

-- 1. Add missing columns to shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_reference TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_unique_eans INTEGER DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_task_id UUID REFERENCES shipping_tasks(id);

-- 2. Add missing columns to pallets
ALTER TABLE pallets ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;
ALTER TABLE pallets ADD COLUMN IF NOT EXISTS total_unique_eans INTEGER DEFAULT 0;

-- 3. Add missing column to pallet_items
ALTER TABLE pallet_items ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);

-- 4. Update shipments status constraint to include 'finalized' and 'cancelled'
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE shipments ADD CONSTRAINT shipments_status_check
  CHECK (status IN ('draft', 'packing', 'packed', 'finalized', 'shipped', 'delivered', 'verified', 'cancelled'));

-- 5. Auto-generate shipment_code trigger
CREATE OR REPLACE FUNCTION generate_shipment_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(shipment_code FROM 'SHP-[0-9]{8}-([0-9]+)') AS INTEGER)
    ), 0) + 1 INTO next_num FROM shipments WHERE company_id = NEW.company_id;
    NEW.shipment_code := 'SHP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END; $$;

CREATE TRIGGER trg_shipment_code BEFORE INSERT ON shipments
FOR EACH ROW WHEN (NEW.shipment_code IS NULL) EXECUTE FUNCTION generate_shipment_code();

-- 6. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pallets_shipment ON pallets(shipment_id);
CREATE INDEX IF NOT EXISTS idx_pallet_items_pallet ON pallet_items(pallet_id);
CREATE INDEX IF NOT EXISTS idx_pallet_items_product ON pallet_items(product_id);
