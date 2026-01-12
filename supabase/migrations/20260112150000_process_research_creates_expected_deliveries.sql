-- Fix: Create expected_deliveries when process_research_result links a product
-- The approval trigger fires BEFORE products exist, so we need to create expected_deliveries
-- when the research completes and links the product to the line item

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
  p_confidence DECIMAL DEFAULT 0.8,
  p_tagline VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_record RECORD;
  v_existing_product_id UUID;
  v_new_product_id UUID;
  v_result JSONB;
  v_featured_image JSONB;
  v_gallery JSONB;
  v_stock_purchase RECORD;
  v_line_item RECORD;
  v_delivery_id UUID;
  v_expected_date DATE;
  v_final_product_id UUID;
BEGIN
  -- Get queue record
  SELECT * INTO v_queue_record FROM product_research_queue WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue record not found');
  END IF;

  -- Extract featured image (first image as JSONB string) and gallery (all images)
  v_featured_image := NULL;
  v_gallery := '[]'::jsonb;

  IF p_images IS NOT NULL AND jsonb_array_length(p_images) > 0 THEN
    v_featured_image := to_jsonb(p_images->>0);
    v_gallery := p_images;
  END IF;

  -- Check if product already exists by EAN OR by matched_product_id (from import)
  IF v_queue_record.matched_product_id IS NOT NULL THEN
    -- Product was pre-created by import - use that ID
    v_existing_product_id := v_queue_record.matched_product_id;
  ELSIF p_ean IS NOT NULL THEN
    -- Look up by barcode in physical_products
    SELECT pp.product_id INTO v_existing_product_id
    FROM physical_products pp
    WHERE pp.barcode = p_ean
    AND pp.product_id IN (SELECT id FROM products WHERE company_id = v_queue_record.company_id);
  END IF;

  IF v_existing_product_id IS NOT NULL THEN
    -- Product exists - update with enrichment data
    UPDATE products SET
      description = COALESCE(description, p_description),
      featured_image = COALESCE(featured_image, v_featured_image),
      gallery = CASE WHEN gallery IS NULL OR gallery = '[]'::jsonb THEN v_gallery ELSE gallery END,
      tagline = COALESCE(tagline, p_tagline),
      category = COALESCE(category, p_category),
      updated_at = NOW()
    WHERE id = v_existing_product_id;

    -- Update physical_products specifications if we have them
    IF p_specifications IS NOT NULL AND jsonb_array_length(p_specifications) > 0 THEN
      UPDATE physical_products SET
        specifications = CASE WHEN specifications IS NULL OR specifications = '[]'::jsonb
          THEN p_specifications ELSE specifications END
      WHERE product_id = v_existing_product_id;
    END IF;

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
      matched_product_id = v_existing_product_id,
      action_taken = 'matched_existing',
      research_confidence = p_confidence,
      updated_at = NOW()
    WHERE id = p_queue_id;

    -- Link supplier to product if not already linked
    IF v_queue_record.supplier_id IS NOT NULL THEN
      INSERT INTO product_suppliers (company_id, product_id, supplier_id, last_purchase_price, last_purchase_date)
      VALUES (v_queue_record.company_id, v_existing_product_id, v_queue_record.supplier_id, v_queue_record.unit_price, v_queue_record.purchase_date)
      ON CONFLICT (product_id, supplier_id) DO UPDATE SET
        last_purchase_price = EXCLUDED.last_purchase_price,
        last_purchase_date = EXCLUDED.last_purchase_date,
        updated_at = NOW();
    END IF;

    -- Update stock_purchase_line_items with product reference (new schema)
    IF v_queue_record.expense_line_item_id IS NOT NULL THEN
      UPDATE stock_purchase_line_items SET
        product_id = v_existing_product_id,
        research_status = 'completed'
      WHERE id = v_queue_record.expense_line_item_id;
    END IF;

    v_final_product_id := v_existing_product_id;

  ELSE
    -- Create new product WITH tagline, featured_image, and gallery
    INSERT INTO products (
      company_id, name, description, tagline, type, category, status, slug, ean, is_physical,
      featured_image, gallery
    ) VALUES (
      v_queue_record.company_id,
      COALESCE(p_name, v_queue_record.product_description),
      p_description,
      p_tagline,
      'physical',
      p_category,
      'draft',
      lower(regexp_replace(COALESCE(p_name, v_queue_record.product_description), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
      p_ean,
      true,
      v_featured_image,
      v_gallery
    ) RETURNING id INTO v_new_product_id;

    -- Create physical product details
    INSERT INTO physical_products (
      product_id, barcode,
      inventory, shipping, specifications, pricing
    ) VALUES (
      v_new_product_id,
      p_ean,
      jsonb_build_object('quantity', COALESCE(v_queue_record.quantity, 0), 'track_inventory', true),
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

    -- Link supplier to product
    IF v_queue_record.supplier_id IS NOT NULL THEN
      INSERT INTO product_suppliers (company_id, product_id, supplier_id, last_purchase_price, last_purchase_date, is_preferred)
      VALUES (v_queue_record.company_id, v_new_product_id, v_queue_record.supplier_id, v_queue_record.unit_price, v_queue_record.purchase_date, true)
      ON CONFLICT (product_id, supplier_id) DO UPDATE SET
        last_purchase_price = EXCLUDED.last_purchase_price,
        last_purchase_date = EXCLUDED.last_purchase_date,
        is_preferred = true,
        updated_at = NOW();
    END IF;

    -- Update stock_purchase_line_items with product reference (new schema)
    IF v_queue_record.expense_line_item_id IS NOT NULL THEN
      UPDATE stock_purchase_line_items SET
        product_id = v_new_product_id,
        research_status = 'completed'
      WHERE id = v_queue_record.expense_line_item_id;
    END IF;

    v_final_product_id := v_new_product_id;
  END IF;

  -- ============================================================
  -- CREATE EXPECTED DELIVERY AND UPDATE INCOMING INVENTORY
  -- This runs AFTER the product is created/matched, since the
  -- approval trigger fires before products exist
  -- ============================================================
  IF v_queue_record.expense_line_item_id IS NOT NULL AND v_final_product_id IS NOT NULL THEN
    -- Get the line item and stock purchase details
    SELECT spli.*, sp.company_id, sp.supplier_id, sp.payment_due_date, sp.status as purchase_status
    INTO v_line_item
    FROM stock_purchase_line_items spli
    JOIN stock_purchases sp ON sp.id = spli.stock_purchase_id
    WHERE spli.id = v_queue_record.expense_line_item_id;

    -- Only create expected_delivery if stock_purchase is approved and no delivery exists yet
    IF v_line_item IS NOT NULL
       AND v_line_item.purchase_status = 'approved'
       AND v_line_item.expected_delivery_id IS NULL THEN

      v_expected_date := COALESCE(v_line_item.payment_due_date, CURRENT_DATE + INTERVAL '7 days');

      -- Create expected delivery record
      INSERT INTO expected_deliveries (
        company_id,
        expense_id,
        expense_line_item_id,
        supplier_id,
        product_id,
        quantity_expected,
        quantity_received,
        expected_date,
        status
      ) VALUES (
        v_line_item.company_id,
        v_line_item.stock_purchase_id,
        v_line_item.id,
        v_line_item.supplier_id,
        v_final_product_id,
        COALESCE(v_line_item.quantity::integer, 1),
        0,
        v_expected_date,
        'pending'
      )
      RETURNING id INTO v_delivery_id;

      -- Link the line item to the expected delivery
      UPDATE stock_purchase_line_items
      SET expected_delivery_id = v_delivery_id
      WHERE id = v_line_item.id;

      -- Update or create inventory record with incoming quantity
      INSERT INTO inventory (
        company_id,
        product_id,
        quantity_on_hand,
        quantity_reserved,
        quantity_incoming,
        last_purchase_cost
      ) VALUES (
        v_line_item.company_id,
        v_final_product_id,
        0,
        0,
        COALESCE(v_line_item.quantity::integer, 1),
        v_line_item.unit_price
      )
      ON CONFLICT (company_id, product_id) DO UPDATE SET
        quantity_incoming = COALESCE(inventory.quantity_incoming, 0) + COALESCE(v_line_item.quantity::integer, 1),
        last_purchase_cost = COALESCE(v_line_item.unit_price, inventory.last_purchase_cost),
        updated_at = NOW();
    END IF;
  END IF;

  IF v_existing_product_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'matched_existing',
      'product_id', v_existing_product_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'action', 'created_new',
      'product_id', v_new_product_id
    );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_research_result TO authenticated;
GRANT EXECUTE ON FUNCTION process_research_result TO service_role;

-- Also backfill: Create expected_deliveries for approved stock_purchases
-- where line items have product_id but no expected_delivery_id
DO $$
DECLARE
  v_line RECORD;
  v_expected_date DATE;
  v_delivery_id UUID;
BEGIN
  FOR v_line IN
    SELECT
      spli.id as line_item_id,
      spli.product_id,
      spli.quantity,
      spli.unit_price,
      sp.id as stock_purchase_id,
      sp.company_id,
      sp.supplier_id,
      sp.payment_due_date
    FROM stock_purchase_line_items spli
    JOIN stock_purchases sp ON sp.id = spli.stock_purchase_id
    WHERE sp.status = 'approved'
      AND spli.product_id IS NOT NULL
      AND spli.expected_delivery_id IS NULL
  LOOP
    v_expected_date := COALESCE(v_line.payment_due_date, CURRENT_DATE + INTERVAL '7 days');

    -- Create expected delivery
    INSERT INTO expected_deliveries (
      company_id, expense_id, expense_line_item_id, supplier_id, product_id,
      quantity_expected, quantity_received, expected_date, status
    ) VALUES (
      v_line.company_id, v_line.stock_purchase_id, v_line.line_item_id,
      v_line.supplier_id, v_line.product_id,
      COALESCE(v_line.quantity::integer, 1), 0, v_expected_date, 'pending'
    )
    RETURNING id INTO v_delivery_id;

    -- Link line item
    UPDATE stock_purchase_line_items
    SET expected_delivery_id = v_delivery_id
    WHERE id = v_line.line_item_id;

    -- Update inventory incoming
    INSERT INTO inventory (company_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, last_purchase_cost)
    VALUES (v_line.company_id, v_line.product_id, 0, 0, COALESCE(v_line.quantity::integer, 1), v_line.unit_price)
    ON CONFLICT (company_id, product_id) DO UPDATE SET
      quantity_incoming = COALESCE(inventory.quantity_incoming, 0) + COALESCE(v_line.quantity::integer, 1),
      last_purchase_cost = COALESCE(v_line.unit_price, inventory.last_purchase_cost),
      updated_at = NOW();
  END LOOP;
END $$;
