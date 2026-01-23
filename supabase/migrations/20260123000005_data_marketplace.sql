-- ============================================================================
-- Data Marketplace Tables and Functions
-- Allows platform admins to manage data products (Nests/Datasets)
-- ============================================================================

-- Data Product Categories
CREATE TABLE IF NOT EXISTS public.data_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.data_categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Products (Nests)
CREATE TABLE IF NOT EXISTS public.data_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  long_description TEXT,
  category_id UUID REFERENCES public.data_categories(id),

  -- Pricing
  price_type TEXT DEFAULT 'one_time' CHECK (price_type IN ('free', 'one_time', 'subscription', 'usage_based')),
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',

  -- Data Info
  data_format TEXT, -- CSV, JSON, API, etc.
  data_source TEXT,
  record_count BIGINT,
  last_updated TIMESTAMPTZ,
  update_frequency TEXT, -- daily, weekly, monthly, etc.

  -- Files
  sample_file_url TEXT,
  full_file_url TEXT,
  preview_image_url TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  features JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT false,

  -- Stats
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  purchase_count INT DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Product Purchases
CREATE TABLE IF NOT EXISTS public.data_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.data_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  company_id UUID REFERENCES public.companies(id),

  -- Transaction
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,

  -- Access
  access_type TEXT DEFAULT 'perpetual' CHECK (access_type IN ('perpetual', 'time_limited', 'usage_limited')),
  access_expires_at TIMESTAMPTZ,
  download_limit INT,
  downloads_used INT DEFAULT 0,

  -- Audit
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Downloads Log
CREATE TABLE IF NOT EXISTS public.data_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.data_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  purchase_id UUID REFERENCES public.data_purchases(id) ON DELETE SET NULL,

  file_type TEXT, -- sample, full
  ip_address TEXT,
  user_agent TEXT,

  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_products_category ON public.data_products(category_id);
CREATE INDEX IF NOT EXISTS idx_data_products_status ON public.data_products(status);
CREATE INDEX IF NOT EXISTS idx_data_products_featured ON public.data_products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_data_products_created_at ON public.data_products(created_at);
CREATE INDEX IF NOT EXISTS idx_data_purchases_product ON public.data_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_data_purchases_user ON public.data_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_data_purchases_status ON public.data_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_data_downloads_product ON public.data_downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_data_downloads_user ON public.data_downloads(user_id);

-- Enable RLS
ALTER TABLE public.data_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_categories
CREATE POLICY "Platform admins full access to categories" ON public.data_categories
  FOR ALL TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Anyone can view active categories" ON public.data_categories
  FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS Policies for data_products
CREATE POLICY "Platform admins full access to products" ON public.data_products
  FOR ALL TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Anyone can view published products" ON public.data_products
  FOR SELECT TO authenticated
  USING (status = 'published');

-- RLS Policies for data_purchases
CREATE POLICY "Platform admins full access to purchases" ON public.data_purchases
  FOR ALL TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Users can view own purchases" ON public.data_purchases
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- RLS Policies for data_downloads
CREATE POLICY "Platform admins full access to downloads" ON public.data_downloads
  FOR ALL TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Users can view own downloads" ON public.data_downloads
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Grant access to authenticated users
GRANT ALL ON public.data_categories TO authenticated;
GRANT ALL ON public.data_products TO authenticated;
GRANT ALL ON public.data_purchases TO authenticated;
GRANT ALL ON public.data_downloads TO authenticated;

-- Seed default categories
INSERT INTO public.data_categories (name, slug, description, icon, sort_order) VALUES
  ('Business & Finance', 'business-finance', 'Financial data, market trends, company information', 'TrendingUp', 1),
  ('Demographics', 'demographics', 'Population data, census information, consumer profiles', 'Users', 2),
  ('Technology', 'technology', 'Tech industry data, software usage, digital trends', 'Cpu', 3),
  ('Marketing & Sales', 'marketing-sales', 'Lead lists, customer data, market research', 'Target', 4),
  ('Healthcare', 'healthcare', 'Medical data, healthcare statistics, pharma info', 'Heart', 5),
  ('Real Estate', 'real-estate', 'Property data, housing markets, commercial real estate', 'Building', 6),
  ('Energy & Environment', 'energy-environment', 'Energy consumption, environmental data, sustainability', 'Leaf', 7),
  ('Transportation', 'transportation', 'Logistics, shipping, mobility data', 'Truck', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Admin Functions for Marketplace Management
-- ============================================================================

-- Get marketplace stats
CREATE OR REPLACE FUNCTION public.admin_get_marketplace_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN json_build_object(
    'total_products', (SELECT COUNT(*) FROM data_products),
    'published_products', (SELECT COUNT(*) FROM data_products WHERE status = 'published'),
    'draft_products', (SELECT COUNT(*) FROM data_products WHERE status = 'draft'),
    'total_purchases', (SELECT COUNT(*) FROM data_purchases WHERE payment_status = 'completed'),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM data_purchases WHERE payment_status = 'completed'),
    'total_downloads', (SELECT COALESCE(SUM(download_count), 0) FROM data_products),
    'featured_products', (SELECT COUNT(*) FROM data_products WHERE is_featured = true),
    'products_by_category', (
      SELECT COALESCE(json_agg(json_build_object('category', c.name, 'count', COALESCE(p.cnt, 0))), '[]'::json)
      FROM data_categories c
      LEFT JOIN (SELECT category_id, COUNT(*) as cnt FROM data_products GROUP BY category_id) p ON c.id = p.category_id
      WHERE c.is_active = true
    ),
    'products_by_status', (
      SELECT COALESCE(json_agg(json_build_object('status', status, 'count', cnt)), '[]'::json)
      FROM (SELECT status, COUNT(*) as cnt FROM data_products GROUP BY status) s
    ),
    'recent_purchases', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', dp.id,
        'product_name', pr.name,
        'user_name', u.name,
        'amount', dp.amount,
        'purchased_at', dp.purchased_at
      )), '[]'::json)
      FROM data_purchases dp
      JOIN data_products pr ON dp.product_id = pr.id
      JOIN users u ON dp.user_id = u.id
      WHERE dp.payment_status = 'completed'
      ORDER BY dp.purchased_at DESC
      LIMIT 5
    )
  );
END;
$$;

-- Search products with filters
CREATE OR REPLACE FUNCTION public.admin_search_data_products(
  search_query TEXT DEFAULT NULL,
  filter_category UUID DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc',
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (products JSON, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  count_result BIGINT;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO count_result
  FROM data_products p
  WHERE
    (search_query IS NULL OR p.name ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
    AND (filter_category IS NULL OR p.category_id = filter_category)
    AND (filter_status IS NULL OR p.status = filter_status);

  -- Get paginated results
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      p.*,
      c.name as category_name,
      c.icon as category_icon,
      u.name as created_by_name
    FROM data_products p
    LEFT JOIN data_categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE
      (search_query IS NULL OR p.name ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
      AND (filter_category IS NULL OR p.category_id = filter_category)
      AND (filter_status IS NULL OR p.status = filter_status)
    ORDER BY
      CASE WHEN sort_by = 'name' AND sort_order = 'asc' THEN p.name END ASC,
      CASE WHEN sort_by = 'name' AND sort_order = 'desc' THEN p.name END DESC,
      CASE WHEN sort_by = 'price' AND sort_order = 'asc' THEN p.price END ASC,
      CASE WHEN sort_by = 'price' AND sort_order = 'desc' THEN p.price END DESC,
      CASE WHEN sort_by = 'purchase_count' AND sort_order = 'asc' THEN p.purchase_count END ASC,
      CASE WHEN sort_by = 'purchase_count' AND sort_order = 'desc' THEN p.purchase_count END DESC,
      CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN p.created_at END ASC,
      CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN p.created_at END DESC,
      p.created_at DESC
    LIMIT page_limit
    OFFSET page_offset
  ) t;

  RETURN QUERY SELECT result, count_result;
END;
$$;

-- Get single product with details
CREATE OR REPLACE FUNCTION public.admin_get_data_product(p_product_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  SELECT row_to_json(t) INTO result
  FROM (
    SELECT
      p.*,
      c.name as category_name,
      c.icon as category_icon,
      u.name as created_by_name,
      u.email as created_by_email,
      (SELECT COALESCE(json_agg(json_build_object(
        'id', pur.id,
        'user_name', usr.name,
        'user_email', usr.email,
        'company_name', comp.name,
        'amount', pur.amount,
        'currency', pur.currency,
        'payment_status', pur.payment_status,
        'purchased_at', pur.purchased_at
      )), '[]'::json)
      FROM data_purchases pur
      JOIN users usr ON pur.user_id = usr.id
      LEFT JOIN companies comp ON pur.company_id = comp.id
      WHERE pur.product_id = p.id
      ORDER BY pur.purchased_at DESC
      LIMIT 20) as recent_purchases,
      (SELECT COUNT(*) FROM data_downloads WHERE product_id = p.id) as total_downloads
    FROM data_products p
    LEFT JOIN data_categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = p_product_id
  ) t;

  RETURN result;
END;
$$;

-- Create product
CREATE OR REPLACE FUNCTION public.admin_create_data_product(
  p_product_data JSONB,
  p_admin_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  INSERT INTO data_products (
    name, slug, description, long_description, category_id,
    price_type, price, currency,
    data_format, data_source, record_count, update_frequency,
    sample_file_url, full_file_url, preview_image_url,
    tags, features, status, is_featured, created_by
  ) VALUES (
    p_product_data->>'name',
    p_product_data->>'slug',
    p_product_data->>'description',
    p_product_data->>'long_description',
    (p_product_data->>'category_id')::UUID,
    COALESCE(p_product_data->>'price_type', 'one_time'),
    COALESCE((p_product_data->>'price')::DECIMAL, 0),
    COALESCE(p_product_data->>'currency', 'EUR'),
    p_product_data->>'data_format',
    p_product_data->>'data_source',
    (p_product_data->>'record_count')::BIGINT,
    p_product_data->>'update_frequency',
    p_product_data->>'sample_file_url',
    p_product_data->>'full_file_url',
    p_product_data->>'preview_image_url',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product_data->'tags')), '{}'),
    COALESCE(p_product_data->'features', '[]'),
    COALESCE(p_product_data->>'status', 'draft'),
    COALESCE((p_product_data->>'is_featured')::BOOLEAN, false),
    p_admin_user_id
  ) RETURNING id INTO new_id;

  -- Log to audit
  INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
  VALUES (p_admin_user_id, 'product_created', 'data_products', new_id,
    jsonb_build_object('name', p_product_data->>'name'));

  SELECT admin_get_data_product(new_id) INTO result;
  RETURN result;
END;
$$;

-- Update product
CREATE OR REPLACE FUNCTION public.admin_update_data_product(
  p_product_id UUID,
  p_updates JSONB,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  old_data JSONB;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get old data for audit
  SELECT to_jsonb(p) INTO old_data
  FROM data_products p WHERE p.id = p_product_id;

  IF old_data IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  UPDATE data_products SET
    name = COALESCE(p_updates->>'name', name),
    description = COALESCE(p_updates->>'description', description),
    long_description = COALESCE(p_updates->>'long_description', long_description),
    category_id = COALESCE((p_updates->>'category_id')::UUID, category_id),
    price_type = COALESCE(p_updates->>'price_type', price_type),
    price = COALESCE((p_updates->>'price')::DECIMAL, price),
    currency = COALESCE(p_updates->>'currency', currency),
    data_format = COALESCE(p_updates->>'data_format', data_format),
    data_source = COALESCE(p_updates->>'data_source', data_source),
    record_count = COALESCE((p_updates->>'record_count')::BIGINT, record_count),
    update_frequency = COALESCE(p_updates->>'update_frequency', update_frequency),
    sample_file_url = COALESCE(p_updates->>'sample_file_url', sample_file_url),
    full_file_url = COALESCE(p_updates->>'full_file_url', full_file_url),
    preview_image_url = COALESCE(p_updates->>'preview_image_url', preview_image_url),
    status = COALESCE(p_updates->>'status', status),
    is_featured = COALESCE((p_updates->>'is_featured')::BOOLEAN, is_featured),
    last_updated = CASE WHEN p_updates ? 'last_updated' THEN NOW() ELSE last_updated END,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Log to audit if admin_id provided
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, previous_value, new_value)
    VALUES (p_admin_id, 'product_updated', 'data_products', p_product_id, old_data, p_updates);
  END IF;

  SELECT admin_get_data_product(p_product_id) INTO result;
  RETURN result;
END;
$$;

-- Delete product
CREATE OR REPLACE FUNCTION public.admin_delete_data_product(
  p_product_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_name TEXT;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get product name for audit
  SELECT name INTO product_name FROM data_products WHERE id = p_product_id;

  IF product_name IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Delete the product (cascades to purchases and downloads)
  DELETE FROM data_products WHERE id = p_product_id;

  -- Log to audit
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
    VALUES (p_admin_id, 'product_deleted', 'data_products', p_product_id,
      jsonb_build_object('name', product_name));
  END IF;

  RETURN true;
END;
$$;

-- Get all categories with product counts
CREATE OR REPLACE FUNCTION public.admin_get_data_categories()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
    FROM (
      SELECT
        dc.*,
        (SELECT COUNT(*) FROM data_products WHERE category_id = dc.id) as product_count
      FROM data_categories dc
      ORDER BY dc.sort_order
    ) c
  );
END;
$$;

-- Create category
CREATE OR REPLACE FUNCTION public.admin_create_data_category(
  p_category_data JSONB,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  INSERT INTO data_categories (name, slug, description, icon, parent_id, sort_order, is_active)
  VALUES (
    p_category_data->>'name',
    p_category_data->>'slug',
    p_category_data->>'description',
    p_category_data->>'icon',
    (p_category_data->>'parent_id')::UUID,
    COALESCE((p_category_data->>'sort_order')::INT, 0),
    COALESCE((p_category_data->>'is_active')::BOOLEAN, true)
  ) RETURNING id INTO new_id;

  -- Log to audit
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
    VALUES (p_admin_id, 'category_created', 'data_categories', new_id,
      jsonb_build_object('name', p_category_data->>'name'));
  END IF;

  SELECT row_to_json(dc) INTO result FROM data_categories dc WHERE dc.id = new_id;
  RETURN result;
END;
$$;

-- Update category
CREATE OR REPLACE FUNCTION public.admin_update_data_category(
  p_category_id UUID,
  p_updates JSONB,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  UPDATE data_categories SET
    name = COALESCE(p_updates->>'name', name),
    slug = COALESCE(p_updates->>'slug', slug),
    description = COALESCE(p_updates->>'description', description),
    icon = COALESCE(p_updates->>'icon', icon),
    sort_order = COALESCE((p_updates->>'sort_order')::INT, sort_order),
    is_active = COALESCE((p_updates->>'is_active')::BOOLEAN, is_active),
    updated_at = NOW()
  WHERE id = p_category_id;

  -- Log to audit
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
    VALUES (p_admin_id, 'category_updated', 'data_categories', p_category_id, p_updates);
  END IF;

  SELECT row_to_json(dc) INTO result FROM data_categories dc WHERE dc.id = p_category_id;
  RETURN result;
END;
$$;

-- Get purchases for a product
CREATE OR REPLACE FUNCTION public.admin_get_product_purchases(p_product_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        c.name as company_name
      FROM data_purchases p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE p.product_id = p_product_id
      ORDER BY p.purchased_at DESC
    ) t
  );
END;
$$;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Data marketplace tables and functions created successfully';
END $$;
