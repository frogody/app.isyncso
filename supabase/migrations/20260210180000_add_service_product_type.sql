-- Migration: Add "service" product type
-- Adds service as a third product type alongside digital and physical

-- 1. Drop and recreate the CHECK constraint on products.type to include 'service'
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check
  CHECK (type IN ('digital', 'physical', 'service'));

-- 2. Create service_products table (follows digital_products/physical_products pattern)
CREATE TABLE IF NOT EXISTS public.service_products (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Service classification
  service_type VARCHAR(50) DEFAULT 'consulting'
    CHECK (service_type IN ('consulting', 'headhunting', 'design', 'development', 'advisory', 'custom')),
  pricing_model VARCHAR(50) DEFAULT 'project'
    CHECK (pricing_model IN ('hourly', 'retainer', 'project', 'milestone', 'success_fee', 'hybrid')),

  -- Pricing configuration (JSONB for flexibility)
  -- Structure: { hourly: { rate, min_hours, billing_increment }, retainer: { monthly_fee, included_hours, overage_rate },
  --              project: { items: [{ name, price, est_hours }] }, milestones: [{ name, amount, percentage }],
  --              success_fee: { base_fee, success_percentage, metric } }
  pricing_config JSONB DEFAULT '{}'::jsonb,

  -- Deliverables: [{ id, name, description, format, timeline }]
  deliverables JSONB DEFAULT '[]'::jsonb,

  -- Service tiers: [{ id, name, description, price, features: [], recommended: bool }]
  service_tiers JSONB DEFAULT '[]'::jsonb,

  -- SLA: { response_time, revision_rounds, delivery_timeline, availability, support_hours }
  sla JSONB DEFAULT '{}'::jsonb,

  -- Scope: { included: [], excluded: [], prerequisites: [] }
  scope JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_service_products_company_id ON public.service_products(company_id);
CREATE INDEX IF NOT EXISTS idx_service_products_service_type ON public.service_products(service_type);
CREATE INDEX IF NOT EXISTS idx_service_products_pricing_model ON public.service_products(pricing_model);

-- 4. RLS policies (using auth_company_id() wrapper per project standards)
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_products_select" ON public.service_products
  FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "service_products_insert" ON public.service_products
  FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "service_products_update" ON public.service_products
  FOR UPDATE TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "service_products_delete" ON public.service_products
  FOR DELETE TO authenticated
  USING (company_id = auth_company_id());

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_service_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_service_products_updated_at
  BEFORE UPDATE ON public.service_products
  FOR EACH ROW
  EXECUTE FUNCTION update_service_products_updated_at();
