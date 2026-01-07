-- ============================================================================
-- Inventory Management System Database Schema
-- Version: 1.0.0
-- Description: Complete IMS with Purchase, Receiving, Sales, and Tracking flows
-- ============================================================================

-- ============================================================================
-- 1. CUSTOMER TABLE (with guardrails configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'NL',

  -- Business identifiers
  kvk_number VARCHAR(20),
  btw_number VARCHAR(30),
  iban VARCHAR(50),

  -- Payment guardrails (KRITIEK voor betaaldatum berekening)
  payment_days_after_delivery INTEGER DEFAULT 30, -- Betaaltermijn na levering
  credit_limit DECIMAL(12,2) DEFAULT 0, -- Max openstaand bedrag

  -- Tracking guardrails
  tracking_alert_days INTEGER DEFAULT 14, -- Escalatie na X dagen
  auto_send_tracking BOOLEAN DEFAULT true, -- Automatisch T&T sturen

  -- Contact person
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, blocked
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_customers_company ON public.customers(company_id);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_status ON public.customers(status);

-- ============================================================================
-- 2. EXTEND EXISTING SUPPLIERS TABLE (or create if not exists)
-- ============================================================================

-- Check if suppliers table exists and add inventory-specific columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'default_lead_time_days') THEN
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS default_lead_time_days INTEGER DEFAULT 7;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'auto_reorder') THEN
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS auto_reorder BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'min_order_value') THEN
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS min_order_value DECIMAL(12,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 3. INVENTORY TABLE (stock tracking per product per location)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,

  -- Stock levels
  quantity_on_hand INTEGER DEFAULT 0, -- Fysieke voorraad
  quantity_reserved INTEGER DEFAULT 0, -- Gereserveerd voor orders
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,

  -- Expected stock
  quantity_incoming INTEGER DEFAULT 0, -- Verwachte leveringen

  -- Location
  warehouse_location VARCHAR(100), -- Bijv. 'A1-02' of 'main'
  bin_location VARCHAR(50),

  -- Reorder settings
  reorder_point INTEGER DEFAULT 0, -- Bestel wanneer < dit niveau
  reorder_quantity INTEGER DEFAULT 0, -- Standaard bestelgrootte
  max_stock INTEGER, -- Maximum voorraad

  -- Cost tracking
  average_cost DECIMAL(12,4), -- Gemiddelde inkoopprijs
  last_purchase_cost DECIMAL(12,4), -- Laatste inkoopprijs

  -- Timestamps
  last_counted_at TIMESTAMP WITH TIME ZONE, -- Laatste inventarisatie
  last_received_at TIMESTAMP WITH TIME ZONE,
  last_shipped_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(company_id, product_id, warehouse_location)
);

CREATE INDEX idx_inventory_company ON public.inventory(company_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_inventory_low_stock ON public.inventory(quantity_available) WHERE quantity_available <= 0;

-- ============================================================================
-- 4. EXPENSES TABLE (enhanced for invoice processing)
-- ============================================================================

-- Drop and recreate if needed (only if significantly different structure)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id),

  -- Document identification
  expense_number VARCHAR(50), -- Intern nummer
  external_reference VARCHAR(100), -- Factuurnummer van leverancier
  document_type VARCHAR(50) DEFAULT 'invoice', -- invoice, credit_note, receipt

  -- Source tracking (email processing)
  source_email_id UUID, -- Link naar email_messages
  source_type VARCHAR(50), -- 'email', 'manual', 'api'
  original_file_url TEXT, -- URL naar originele PDF

  -- Financials
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 21,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, disputed
  payment_due_date DATE,
  payment_date DATE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),

  -- Document details (AI extraction)
  invoice_date DATE,
  description TEXT,
  category VARCHAR(100),

  -- AI Processing
  ai_extracted_data JSONB DEFAULT '{}', -- Raw AI extraction
  ai_confidence DECIMAL(5,4), -- Overall confidence score
  ai_processed_at TIMESTAMP WITH TIME ZONE,

  -- Human review
  needs_review BOOLEAN DEFAULT false, -- Vereist menselijke goedkeuring
  review_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, approved, processed, archived

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_expenses_company ON public.expenses(company_id);
CREATE INDEX idx_expenses_supplier ON public.expenses(supplier_id);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_payment_status ON public.expenses(payment_status);
CREATE INDEX idx_expenses_needs_review ON public.expenses(needs_review) WHERE needs_review = true;
CREATE INDEX idx_expenses_date ON public.expenses(invoice_date);

-- ============================================================================
-- 5. EXPENSE LINE ITEMS (individual products/services on an expense)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expense_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id), -- Link naar product indien fysiek

  -- Item details
  description TEXT NOT NULL,
  sku VARCHAR(100), -- Product SKU if known
  ean VARCHAR(20), -- EAN/Barcode

  -- Quantity & pricing
  quantity DECIMAL(12,4) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'pcs', -- pcs, kg, m, hrs, etc
  unit_price DECIMAL(12,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 21,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,

  -- For physical products: expected delivery tracking
  is_physical_product BOOLEAN DEFAULT false,
  expected_delivery_id UUID, -- Will be set when delivery is created

  -- AI extraction confidence
  ai_confidence JSONB DEFAULT '{}', -- Per-field confidence scores

  -- Sort order
  line_number INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expense_line_items_expense ON public.expense_line_items(expense_id);
CREATE INDEX idx_expense_line_items_product ON public.expense_line_items(product_id);
CREATE INDEX idx_expense_line_items_ean ON public.expense_line_items(ean);

-- ============================================================================
-- 6. EXPECTED DELIVERIES (incoming stock from purchases)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expected_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id),
  expense_line_item_id UUID REFERENCES public.expense_line_items(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  product_id UUID REFERENCES public.products(id),

  -- Delivery details
  quantity_expected INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  quantity_remaining INTEGER GENERATED ALWAYS AS (quantity_expected - quantity_received) STORED,

  -- Tracking
  expected_date DATE,
  carrier VARCHAR(100),
  tracking_number VARCHAR(100),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, partial, complete, cancelled

  -- Notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expected_deliveries_company ON public.expected_deliveries(company_id);
CREATE INDEX idx_expected_deliveries_product ON public.expected_deliveries(product_id);
CREATE INDEX idx_expected_deliveries_status ON public.expected_deliveries(status);
CREATE INDEX idx_expected_deliveries_date ON public.expected_deliveries(expected_date);

-- ============================================================================
-- 7. RECEIVING LOG (stock receipt transactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.receiving_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  expected_delivery_id UUID REFERENCES public.expected_deliveries(id),
  product_id UUID REFERENCES public.products(id),

  -- Receipt details
  quantity_received INTEGER NOT NULL,
  ean_scanned VARCHAR(20), -- Barcode gescand bij ontvangst

  -- Location
  warehouse_location VARCHAR(100),
  bin_location VARCHAR(50),

  -- Quality
  condition VARCHAR(50) DEFAULT 'good', -- good, damaged, defective
  damage_notes TEXT,

  -- Receipt type
  receipt_type VARCHAR(50) DEFAULT 'purchase', -- purchase, return, transfer, adjustment

  -- Who received
  received_by UUID REFERENCES public.users(id),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_receiving_log_company ON public.receiving_log(company_id);
CREATE INDEX idx_receiving_log_product ON public.receiving_log(product_id);
CREATE INDEX idx_receiving_log_date ON public.receiving_log(received_at);
CREATE INDEX idx_receiving_log_ean ON public.receiving_log(ean_scanned);

-- ============================================================================
-- 8. SALES ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),

  -- Order identification
  order_number VARCHAR(50), -- Auto-generated order number
  external_reference VARCHAR(100), -- Customer's PO number

  -- Order details
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'draft', -- draft, confirmed, processing, shipped, delivered, cancelled

  -- Shipping address
  shipping_name VARCHAR(255),
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100) DEFAULT 'NL',

  -- Billing address (if different)
  billing_same_as_shipping BOOLEAN DEFAULT true,
  billing_name VARCHAR(255),
  billing_address_line1 VARCHAR(255),
  billing_address_line2 VARCHAR(255),
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_postal_code VARCHAR(20),
  billing_country VARCHAR(100),

  -- Financials
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_type VARCHAR(20), -- percent, fixed
  discount_value DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 21,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid, overdue
  payment_due_date DATE, -- Berekend: delivery_date + customer.payment_days_after_delivery

  -- Shipping
  shipping_method VARCHAR(100),
  shipping_task_id UUID, -- Link naar shipping_tasks
  shipped_at TIMESTAMP WITH TIME ZONE,

  -- Delivery
  delivered_at TIMESTAMP WITH TIME ZONE, -- Van tracking agent

  -- Invoice
  invoice_id UUID REFERENCES public.invoices(id),

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_sales_orders_company ON public.sales_orders(company_id);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_orders_payment_status ON public.sales_orders(payment_status);

-- ============================================================================
-- 9. SALES ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),

  -- Item details
  description TEXT,
  sku VARCHAR(100),
  ean VARCHAR(20),

  -- Quantity & reservation
  quantity INTEGER NOT NULL,
  quantity_reserved INTEGER DEFAULT 0, -- Hoeveel gereserveerd van inventory
  quantity_shipped INTEGER DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(12,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 21,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,

  -- Sort order
  line_number INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_order_items_order ON public.sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product ON public.sales_order_items(product_id);

-- ============================================================================
-- 10. SHIPPING TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,

  -- Task details
  task_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending, ready_to_ship, shipped, delivered, cancelled
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

  -- Carrier & tracking (VERPLICHT voor verzending!)
  carrier VARCHAR(100),
  service_type VARCHAR(100), -- standard, express, overnight
  track_trace_code VARCHAR(100), -- VERPLICHT om te kunnen verzenden
  tracking_url TEXT,

  -- Package details
  package_count INTEGER DEFAULT 1,
  total_weight DECIMAL(10,3), -- kg
  dimensions JSONB, -- { length, width, height, unit }

  -- Shipping
  ship_by_date DATE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  shipped_by UUID REFERENCES public.users(id),

  -- Delivery
  estimated_delivery DATE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_signature TEXT, -- Name of person who signed

  -- Tracking job
  tracking_job_id UUID, -- Link naar tracking_jobs

  -- Notes
  shipping_notes TEXT,
  delivery_instructions TEXT,

  -- Metadata
  label_url TEXT, -- Shipping label PDF
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_shipping_tasks_company ON public.shipping_tasks(company_id);
CREATE INDEX idx_shipping_tasks_order ON public.shipping_tasks(sales_order_id);
CREATE INDEX idx_shipping_tasks_status ON public.shipping_tasks(status);
CREATE INDEX idx_shipping_tasks_ship_by ON public.shipping_tasks(ship_by_date);

-- ============================================================================
-- 11. TRACKING JOBS TABLE (delivery tracking agent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tracking_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  shipping_task_id UUID REFERENCES public.shipping_tasks(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES public.sales_orders(id),
  customer_id UUID REFERENCES public.customers(id),

  -- Tracking details
  carrier VARCHAR(100) NOT NULL,
  track_trace_code VARCHAR(100) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, delivered, failed, cancelled
  current_tracking_status VARCHAR(100), -- Laatste status van carrier

  -- Timestamps
  last_checked_at TIMESTAMP WITH TIME ZONE,
  next_check_at TIMESTAMP WITH TIME ZONE,
  check_count INTEGER DEFAULT 0,

  -- Delivery
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_location VARCHAR(255),
  delivery_signature VARCHAR(255),

  -- Escalation
  is_overdue BOOLEAN DEFAULT false,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalation_notification_id UUID,

  -- Alert thresholds (from customer settings)
  alert_after_days INTEGER DEFAULT 14,

  -- Metadata
  raw_tracking_data JSONB DEFAULT '[]', -- History from carrier API
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tracking_jobs_company ON public.tracking_jobs(company_id);
CREATE INDEX idx_tracking_jobs_shipping ON public.tracking_jobs(shipping_task_id);
CREATE INDEX idx_tracking_jobs_status ON public.tracking_jobs(status);
CREATE INDEX idx_tracking_jobs_next_check ON public.tracking_jobs(next_check_at) WHERE status = 'active';
CREATE INDEX idx_tracking_jobs_carrier ON public.tracking_jobs(carrier, track_trace_code);

-- ============================================================================
-- 12. TRACKING HISTORY TABLE (individual tracking events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_job_id UUID REFERENCES public.tracking_jobs(id) ON DELETE CASCADE,

  -- Event details
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  status_code VARCHAR(50),
  status_description TEXT,
  location VARCHAR(255),

  -- Raw data from carrier
  raw_event JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tracking_history_job ON public.tracking_history(tracking_job_id);
CREATE INDEX idx_tracking_history_timestamp ON public.tracking_history(event_timestamp);

-- ============================================================================
-- 13. NOTIFICATIONS TABLE (human-in-the-loop escalations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Notification type
  type VARCHAR(50) NOT NULL, -- low_confidence, delivery_overdue, partial_delivery, stock_alert, payment_overdue
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

  -- Related entities
  expense_id UUID REFERENCES public.expenses(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  shipping_task_id UUID REFERENCES public.shipping_tasks(id),
  tracking_job_id UUID REFERENCES public.tracking_jobs(id),
  product_id UUID REFERENCES public.products(id),
  customer_id UUID REFERENCES public.customers(id),

  -- Notification content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_required TEXT, -- What the user should do
  action_url TEXT, -- Deep link to relevant page

  -- Data for action
  context_data JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(50) DEFAULT 'unread', -- unread, read, acknowledged, resolved, dismissed

  -- Assignment
  assigned_to UUID REFERENCES public.users(id),

  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_company ON public.notifications(company_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_severity ON public.notifications(severity) WHERE status = 'unread';
CREATE INDEX idx_notifications_assigned ON public.notifications(assigned_to) WHERE status != 'resolved';

-- ============================================================================
-- 14. EMAIL ACCOUNTS TABLE (pool of email accounts for scanning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Account details
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),

  -- Provider
  provider VARCHAR(50) NOT NULL, -- gmail, outlook, imap

  -- Authentication (encrypted)
  credentials JSONB, -- Encrypted OAuth tokens or IMAP credentials

  -- Settings
  scan_inbox BOOLEAN DEFAULT true,
  scan_folders TEXT[] DEFAULT ARRAY['INBOX'],
  auto_archive BOOLEAN DEFAULT false,

  -- Processing rules
  invoice_keywords TEXT[] DEFAULT ARRAY['factuur', 'invoice', 'rekening'],
  skip_keywords TEXT[] DEFAULT ARRAY['orderbevestiging', 'order confirmation'],

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, paused, error, disconnected
  last_error TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_accounts_company ON public.email_accounts(company_id);
CREATE INDEX idx_email_accounts_status ON public.email_accounts(status);

-- ============================================================================
-- 15. EMAIL MESSAGES TABLE (processed emails)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,

  -- Email identification
  message_id VARCHAR(500), -- Email Message-ID header
  thread_id VARCHAR(500),

  -- Email content
  from_address VARCHAR(255),
  from_name VARCHAR(255),
  to_addresses TEXT[],
  cc_addresses TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Classification (by AI)
  classification VARCHAR(50), -- invoice, order_confirmation, shipping_notification, other, spam
  classification_confidence DECIMAL(5,4),

  -- Attachments
  attachments JSONB DEFAULT '[]', -- Array of { filename, mime_type, size, storage_url }

  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, processed, skipped, error
  processing_result JSONB,
  error_message TEXT,

  -- Link to expense if invoice was created
  expense_id UUID REFERENCES public.expenses(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_messages_company ON public.email_messages(company_id);
CREATE INDEX idx_email_messages_account ON public.email_messages(email_account_id);
CREATE INDEX idx_email_messages_status ON public.email_messages(status);
CREATE INDEX idx_email_messages_classification ON public.email_messages(classification);
CREATE INDEX idx_email_messages_received ON public.email_messages(received_at);

-- ============================================================================
-- 16. ADD EAN COLUMN TO PRODUCTS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ean') THEN
    ALTER TABLE public.products ADD COLUMN ean VARCHAR(20);
    CREATE INDEX idx_products_ean ON public.products(ean);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_physical') THEN
    ALTER TABLE public.products ADD COLUMN is_physical BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- 17. INVENTORY FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update inventory on receiving
CREATE OR REPLACE FUNCTION public.update_inventory_on_receive()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert inventory record
  INSERT INTO public.inventory (
    company_id,
    product_id,
    warehouse_location,
    quantity_on_hand,
    last_received_at,
    last_purchase_cost
  )
  SELECT
    NEW.company_id,
    NEW.product_id,
    COALESCE(NEW.warehouse_location, 'main'),
    NEW.quantity_received,
    NOW(),
    NULL
  ON CONFLICT (company_id, product_id, warehouse_location)
  DO UPDATE SET
    quantity_on_hand = inventory.quantity_on_hand + NEW.quantity_received,
    last_received_at = NOW(),
    updated_at = NOW();

  -- Update expected delivery if linked
  IF NEW.expected_delivery_id IS NOT NULL THEN
    UPDATE public.expected_deliveries
    SET
      quantity_received = quantity_received + NEW.quantity_received,
      status = CASE
        WHEN quantity_received + NEW.quantity_received >= quantity_expected THEN 'complete'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE id = NEW.expected_delivery_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_receive
AFTER INSERT ON public.receiving_log
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_on_receive();

-- Function to reserve inventory on order confirmation
CREATE OR REPLACE FUNCTION public.reserve_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Reserve stock for each line item
    UPDATE public.inventory inv
    SET
      quantity_reserved = inv.quantity_reserved + soi.quantity,
      updated_at = NOW()
    FROM public.sales_order_items soi
    WHERE soi.sales_order_id = NEW.id
      AND inv.product_id = soi.product_id
      AND inv.company_id = NEW.company_id;

    -- Update reserved quantity on line items
    UPDATE public.sales_order_items
    SET quantity_reserved = quantity
    WHERE sales_order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reserve_inventory
AFTER UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.reserve_inventory();

-- Function to release inventory on ship
CREATE OR REPLACE FUNCTION public.release_inventory_on_ship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when shipped_at is set
  IF NEW.shipped_at IS NOT NULL AND OLD.shipped_at IS NULL THEN
    -- Decrease on-hand and reserved quantities
    UPDATE public.inventory inv
    SET
      quantity_on_hand = inv.quantity_on_hand - soi.quantity,
      quantity_reserved = inv.quantity_reserved - soi.quantity_reserved,
      last_shipped_at = NOW(),
      updated_at = NOW()
    FROM public.sales_order_items soi
    WHERE soi.sales_order_id = NEW.id
      AND inv.product_id = soi.product_id
      AND inv.company_id = NEW.company_id;

    -- Update shipped quantity on line items
    UPDATE public.sales_order_items
    SET quantity_shipped = quantity
    WHERE sales_order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_release_inventory_on_ship
AFTER UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.release_inventory_on_ship();

-- ============================================================================
-- 18. AUTO-NUMBER FUNCTIONS
-- ============================================================================

-- Sales order number generator
CREATE OR REPLACE FUNCTION public.generate_sales_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  year_prefix VARCHAR(4);
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 7) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sales_orders
  WHERE company_id = NEW.company_id
    AND order_number LIKE 'SO' || year_prefix || '%';

  NEW.order_number := 'SO' || year_prefix || LPAD(next_number::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sales_order_number
BEFORE INSERT ON public.sales_orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION public.generate_sales_order_number();

-- Shipping task number generator
CREATE OR REPLACE FUNCTION public.generate_shipping_task_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  year_prefix VARCHAR(4);
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM 7) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.shipping_tasks
  WHERE company_id = NEW.company_id
    AND task_number LIKE 'ST' || year_prefix || '%';

  NEW.task_number := 'ST' || year_prefix || LPAD(next_number::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipping_task_number
BEFORE INSERT ON public.shipping_tasks
FOR EACH ROW
WHEN (NEW.task_number IS NULL)
EXECUTE FUNCTION public.generate_shipping_task_number();

-- ============================================================================
-- 19. RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expected_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic policy for company-scoped tables
CREATE OR REPLACE FUNCTION public.create_company_rls_policies(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Select policy
  EXECUTE format('
    CREATE POLICY "Users can view own company %s" ON public.%s
    FOR SELECT USING (company_id = public.get_user_company_id())
  ', table_name, table_name);

  -- Insert policy
  EXECUTE format('
    CREATE POLICY "Users can insert own company %s" ON public.%s
    FOR INSERT WITH CHECK (company_id = public.get_user_company_id())
  ', table_name, table_name);

  -- Update policy
  EXECUTE format('
    CREATE POLICY "Users can update own company %s" ON public.%s
    FOR UPDATE USING (company_id = public.get_user_company_id())
  ', table_name, table_name);

  -- Delete policy
  EXECUTE format('
    CREATE POLICY "Users can delete own company %s" ON public.%s
    FOR DELETE USING (company_id = public.get_user_company_id())
  ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply policies to all new tables
SELECT public.create_company_rls_policies('customers');
SELECT public.create_company_rls_policies('inventory');
SELECT public.create_company_rls_policies('expenses');
SELECT public.create_company_rls_policies('expected_deliveries');
SELECT public.create_company_rls_policies('receiving_log');
SELECT public.create_company_rls_policies('sales_orders');
SELECT public.create_company_rls_policies('shipping_tasks');
SELECT public.create_company_rls_policies('tracking_jobs');
SELECT public.create_company_rls_policies('notifications');
SELECT public.create_company_rls_policies('email_accounts');
SELECT public.create_company_rls_policies('email_messages');

-- Special policies for child tables (join to parent for company check)
CREATE POLICY "Users can view expense line items" ON public.expense_line_items
FOR SELECT USING (
  expense_id IN (SELECT id FROM public.expenses WHERE company_id = public.get_user_company_id())
);

CREATE POLICY "Users can manage expense line items" ON public.expense_line_items
FOR ALL USING (
  expense_id IN (SELECT id FROM public.expenses WHERE company_id = public.get_user_company_id())
);

CREATE POLICY "Users can view sales order items" ON public.sales_order_items
FOR SELECT USING (
  sales_order_id IN (SELECT id FROM public.sales_orders WHERE company_id = public.get_user_company_id())
);

CREATE POLICY "Users can manage sales order items" ON public.sales_order_items
FOR ALL USING (
  sales_order_id IN (SELECT id FROM public.sales_orders WHERE company_id = public.get_user_company_id())
);

CREATE POLICY "Users can view tracking history" ON public.tracking_history
FOR SELECT USING (
  tracking_job_id IN (SELECT id FROM public.tracking_jobs WHERE company_id = public.get_user_company_id())
);

-- ============================================================================
-- 20. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.customers IS 'Customer records with payment guardrails and tracking settings';
COMMENT ON TABLE public.inventory IS 'Stock levels per product per location with automatic reservation tracking';
COMMENT ON TABLE public.expenses IS 'Purchase invoices and expenses with AI extraction and review workflow';
COMMENT ON TABLE public.expense_line_items IS 'Individual line items on expenses for detailed tracking';
COMMENT ON TABLE public.expected_deliveries IS 'Expected incoming deliveries from purchases';
COMMENT ON TABLE public.receiving_log IS 'Stock receipt transactions with barcode scanning';
COMMENT ON TABLE public.sales_orders IS 'Customer sales orders with payment and delivery tracking';
COMMENT ON TABLE public.sales_order_items IS 'Line items on sales orders with inventory reservation';
COMMENT ON TABLE public.shipping_tasks IS 'Shipping tasks requiring track & trace for completion';
COMMENT ON TABLE public.tracking_jobs IS 'Delivery tracking jobs monitored by tracking agent';
COMMENT ON TABLE public.tracking_history IS 'Historical tracking events from carrier APIs';
COMMENT ON TABLE public.notifications IS 'Human-in-the-loop notifications and escalations';
COMMENT ON TABLE public.email_accounts IS 'Pool of email accounts for automated invoice scanning';
COMMENT ON TABLE public.email_messages IS 'Processed email messages with classification';

COMMENT ON COLUMN public.customers.payment_days_after_delivery IS 'Payment due X days AFTER delivery, not order date';
COMMENT ON COLUMN public.customers.tracking_alert_days IS 'Escalate if not delivered within X days after shipping';
COMMENT ON COLUMN public.expenses.ai_confidence IS 'Overall AI extraction confidence (0-1), requires >= 0.95 for auto-approval';
COMMENT ON COLUMN public.shipping_tasks.track_trace_code IS 'REQUIRED to mark as shipped - gates the shipping completion';
