-- ═══════════════════════════════════════════════════════════════
-- B2B Wholesale Storefront — Complete Schema
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Extend portal_settings with wholesale + store builder fields ──

ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS enable_wholesale BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS store_template TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS store_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_subdomain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_ssl_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enable_preorders BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_inquiries BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_chat BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS order_requires_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_visibility TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS store_version INTEGER DEFAULT 0;

-- Unique subdomain constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_settings_subdomain
  ON public.portal_settings(store_subdomain) WHERE store_subdomain IS NOT NULL;

-- ── 2. Extend portal_clients with B2B wholesale fields ──

ALTER TABLE public.portal_clients
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS price_list_id UUID,
  ADD COLUMN IF NOT EXISTS client_group_id UUID,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_address JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS b2b_notes TEXT;

-- ── 3. Client Groups ──

CREATE TABLE IF NOT EXISTS public.b2b_client_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_list_id UUID,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  can_preorder BOOLEAN DEFAULT false,
  max_credit NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_client_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_client_groups_org" ON public.b2b_client_groups
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

-- FK from portal_clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_portal_clients_group'
  ) THEN
    ALTER TABLE public.portal_clients
      ADD CONSTRAINT fk_portal_clients_group
      FOREIGN KEY (client_group_id) REFERENCES public.b2b_client_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. Price Lists ──

CREATE TABLE IF NOT EXISTS public.b2b_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'EUR',
  is_default BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  discount_type TEXT DEFAULT 'custom',
  global_discount_percent NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_price_lists_org" ON public.b2b_price_lists
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

-- FK from portal_clients and client_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_portal_clients_price_list'
  ) THEN
    ALTER TABLE public.portal_clients
      ADD CONSTRAINT fk_portal_clients_price_list
      FOREIGN KEY (price_list_id) REFERENCES public.b2b_price_lists(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_client_groups_price_list'
  ) THEN
    ALTER TABLE public.b2b_client_groups
      ADD CONSTRAINT fk_client_groups_price_list
      FOREIGN KEY (price_list_id) REFERENCES public.b2b_price_lists(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 5. Price List Items (per-product pricing with quantity tiers) ──

CREATE TABLE IF NOT EXISTS public.b2b_price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES public.b2b_price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit_price NUMERIC(12,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(price_list_id, product_id, min_quantity)
);

ALTER TABLE public.b2b_price_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_price_list_items_via_list" ON public.b2b_price_list_items
  FOR ALL TO authenticated
  USING (price_list_id IN (
    SELECT id FROM public.b2b_price_lists WHERE organization_id = auth_company_id()
  ));

-- ── 6. Shopping Cart ──

CREATE TABLE IF NOT EXISTS public.b2b_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_carts ENABLE ROW LEVEL SECURITY;

-- Org users can manage all carts
CREATE POLICY "b2b_carts_org" ON public.b2b_carts
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

-- Portal clients can manage their own cart
CREATE POLICY "b2b_carts_client" ON public.b2b_carts
  FOR ALL TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

CREATE TABLE IF NOT EXISTS public.b2b_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.b2b_carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2),
  is_preorder BOOLEAN DEFAULT false,
  expected_delivery_id UUID REFERENCES public.expected_deliveries(id),
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cart_id, product_id, is_preorder)
);

ALTER TABLE public.b2b_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_cart_items_via_cart" ON public.b2b_cart_items
  FOR ALL TO authenticated
  USING (cart_id IN (
    SELECT id FROM public.b2b_carts
    WHERE organization_id = auth_company_id()
       OR client_id IN (SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid())
  ));

-- ── 7. B2B Orders ──

CREATE TABLE IF NOT EXISTS public.b2b_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  payment_status TEXT DEFAULT 'pending',
  payment_terms_days INTEGER DEFAULT 30,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  billing_address JSONB DEFAULT '{}'::jsonb,
  client_notes TEXT,
  internal_notes TEXT,
  has_preorder_items BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_orders_org" ON public.b2b_orders
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "b2b_orders_client" ON public.b2b_orders
  FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_b2b_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'B2B-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.b2b_orders
  WHERE company_id = NEW.company_id;

  NEW.order_number := 'B2B-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_order_number ON public.b2b_orders;
CREATE TRIGGER trg_b2b_order_number
  BEFORE INSERT ON public.b2b_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_b2b_order_number();

-- ── 8. B2B Order Items ──

CREATE TABLE IF NOT EXISTS public.b2b_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id UUID NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  ean TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  is_preorder BOOLEAN DEFAULT false,
  expected_delivery_id UUID REFERENCES public.expected_deliveries(id),
  reservation_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_order_items_via_order" ON public.b2b_order_items
  FOR ALL TO authenticated
  USING (b2b_order_id IN (
    SELECT id FROM public.b2b_orders
    WHERE organization_id = auth_company_id()
       OR client_id IN (SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid())
  ));

-- ── 9. Pre-order Reservations ──

CREATE TABLE IF NOT EXISTS public.b2b_preorder_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  expected_delivery_id UUID NOT NULL REFERENCES public.expected_deliveries(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id),
  b2b_order_id UUID REFERENCES public.b2b_orders(id),
  b2b_order_item_id UUID REFERENCES public.b2b_order_items(id),
  quantity_reserved INTEGER NOT NULL CHECK (quantity_reserved > 0),
  status TEXT DEFAULT 'active',
  reserved_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_preorder_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_preorder_res_org" ON public.b2b_preorder_reservations
  FOR ALL TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.users WHERE id = auth_uid()
  ));

-- ── 10. Product Inquiries ──

CREATE TABLE IF NOT EXISTS public.b2b_product_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.portal_clients(id),
  product_id UUID REFERENCES public.products(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  inquiry_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  inbox_channel_id UUID,
  assigned_to UUID REFERENCES auth.users(id),
  replied_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_product_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_inquiries_org" ON public.b2b_product_inquiries
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "b2b_inquiries_client" ON public.b2b_product_inquiries
  FOR ALL TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

-- ── 11. Store Builder Templates ──

CREATE TABLE IF NOT EXISTS public.b2b_store_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'modern',
  industry TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- No RLS on templates — they're global/system-level
ALTER TABLE public.b2b_store_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_templates_read" ON public.b2b_store_templates
  FOR SELECT TO authenticated USING (true);

-- ── 12. Store Builder Version History ──

CREATE TABLE IF NOT EXISTS public.b2b_store_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  store_config JSONB NOT NULL,
  version_number INTEGER NOT NULL,
  label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_store_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_store_versions_org" ON public.b2b_store_versions
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

-- ── 13. Inventory reservation function ──

CREATE OR REPLACE FUNCTION reserve_b2b_inventory(
  p_product_id UUID,
  p_company_id UUID,
  p_quantity INTEGER,
  p_warehouse TEXT DEFAULT 'main'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT quantity_on_hand - quantity_reserved INTO v_available
  FROM inventory
  WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND warehouse_location = p_warehouse;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN false;
  END IF;

  UPDATE inventory
  SET quantity_reserved = quantity_reserved + p_quantity,
      quantity_allocated_b2b = quantity_allocated_b2b + p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND warehouse_location = p_warehouse;

  RETURN true;
END;
$$;

-- ── 14. Price resolution function ──

CREATE OR REPLACE FUNCTION get_b2b_client_price(
  p_client_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(unit_price NUMERIC, source TEXT, discount_percent NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_list_id UUID;
  v_group_price_list_id UUID;
  v_group_discount NUMERIC;
  v_default_price_list_id UUID;
  v_base_price NUMERIC;
  v_found_price NUMERIC;
BEGIN
  -- Get client's direct price list
  SELECT pc.price_list_id, pc.client_group_id INTO v_price_list_id
  FROM portal_clients pc WHERE pc.id = p_client_id;

  -- 1. Check client's direct price list
  IF v_price_list_id IS NOT NULL THEN
    SELECT pli.unit_price INTO v_found_price
    FROM b2b_price_list_items pli
    WHERE pli.price_list_id = v_price_list_id
      AND pli.product_id = p_product_id
      AND pli.min_quantity <= p_quantity
      AND (pli.max_quantity IS NULL OR pli.max_quantity >= p_quantity)
    ORDER BY pli.min_quantity DESC
    LIMIT 1;

    IF v_found_price IS NOT NULL THEN
      RETURN QUERY SELECT v_found_price, 'client_price_list'::TEXT, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- 2. Check client group's price list
  SELECT cg.price_list_id, cg.discount_percentage
  INTO v_group_price_list_id, v_group_discount
  FROM b2b_client_groups cg
  JOIN portal_clients pc ON pc.client_group_id = cg.id
  WHERE pc.id = p_client_id;

  IF v_group_price_list_id IS NOT NULL THEN
    SELECT pli.unit_price INTO v_found_price
    FROM b2b_price_list_items pli
    WHERE pli.price_list_id = v_group_price_list_id
      AND pli.product_id = p_product_id
      AND pli.min_quantity <= p_quantity
      AND (pli.max_quantity IS NULL OR pli.max_quantity >= p_quantity)
    ORDER BY pli.min_quantity DESC
    LIMIT 1;

    IF v_found_price IS NOT NULL THEN
      RETURN QUERY SELECT v_found_price, 'group_price_list'::TEXT, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- 3. Check group discount on base price
  SELECT p.price INTO v_base_price FROM products p WHERE p.id = p_product_id;

  IF v_group_discount IS NOT NULL AND v_group_discount > 0 AND v_base_price IS NOT NULL THEN
    RETURN QUERY SELECT
      ROUND(v_base_price * (1 - v_group_discount / 100), 2),
      'group_discount'::TEXT,
      v_group_discount;
    RETURN;
  END IF;

  -- 4. Check default org price list
  SELECT pl.id INTO v_default_price_list_id
  FROM b2b_price_lists pl
  JOIN portal_clients pc ON pc.organization_id = pl.organization_id
  WHERE pc.id = p_client_id AND pl.is_default = true AND pl.status = 'active'
  LIMIT 1;

  IF v_default_price_list_id IS NOT NULL THEN
    SELECT pli.unit_price INTO v_found_price
    FROM b2b_price_list_items pli
    WHERE pli.price_list_id = v_default_price_list_id
      AND pli.product_id = p_product_id
      AND pli.min_quantity <= p_quantity
    ORDER BY pli.min_quantity DESC
    LIMIT 1;

    IF v_found_price IS NOT NULL THEN
      RETURN QUERY SELECT v_found_price, 'default_price_list'::TEXT, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- 5. Fallback: base product price
  RETURN QUERY SELECT COALESCE(v_base_price, 0::NUMERIC), 'base_price'::TEXT, 0::NUMERIC;
END;
$$;

-- ── 15. Indexes ──

CREATE INDEX IF NOT EXISTS idx_b2b_price_list_items_lookup
  ON public.b2b_price_list_items(price_list_id, product_id, min_quantity);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_client
  ON public.b2b_orders(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_org
  ON public.b2b_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_b2b_carts_client
  ON public.b2b_carts(client_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_b2b_preorder_res_delivery
  ON public.b2b_preorder_reservations(expected_delivery_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_org
  ON public.b2b_product_inquiries(organization_id, status);
