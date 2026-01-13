-- Add source_stock_purchase_id column to expenses table
-- This links expenses created from stock purchases for tracking

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_stock_purchase_id UUID REFERENCES stock_purchases(id);

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_expenses_source_stock_purchase_id ON expenses(source_stock_purchase_id) WHERE source_stock_purchase_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN expenses.source_stock_purchase_id IS 'Links to the stock_purchase that created this expense record (for "Send to finance" workflow)';
