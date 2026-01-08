-- Fix process_research_result to handle import-sourced queue items
-- Import already creates stock_purchase, so skip creating when quantity/unit_price are NULL

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
AS $$
DECLARE
  v_queue_record RECORD;
  v_existing_product_id UUID;
  v_new_product_id UUID;
  v_result JSONB;
  v_featured_image JSONB;
  v_gallery JSONB;
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
    -- Look up by barcode
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

    -- Only create stock purchase if we have quantity and unit_price (not from import)
    IF v_queue_record.quantity IS NOT NULL AND v_queue_record.unit_price IS NOT NULL THEN
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
      IF v_queue_record.supplier_id IS NOT NULL THEN
        INSERT INTO product_suppliers (company_id, product_id, supplier_id, last_purchase_price, last_purchase_date)
        VALUES (v_queue_record.company_id, v_existing_product_id, v_queue_record.supplier_id, v_queue_record.unit_price, v_queue_record.purchase_date)
        ON CONFLICT (product_id, supplier_id) DO UPDATE SET
          last_purchase_price = EXCLUDED.last_purchase_price,
          last_purchase_date = EXCLUDED.last_purchase_date,
          updated_at = NOW();
      END IF;
    END IF;

    -- Update expense line item with product reference (only if from invoice)
    IF v_queue_record.expense_line_item_id IS NOT NULL THEN
      UPDATE expense_line_items SET
        product_id = v_existing_product_id,
        research_status = 'completed'
      WHERE id = v_queue_record.expense_line_item_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'matched_existing',
      'product_id', v_existing_product_id
    );
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

    -- Create stock purchase only if we have quantity and unit_price
    IF v_queue_record.quantity IS NOT NULL AND v_queue_record.unit_price IS NOT NULL THEN
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
    END IF;

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

    -- Update expense line item with product reference (only if from invoice)
    IF v_queue_record.expense_line_item_id IS NOT NULL THEN
      UPDATE expense_line_items SET
        product_id = v_new_product_id,
        research_status = 'completed'
      WHERE id = v_queue_record.expense_line_item_id;
    END IF;

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
