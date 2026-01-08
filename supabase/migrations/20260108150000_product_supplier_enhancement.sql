-- Product Supplier Enhancement Migration
-- Adds support for multiple suppliers per product and purchase history tracking

-- ============================================================================
-- 1. Make SKU nullable (EAN becomes primary identifier)
-- ============================================================================
ALTER TABLE public.physical_products ALTER COLUMN sku DROP NOT NULL;

-- ============================================================================
-- 2. Create product_suppliers junction table (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,

  -- Supplier-specific info
  supplier_sku VARCHAR(100),            -- Supplier's product code
  supplier_ean VARCHAR(20),             -- Supplier's EAN if different

  -- Pricing reference (auto-updated from purchases)
  last_purchase_price DECIMAL(12,4),    -- Most recent price
  last_purchase_date DATE,              -- When last purchased
  average_purchase_price DECIMAL(12,4), -- Weighted average

  -- Relationship config
  is_preferred BOOLEAN DEFAULT false,   -- Primary supplier
  is_active BOOLEAN DEFAULT true,       -- Currently ordering from
  lead_time_days INTEGER DEFAULT 7,
  min_order_quantity INTEGER DEFAULT 1,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, supplier_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_suppliers_company ON public.product_suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON public.product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON public.product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_preferred ON public.product_suppliers(product_id) WHERE is_preferred = true;

-- ============================================================================
-- 3. Create stock_purchases table (purchase history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,

  -- Link to invoice if from expense processing
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  expense_line_item_id UUID REFERENCES public.expense_line_items(id) ON DELETE SET NULL,

  -- Purchase details (EXACT batch pricing for profit/loss calculations)
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,      -- Price per piece at purchase
  total_amount DECIMAL(12,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Dates
  purchase_date DATE NOT NULL,            -- Invoice/order date
  received_date DATE,                     -- When stock arrived

  -- Reference info
  invoice_number VARCHAR(100),
  batch_reference VARCHAR(100),           -- Internal batch tracking
  ean VARCHAR(20),                        -- EAN at time of purchase

  -- Source tracking
  source_type VARCHAR(20) DEFAULT 'invoice' CHECK (source_type IN ('invoice', 'manual', 'adjustment')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT non_negative_price CHECK (unit_price >= 0)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_stock_purchases_company ON public.stock_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_product ON public.stock_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_supplier ON public.stock_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_date ON public.stock_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_expense ON public.stock_purchases(expense_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_ean ON public.stock_purchases(ean);

-- ============================================================================
-- 4. Enable RLS and create policies
-- ============================================================================

-- product_suppliers RLS
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage product suppliers for their company"
ON public.product_suppliers FOR ALL
USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- stock_purchases RLS
ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage stock purchases for their company"
ON public.stock_purchases FOR ALL
USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- 5. Trigger to auto-update product_suppliers pricing from purchases
-- ============================================================================
CREATE OR REPLACE FUNCTION update_product_supplier_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if we have both product and supplier
  IF NEW.product_id IS NULL OR NEW.supplier_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update or create product_supplier record with latest pricing
  INSERT INTO public.product_suppliers (
    company_id,
    product_id,
    supplier_id,
    last_purchase_price,
    last_purchase_date
  )
  VALUES (
    NEW.company_id,
    NEW.product_id,
    NEW.supplier_id,
    NEW.unit_price,
    NEW.purchase_date
  )
  ON CONFLICT (product_id, supplier_id) DO UPDATE SET
    last_purchase_price = EXCLUDED.last_purchase_price,
    last_purchase_date = EXCLUDED.last_purchase_date,
    updated_at = NOW()
  WHERE EXCLUDED.last_purchase_date >= COALESCE(product_suppliers.last_purchase_date, '1900-01-01');

  -- Update average purchase price
  UPDATE public.product_suppliers ps
  SET average_purchase_price = (
    SELECT AVG(unit_price)
    FROM public.stock_purchases sp
    WHERE sp.product_id = NEW.product_id
      AND sp.supplier_id = NEW.supplier_id
  )
  WHERE ps.product_id = NEW.product_id
    AND ps.supplier_id = NEW.supplier_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_supplier_pricing ON public.stock_purchases;

CREATE TRIGGER trigger_update_product_supplier_pricing
AFTER INSERT ON public.stock_purchases
FOR EACH ROW
EXECUTE FUNCTION update_product_supplier_pricing();

-- ============================================================================
-- 6. Helper function to ensure only one preferred supplier per product
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_single_preferred_supplier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_preferred = true THEN
    -- Unset preferred on other suppliers for this product
    UPDATE public.product_suppliers
    SET is_preferred = false, updated_at = NOW()
    WHERE product_id = NEW.product_id
      AND id != NEW.id
      AND is_preferred = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_preferred_supplier ON public.product_suppliers;

CREATE TRIGGER trigger_ensure_single_preferred_supplier
BEFORE INSERT OR UPDATE OF is_preferred ON public.product_suppliers
FOR EACH ROW
WHEN (NEW.is_preferred = true)
EXECUTE FUNCTION ensure_single_preferred_supplier();

-- ============================================================================
-- 7. Migrate existing supplier relationships from physical_products
-- ============================================================================
INSERT INTO public.product_suppliers (company_id, product_id, supplier_id, is_preferred)
SELECT
  p.company_id,
  pp.product_id,
  pp.supplier_id,
  true  -- Mark existing relationships as preferred
FROM public.physical_products pp
JOIN public.products p ON pp.product_id = p.id
WHERE pp.supplier_id IS NOT NULL
ON CONFLICT (product_id, supplier_id) DO NOTHING;
