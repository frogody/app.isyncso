-- Migration: Digital Product Pricing Enhancement & Proposals
-- This migration adds:
-- 1. pricing_config JSONB column to digital_products for flexible pricing
-- 2. product_bundles table for product groupings
-- 3. proposals table for Growth integration
-- 4. Invoice/subscription enhancements for product linking

-- ============================================
-- 1. DIGITAL PRODUCTS PRICING CONFIG
-- ============================================

-- Add pricing_config JSONB column to digital_products
ALTER TABLE digital_products
ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{}';

-- Add helpful comment
COMMENT ON COLUMN digital_products.pricing_config IS 'Flexible pricing configuration for subscriptions, one-time fees, and add-ons';

-- ============================================
-- 2. PRODUCT BUNDLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255),

  -- Bundle Configuration
  bundle_type VARCHAR(50) DEFAULT 'fixed', -- 'fixed' | 'configurable'
  pricing_strategy VARCHAR(50) DEFAULT 'sum', -- 'sum' | 'fixed' | 'discount'
  fixed_price DECIMAL(12,2),
  discount_percent DECIMAL(5,2),

  -- Items (array of product references)
  items JSONB DEFAULT '[]', -- [{ product_id, product_type, plan_id, quantity, required }]

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  featured_image JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes for product_bundles
CREATE INDEX IF NOT EXISTS idx_product_bundles_company ON product_bundles(company_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_status ON product_bundles(status);
CREATE INDEX IF NOT EXISTS idx_product_bundles_slug ON product_bundles(slug);

-- Enable RLS for product_bundles
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_bundles
CREATE POLICY "Users can view company bundles" ON product_bundles
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create company bundles" ON product_bundles
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company bundles" ON product_bundles
  FOR UPDATE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete company bundles" ON product_bundles
  FOR DELETE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 3. PROPOSALS TABLE (Growth Integration)
-- ============================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,

  -- Identification
  proposal_number VARCHAR(50),
  title VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired

  -- Client Information
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_company VARCHAR(255),
  client_address JSONB,

  -- Content
  introduction TEXT,
  sections JSONB DEFAULT '[]', -- [{ type, title, content, order }]
  line_items JSONB DEFAULT '[]', -- [{ product_id, product_type, plan_id, description, quantity, unit_price, is_subscription, billing_cycle }]
  terms_and_conditions TEXT,

  -- Pricing Summary
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_type VARCHAR(20), -- 'percent' | 'fixed'
  discount_value DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Validity
  valid_until DATE,

  -- Branding
  branding JSONB DEFAULT '{}', -- { logo_url, primary_color, secondary_color, font }

  -- Signature
  signature_required BOOLEAN DEFAULT false,
  signature_data JSONB, -- { type, data, signer_name, signer_email, ip_address }
  signed_at TIMESTAMP WITH TIME ZONE,

  -- Conversion
  converted_to_invoice_id UUID,
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes for proposals
CREATE INDEX IF NOT EXISTS idx_proposals_company ON proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_prospect ON proposals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);

-- Enable RLS for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposals
CREATE POLICY "Users can view company proposals" ON proposals
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create company proposals" ON proposals
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company proposals" ON proposals
  FOR UPDATE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete company proposals" ON proposals
  FOR DELETE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 4. INVOICE ENHANCEMENTS
-- ============================================

-- Add proposal_id to invoices for tracking conversions
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

-- ============================================
-- 5. SUBSCRIPTION ENHANCEMENTS
-- ============================================

-- Add product reference columns to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS product_id UUID,
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS plan_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255);

-- Create index for subscription product lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON subscriptions(product_id, product_type);

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count
  FROM proposals
  WHERE company_id = p_company_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());

  RETURN 'PROP-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate proposal number
CREATE OR REPLACE FUNCTION set_proposal_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.proposal_number IS NULL OR NEW.proposal_number = '' THEN
    NEW.proposal_number := generate_proposal_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_proposal_number ON proposals;
CREATE TRIGGER tr_set_proposal_number
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_number();

-- Updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_product_bundles_updated_at ON product_bundles;
CREATE TRIGGER tr_product_bundles_updated_at
  BEFORE UPDATE ON product_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_proposals_updated_at ON proposals;
CREATE TRIGGER tr_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
