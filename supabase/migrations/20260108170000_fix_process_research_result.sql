-- Fix process_research_result function - remove company_id from physical_products insert
-- The physical_products table doesn't have company_id column, only products table has it

CREATE OR REPLACE FUNCTION process_research_result(
  p_queue_id UUID,
  p_ean VARCHAR,
  p_name VARCHAR,
  p_description TEXT,
  p_brand VARCHAR,
  p_category VARCHAR,
  p_images JSONB DEFAULT '[]'::jsonb,
  p_specifications JSONB DEFAULT '[]'::jsonb,
  p_weight DECIMAL DEFAULT NULL,
  p_dimensions JSONB DEFAULT NULL,
  p_source_url VARCHAR DEFAULT NULL,
  p_confidence DECIMAL DEFAULT 0.8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_record RECORD;
  v_existing_product_id UUID;
  v_new_product_id UUID;
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

    -- Update expense line item with product reference (FIX: was missing for matched products)
    UPDATE expense_line_items SET
      product_id = v_existing_product_id,
      research_status = 'completed'
    WHERE id = v_queue_record.expense_line_item_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'matched_existing',
      'product_id', v_existing_product_id
    );
  ELSE
    -- Create new product
    INSERT INTO products (
      company_id, name, description, type, category, status, slug, ean, is_physical
    ) VALUES (
      v_queue_record.company_id,
      COALESCE(p_name, v_queue_record.product_description),
      p_description,
      'physical',
      p_category,
      'draft',
      lower(regexp_replace(COALESCE(p_name, v_queue_record.product_description), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
      p_ean,
      true
    ) RETURNING id INTO v_new_product_id;

    -- Create physical product details (NO company_id - that column doesn't exist on physical_products)
    INSERT INTO physical_products (
      product_id, barcode,
      inventory, shipping, specifications, pricing
    ) VALUES (
      v_new_product_id,
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

    -- Link supplier to product (use ON CONFLICT to handle duplicates)
    IF v_queue_record.supplier_id IS NOT NULL THEN
      INSERT INTO product_suppliers (company_id, product_id, supplier_id, last_purchase_price, last_purchase_date, is_preferred)
      VALUES (v_queue_record.company_id, v_new_product_id, v_queue_record.supplier_id, v_queue_record.unit_price, v_queue_record.purchase_date, true)
      ON CONFLICT (product_id, supplier_id) DO UPDATE SET
        last_purchase_price = EXCLUDED.last_purchase_price,
        last_purchase_date = EXCLUDED.last_purchase_date,
        is_preferred = true,
        updated_at = NOW();
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
$$;
