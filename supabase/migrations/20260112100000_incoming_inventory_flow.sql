-- Incoming Inventory Flow
-- When stock purchases are approved, create expected deliveries and track incoming inventory

-- 1. Fix FK on expected_deliveries to reference stock_purchases
ALTER TABLE expected_deliveries
  DROP CONSTRAINT IF EXISTS expected_deliveries_expense_id_fkey;

ALTER TABLE expected_deliveries
  ADD CONSTRAINT expected_deliveries_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES stock_purchases(id) ON DELETE SET NULL;

-- No FK on expense_line_item_id, that's fine since it references stock_purchase_line_items now

-- 2. Create function to handle approved stock purchases
CREATE OR REPLACE FUNCTION create_expected_deliveries_on_approval()
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
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
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
        AND spli.expected_delivery_id IS NULL  -- Don't create if already exists
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

-- 3. Create trigger on stock_purchases
DROP TRIGGER IF EXISTS trigger_create_expected_deliveries ON stock_purchases;
CREATE TRIGGER trigger_create_expected_deliveries
  AFTER UPDATE OF status ON stock_purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_expected_deliveries_on_approval();

-- 4. Also trigger on INSERT if status is already approved (e.g., auto-approved invoices)
CREATE OR REPLACE FUNCTION create_expected_deliveries_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    -- Call the same logic as update trigger
    PERFORM create_expected_deliveries_on_approval();
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Update the receiving trigger to also decrement quantity_incoming
CREATE OR REPLACE FUNCTION update_inventory_on_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery RECORD;
  v_remaining INTEGER;
BEGIN
  -- Get the expected delivery record
  SELECT * INTO v_delivery
  FROM expected_deliveries
  WHERE id = NEW.expected_delivery_id;

  IF FOUND THEN
    -- Update expected_deliveries with received quantity
    UPDATE expected_deliveries
    SET
      quantity_received = COALESCE(quantity_received, 0) + NEW.quantity_received,
      status = CASE
        WHEN COALESCE(quantity_received, 0) + NEW.quantity_received >= quantity_expected THEN 'complete'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE id = NEW.expected_delivery_id;

    -- Update inventory: increase on_hand, decrease incoming
    INSERT INTO inventory (
      company_id,
      product_id,
      quantity_on_hand,
      quantity_reserved,
      quantity_incoming,
      last_received_at
    ) VALUES (
      NEW.company_id,
      v_delivery.product_id,
      NEW.quantity_received,
      0,
      -NEW.quantity_received,  -- Will be adjusted on conflict
      NOW()
    )
    ON CONFLICT (company_id, product_id) DO UPDATE SET
      quantity_on_hand = COALESCE(inventory.quantity_on_hand, 0) + NEW.quantity_received,
      quantity_incoming = GREATEST(0, COALESCE(inventory.quantity_incoming, 0) - NEW.quantity_received),
      last_received_at = NOW(),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Create unique constraint on inventory if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_company_product_unique'
  ) THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_company_product_unique
      UNIQUE (company_id, product_id);
  END IF;
END $$;

-- 7. Process existing approved stock purchases that don't have expected deliveries
DO $$
DECLARE
  v_purchase RECORD;
  v_line_item RECORD;
  v_expected_date DATE;
  v_delivery_id UUID;
BEGIN
  FOR v_purchase IN
    SELECT sp.*
    FROM stock_purchases sp
    WHERE sp.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM expected_deliveries ed WHERE ed.expense_id = sp.id
      )
  LOOP
    v_expected_date := COALESCE(v_purchase.payment_due_date, CURRENT_DATE + INTERVAL '7 days');

    FOR v_line_item IN
      SELECT
        spli.id as line_item_id,
        spli.product_id,
        spli.quantity,
        spli.unit_price
      FROM stock_purchase_line_items spli
      WHERE spli.stock_purchase_id = v_purchase.id
        AND spli.product_id IS NOT NULL
        AND spli.expected_delivery_id IS NULL
    LOOP
      INSERT INTO expected_deliveries (
        company_id, expense_id, expense_line_item_id, supplier_id, product_id,
        quantity_expected, quantity_received, expected_date, status
      ) VALUES (
        v_purchase.company_id, v_purchase.id, v_line_item.line_item_id,
        v_purchase.supplier_id, v_line_item.product_id,
        COALESCE(v_line_item.quantity::integer, 1), 0, v_expected_date, 'pending'
      )
      RETURNING id INTO v_delivery_id;

      UPDATE stock_purchase_line_items
      SET expected_delivery_id = v_delivery_id
      WHERE id = v_line_item.line_item_id;

      INSERT INTO inventory (company_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, last_purchase_cost)
      VALUES (v_purchase.company_id, v_line_item.product_id, 0, 0, COALESCE(v_line_item.quantity::integer, 1), v_line_item.unit_price)
      ON CONFLICT (company_id, product_id) DO UPDATE SET
        quantity_incoming = COALESCE(inventory.quantity_incoming, 0) + COALESCE(v_line_item.quantity::integer, 1),
        last_purchase_cost = COALESCE(v_line_item.unit_price, inventory.last_purchase_cost),
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_expected_deliveries_on_approval TO authenticated;
GRANT EXECUTE ON FUNCTION create_expected_deliveries_on_approval TO service_role;
GRANT EXECUTE ON FUNCTION update_inventory_on_receive TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_on_receive TO service_role;
