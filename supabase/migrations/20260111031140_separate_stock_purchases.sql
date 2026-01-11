-- Migration: Separate Stock Purchases from Business Expenses
-- This creates dedicated tables for supplier invoice processing (stock purchases)
-- while keeping the expenses table exclusively for finance/business expenses

-- ============================================================================
-- 0. Rename existing stock_purchases table (inventory tracking) to stock_inventory_entries
-- ============================================================================
-- The existing stock_purchases table was used for product-level inventory tracking
-- We rename it to avoid conflicts with the new invoice-focused stock_purchases table
ALTER TABLE IF EXISTS public.stock_purchases RENAME TO stock_inventory_entries;

-- ============================================================================
-- 1. Create stock_purchases table (for supplier invoice processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  supplier_id UUID REFERENCES public.suppliers(id),

  -- Invoice identification
  invoice_number VARCHAR(100),
  external_reference VARCHAR(255),
  document_type VARCHAR(50) DEFAULT 'invoice',
  invoice_date DATE,
  payment_due_date DATE,

  -- Document source
  source_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'email', 'upload', 'api'
  source_email_id UUID,
  original_file_url TEXT,

  -- Financials
  subtotal DECIMAL(12,2),
  tax_percent DECIMAL(5,2) DEFAULT 21,
  tax_amount DECIMAL(12,2),
  total DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Payment tracking
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, partial

  -- AI Processing
  ai_extracted_data JSONB,
  ai_confidence DECIMAL(5,4),
  ai_processed_at TIMESTAMPTZ,

  -- Review workflow
  needs_review BOOLEAN DEFAULT false,
  review_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, text_extraction, processing, pending_review, approved, processed, failed

  -- Finance-compatible fields (for backwards compatibility during transition)
  description TEXT,
  amount DECIMAL(12,2),
  date DATE,
  vendor TEXT,
  category TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_stock_purchases_company_id ON public.stock_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_supplier_id ON public.stock_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_status ON public.stock_purchases(status);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_invoice_date ON public.stock_purchases(invoice_date);

-- Enable RLS
ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access their company's stock purchases
CREATE POLICY "Users can access company stock purchases"
  ON public.stock_purchases FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- 2. Create stock_purchase_line_items table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_purchase_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_purchase_id UUID NOT NULL REFERENCES public.stock_purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),

  -- Line item details
  line_number INTEGER,
  description TEXT NOT NULL,
  quantity DECIMAL(12,4) DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'piece',
  unit_price DECIMAL(12,4),

  -- Discounts
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(12,2),

  -- Tax
  tax_percent DECIMAL(5,2),
  tax_amount DECIMAL(12,2),

  -- Total
  line_total DECIMAL(12,2),

  -- Product identifiers
  sku VARCHAR(100),
  ean VARCHAR(13),
  model_number VARCHAR(100),
  brand VARCHAR(100),

  -- Inventory tracking
  is_physical_product BOOLEAN DEFAULT true,
  expected_delivery_id UUID,
  research_status VARCHAR(50) DEFAULT 'pending',

  -- AI confidence
  ai_confidence JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_stock_purchase_line_items_stock_purchase_id
  ON public.stock_purchase_line_items(stock_purchase_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchase_line_items_product_id
  ON public.stock_purchase_line_items(product_id);

-- Enable RLS
ALTER TABLE public.stock_purchase_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access line items for their company's stock purchases
CREATE POLICY "Users can access company line items"
  ON public.stock_purchase_line_items FOR ALL
  USING (stock_purchase_id IN (
    SELECT id FROM public.stock_purchases WHERE company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  ));

-- ============================================================================
-- 3. Create updated_at trigger for stock_purchases
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_stock_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_purchases_updated_at
  BEFORE UPDATE ON public.stock_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_purchases_updated_at();

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================
GRANT ALL ON public.stock_purchases TO authenticated;
GRANT ALL ON public.stock_purchase_line_items TO authenticated;
GRANT ALL ON public.stock_purchases TO service_role;
GRANT ALL ON public.stock_purchase_line_items TO service_role;

-- ============================================================================
-- 5. Migrate existing invoice data from expenses to stock_purchases
-- ============================================================================
-- Migrate expense records that have AI data, email source, or supplier linkage
INSERT INTO public.stock_purchases (
  id, company_id, user_id, supplier_id,
  invoice_number, external_reference, document_type, invoice_date, payment_due_date,
  source_type, source_email_id, original_file_url,
  subtotal, tax_percent, tax_amount, total, currency, payment_status,
  ai_extracted_data, ai_confidence, ai_processed_at,
  needs_review, review_status, reviewed_by, reviewed_at, review_notes,
  status, description, amount, date, vendor, category,
  created_at, updated_at
)
SELECT
  id, company_id, user_id, supplier_id,
  expense_number, external_reference, document_type, invoice_date, payment_due_date,
  source_type, source_email_id, original_file_url,
  subtotal, tax_percent, tax_amount, total, currency, payment_status,
  ai_extracted_data, ai_confidence, ai_processed_at,
  needs_review, review_status, reviewed_by, reviewed_at, review_notes,
  status, description, amount, date, vendor, category,
  created_at, updated_at
FROM public.expenses
WHERE ai_extracted_data IS NOT NULL
   OR source_type IN ('email', 'api')
   OR supplier_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate corresponding line items
INSERT INTO public.stock_purchase_line_items (
  id, stock_purchase_id, product_id, line_number, description,
  quantity, unit, unit_price, discount_percent, discount_amount,
  tax_percent, tax_amount, line_total, sku, ean, model_number, brand,
  is_physical_product, expected_delivery_id, research_status, ai_confidence, created_at
)
SELECT
  eli.id, eli.expense_id, eli.product_id, eli.line_number, eli.description,
  eli.quantity, eli.unit, eli.unit_price, eli.discount_percent, eli.discount_amount,
  eli.tax_percent, eli.tax_amount, eli.line_total, eli.sku, eli.ean, eli.model_number, eli.brand,
  eli.is_physical_product, eli.expected_delivery_id, eli.research_status, eli.ai_confidence, eli.created_at
FROM public.expense_line_items eli
INNER JOIN public.stock_purchases sp ON sp.id = eli.expense_id
ON CONFLICT (id) DO NOTHING;
