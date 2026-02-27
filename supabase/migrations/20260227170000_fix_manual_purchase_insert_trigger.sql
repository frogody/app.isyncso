-- Fix: create_expected_deliveries_on_insert() was broken because it called
-- PERFORM create_expected_deliveries_on_approval(), which is a TRIGGER function
-- that expects NEW/OLD context variables. You cannot call a trigger function
-- via PERFORM. This migration inlines the delivery creation logic directly.

-- 1. Drop the broken insert trigger
DROP TRIGGER IF EXISTS trigger_create_expected_deliveries_on_insert ON stock_purchases;

-- 2. Replace the broken function with inlined logic
CREATE OR REPLACE FUNCTION create_expected_deliveries_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_item RECORD;
  v_expected_date DATE;
  v_delivery_id UUID;
BEGIN
  -- Only run when inserted with status = 'approved'
  IF NEW.status = 'approved' THEN
    -- Default expected date is 7 days from now if not specified
    v_expected_date := COALESCE(NEW.payment_due_date, CURRENT_DATE + INTERVAL '7 days');

    -- Create expected deliveries for each line item with a product
    FOR v_line_item IN
      SELECT
        spli.id as line_item_id,
        spli.product_id,
        spli.quantity,
        spli.unit_price,
        spli.expected_delivery_id
      FROM stock_purchase_line_items spli
      WHERE spli.stock_purchase_id = NEW.id
        AND spli.product_id IS NOT NULL
        AND spli.expected_delivery_id IS NULL
    LOOP
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
        NEW.company_id,
        NEW.id,
        v_line_item.line_item_id,
        NEW.supplier_id,
        v_line_item.product_id,
        COALESCE(v_line_item.quantity::integer, 1),
        0,
        v_expected_date,
        'pending'
      )
      RETURNING id INTO v_delivery_id;

      -- Link the line item to the expected delivery
      UPDATE stock_purchase_line_items
      SET expected_delivery_id = v_delivery_id
      WHERE id = v_line_item.line_item_id;

      -- Update or create inventory record with incoming quantity
      INSERT INTO inventory (
        company_id,
        product_id,
        quantity_on_hand,
        quantity_reserved,
        quantity_incoming,
        last_purchase_cost
      ) VALUES (
        NEW.company_id,
        v_line_item.product_id,
        0,
        0,
        COALESCE(v_line_item.quantity::integer, 1),
        v_line_item.unit_price
      )
      ON CONFLICT (company_id, product_id) DO UPDATE SET
        quantity_incoming = COALESCE(inventory.quantity_incoming, 0) + COALESCE(v_line_item.quantity::integer, 1),
        last_purchase_cost = COALESCE(v_line_item.unit_price, inventory.last_purchase_cost),
        updated_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Re-create the insert trigger
CREATE TRIGGER trigger_create_expected_deliveries_on_insert
  AFTER INSERT ON stock_purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_expected_deliveries_on_insert();
