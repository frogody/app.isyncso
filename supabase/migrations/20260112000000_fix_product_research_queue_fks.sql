-- Fix product_research_queue foreign keys to reference stock_purchases tables
-- Previously referenced expenses/expense_line_items tables which caused FK violations
-- when processing invoices via the new stock_purchases system

-- Drop old constraints pointing to expenses tables
ALTER TABLE product_research_queue
  DROP CONSTRAINT IF EXISTS product_research_queue_expense_id_fkey;

ALTER TABLE product_research_queue
  DROP CONSTRAINT IF EXISTS product_research_queue_expense_line_item_id_fkey;

-- Add new constraints pointing to stock_purchases tables
ALTER TABLE product_research_queue
  ADD CONSTRAINT product_research_queue_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES stock_purchases(id) ON DELETE SET NULL;

ALTER TABLE product_research_queue
  ADD CONSTRAINT product_research_queue_expense_line_item_id_fkey
  FOREIGN KEY (expense_line_item_id) REFERENCES stock_purchase_line_items(id) ON DELETE SET NULL;
