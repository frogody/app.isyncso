-- Products Module Database Schema
-- Dynamic products system for digital and physical products

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  contact JSONB DEFAULT '{}',
  address JSONB DEFAULT '{}',
  terms JSONB DEFAULT '{}',

  certifications TEXT[],
  rating DECIMAL(2,1),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);

-- ============================================================================
-- PRODUCT CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.product_categories(id),
  image JSONB,
  product_type VARCHAR(20) CHECK (product_type IN ('digital', 'physical', 'both')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_company ON public.product_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id);

-- ============================================================================
-- PRODUCTS TABLE (Base Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('digital', 'physical')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(500),
  description TEXT,
  short_description VARCHAR(1000),
  category VARCHAR(100),
  category_id UUID REFERENCES public.product_categories(id),
  tags TEXT[],

  -- Media
  featured_image JSONB,
  gallery JSONB DEFAULT '[]',

  -- SEO
  seo_meta_title VARCHAR(255),
  seo_meta_description VARCHAR(500),
  seo_og_image VARCHAR(500),
  seo_keywords TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(type);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);

-- ============================================================================
-- DIGITAL PRODUCTS TABLE (extends products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.digital_products (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,

  -- Content
  hero JSONB DEFAULT '{}',
  features JSONB DEFAULT '[]',
  feature_highlights JSONB DEFAULT '[]',
  demo_videos JSONB DEFAULT '[]',
  promo_videos JSONB DEFAULT '[]',

  -- Pricing
  pricing_model VARCHAR(50),
  billing_cycles TEXT[],
  packages JSONB DEFAULT '[]',

  -- Details
  integrations JSONB DEFAULT '[]',
  faqs JSONB DEFAULT '[]',
  testimonials JSONB DEFAULT '[]',

  -- Links
  documentation_url VARCHAR(500),
  demo_url VARCHAR(500),
  trial_available BOOLEAN DEFAULT false,
  trial_days INTEGER
);

-- ============================================================================
-- PHYSICAL PRODUCTS TABLE (extends products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.physical_products (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,

  -- Identification
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  mpn VARCHAR(100),

  -- Details
  specifications JSONB DEFAULT '[]',
  attributes JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',

  -- Commerce
  inventory JSONB DEFAULT '{}',
  pricing JSONB DEFAULT '{}',
  shipping JSONB DEFAULT '{}',

  -- Supplier
  supplier_id UUID REFERENCES public.suppliers(id),
  certifications JSONB DEFAULT '[]',
  country_of_origin VARCHAR(2),
  hs_code VARCHAR(20),

  -- Relations
  related_products UUID[],
  accessories UUID[],
  purchase_options JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_physical_products_supplier ON public.physical_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_physical_products_sku ON public.physical_products(sku);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_products ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Users can view suppliers for their company" ON public.suppliers
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Product Categories policies
CREATE POLICY "Users can view categories for their company" ON public.product_categories
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage categories" ON public.product_categories
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Products policies
CREATE POLICY "Users can view products for their company" ON public.products
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Digital Products policies (inherits from products via FK)
CREATE POLICY "Users can view digital products" ON public.digital_products
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage digital products" ON public.digital_products
  FOR ALL USING (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Physical Products policies (inherits from products via FK)
CREATE POLICY "Users can view physical products" ON public.physical_products
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage physical products" ON public.physical_products
  FOR ALL USING (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();

CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();
