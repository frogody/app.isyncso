-- Product Research System
-- Automatically research and create products from invoice line items

-- =============================================================================
-- PRODUCT RESEARCH QUEUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_research_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Source tracking
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  expense_line_item_id UUID REFERENCES public.expense_line_items(id) ON DELETE SET NULL,

  -- Input data from invoice
  product_description TEXT NOT NULL,
  model_number VARCHAR(100),
  supplier_name VARCHAR(255),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  extracted_ean VARCHAR(20),
  quantity DECIMAL(12,4),
  unit_price DECIMAL(12,4),
  currency VARCHAR(3) DEFAULT 'EUR',
  purchase_date DATE,
  invoice_number VARCHAR(100),

  -- Research status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'completed', 'failed', 'manual_review')),
  research_attempts INTEGER DEFAULT 0,
  last_research_at TIMESTAMPTZ,
  error_message TEXT,

  -- Research results (before creating product)
  researched_ean VARCHAR(20),
  researched_name VARCHAR(500),
  researched_description TEXT,
  researched_brand VARCHAR(100),
  researched_category VARCHAR(100),
  researched_images JSONB DEFAULT '[]'::jsonb,
  researched_specifications JSONB DEFAULT '[]'::jsonb,
  researched_weight DECIMAL(10,3),
  researched_dimensions JSONB,
  researched_source_url TEXT,
  research_confidence DECIMAL(3,2),

  -- Result tracking
  matched_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  action_taken VARCHAR(20) CHECK (action_taken IN ('matched_existing', 'created_new', 'skipped', 'manual')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_product_research_queue_company ON public.product_research_queue(company_id);
CREATE INDEX idx_product_research_queue_status ON public.product_research_queue(status);
CREATE INDEX idx_product_research_queue_expense ON public.product_research_queue(expense_id);
CREATE INDEX idx_product_research_queue_pending ON public.product_research_queue(status, created_at)
  WHERE status = 'pending';

-- RLS policies
ALTER TABLE public.product_research_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view research queue for their company"
ON public.product_research_queue FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage research queue for their company"
ON public.product_research_queue FOR ALL
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================================================
-- ADD MODEL NUMBER TO EXPENSE LINE ITEMS
-- =============================================================================

ALTER TABLE public.expense_line_items
ADD COLUMN IF NOT EXISTS model_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS research_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- =============================================================================
-- FUNCTION: Process research queue item
-- =============================================================================

CREATE OR REPLACE FUNCTION process_research_result(
  p_queue_id UUID,
  p_ean VARCHAR(20),
  p_name VARCHAR(500),
  p_description TEXT,
  p_brand VARCHAR(100),
  p_category VARCHAR(100),
  p_images JSONB,
  p_specifications JSONB,
  p_weight DECIMAL(10,3),
  p_dimensions JSONB,
  p_source_url TEXT,
  p_confidence DECIMAL(3,2)
) RETURNS JSONB AS $$
DECLARE
  v_queue_record RECORD;
  v_existing_product_id UUID;
  v_new_product_id UUID;
  v_physical_product_id UUID;
  v_result JSONB;
BEGIN
  -- Get queue record
  SELECT * INTO v_queue_record FROM product_research_queue WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue record not found');
  END IF;

  -- Check if product already exists by EAN
  IF p_ean IS NOT NULL THEN
    SELECT pp.product_id INTO v_existing_product_id
    FROM physical_products pp
    WHERE pp.barcode = p_ean
    AND pp.product_id IN (SELECT id FROM products WHERE company_id = v_queue_record.company_id);
  END IF;

  IF v_existing_product_id IS NOT NULL THEN
    -- Product exists - just create stock purchase and link supplier
    UPDATE product_research_queue SET
      status = 'completed',
      researched_ean = p_ean,
      researched_name = p_name,
      matched_product_id = v_existing_product_id,
      action_taken = 'matched_existing',
      research_confidence = p_confidence,
      updated_at = NOW()
    WHERE id = p_queue_id;

    -- Create stock purchase
    INSERT INTO stock_purchases (
      company_id, product_id, supplier_id, expense_id, expense_line_item_id,
      quantity, unit_price, currency, purchase_date, invoice_number, ean, source_type
    ) VALUES (
      v_queue_record.company_id,
      v_existing_product_id,
      v_queue_record.supplier_id,
      v_queue_record.expense_id,
      v_queue_record.expense_line_item_id,
      v_queue_record.quantity,
      v_queue_record.unit_price,
      v_queue_record.currency,
      v_queue_record.purchase_date,
      v_queue_record.invoice_number,
      p_ean,
      'invoice'
    );

    -- Link supplier to product if not already linked
    INSERT INTO product_suppliers (company_id, product_id, supplier_id, last_purchase_price, last_purchase_date)
    VALUES (v_queue_record.company_id, v_existing_product_id, v_queue_record.supplier_id, v_queue_record.unit_price, v_queue_record.purchase_date)
    ON CONFLICT (product_id, supplier_id) DO UPDATE SET
      last_purchase_price = EXCLUDED.last_purchase_price,
      last_purchase_date = EXCLUDED.last_purchase_date,
      updated_at = NOW();

    RETURN jsonb_build_object(
      'success', true,
      'action', 'matched_existing',
      'product_id', v_existing_product_id
    );
  ELSE
    -- Create new product
    INSERT INTO products (
      company_id, name, description, type, category, status, slug
    ) VALUES (
      v_queue_record.company_id,
      COALESCE(p_name, v_queue_record.product_description),
      p_description,
      'physical',
      p_category,
      'draft',
      lower(regexp_replace(COALESCE(p_name, v_queue_record.product_description), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8)
    ) RETURNING id INTO v_new_product_id;

    -- Create physical product details
    INSERT INTO physical_products (
      product_id, company_id, barcode,
      inventory, shipping, specifications, pricing
    ) VALUES (
      v_new_product_id,
      v_queue_record.company_id,
      p_ean,
      jsonb_build_object('quantity', v_queue_record.quantity, 'track_inventory', true),
      CASE WHEN p_weight IS NOT NULL OR p_dimensions IS NOT NULL THEN
        jsonb_build_object('weight', p_weight, 'dimensions', p_dimensions)
      ELSE '{}'::jsonb END,
      COALESCE(p_specifications, '[]'::jsonb),
      jsonb_build_object('base_price', v_queue_record.unit_price, 'cost_price', v_queue_record.unit_price, 'currency', v_queue_record.currency)
    );

    -- Update queue record
    UPDATE product_research_queue SET
      status = 'completed',
      researched_ean = p_ean,
      researched_name = p_name,
      researched_description = p_description,
      researched_brand = p_brand,
      researched_category = p_category,
      researched_images = p_images,
      researched_specifications = p_specifications,
      researched_weight = p_weight,
      researched_dimensions = p_dimensions,
      researched_source_url = p_source_url,
      research_confidence = p_confidence,
      created_product_id = v_new_product_id,
      action_taken = 'created_new',
      updated_at = NOW()
    WHERE id = p_queue_id;

    -- Create stock purchase
    INSERT INTO stock_purchases (
      company_id, product_id, supplier_id, expense_id, expense_line_item_id,
      quantity, unit_price, currency, purchase_date, invoice_number, ean, source_type
    ) VALUES (
      v_queue_record.company_id,
      v_new_product_id,
      v_queue_record.supplier_id,
      v_queue_record.expense_id,
      v_queue_record.expense_line_item_id,
      v_queue_record.quantity,
      v_queue_record.unit_price,
      v_queue_record.currency,
      v_queue_record.purchase_date,
      v_queue_record.invoice_number,
      p_ean,
      'invoice'
    );

    -- Link supplier to product
    IF v_queue_record.supplier_id IS NOT NULL THEN
      INSERT INTO product_suppliers (company_id, product_id, supplier_id, last_purchase_price, last_purchase_date, is_preferred)
      VALUES (v_queue_record.company_id, v_new_product_id, v_queue_record.supplier_id, v_queue_record.unit_price, v_queue_record.purchase_date, true);
    END IF;

    -- Update expense line item with product reference
    UPDATE expense_line_items SET
      product_id = v_new_product_id,
      research_status = 'completed'
    WHERE id = v_queue_record.expense_line_item_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'created_new',
      'product_id', v_new_product_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: Update timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_research_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_research_queue_timestamp
BEFORE UPDATE ON public.product_research_queue
FOR EACH ROW
EXECUTE FUNCTION update_research_queue_timestamp();

-- Grant execute on function
GRANT EXECUTE ON FUNCTION process_research_result TO authenticated;
GRANT EXECUTE ON FUNCTION process_research_result TO service_role;
