-- ---------------------------------------------------------------------------
-- Public Store RLS Policies
-- Allow anonymous (unauthenticated) access to published store data
-- so public storefronts at *.isyncso.com can load products and store configs.
-- ---------------------------------------------------------------------------

-- Published physical products readable by anonymous users
CREATE POLICY "public_store_products_read" ON public.products
  FOR SELECT TO anon
  USING (status = 'published' AND type = 'physical');

-- Inventory for published products
CREATE POLICY "public_store_inventory_read" ON public.inventory
  FOR SELECT TO anon
  USING (product_id IN (SELECT id FROM public.products WHERE status = 'published' AND type = 'physical'));

-- Product categories
CREATE POLICY "public_store_categories_read" ON public.product_categories
  FOR SELECT TO anon
  USING (true);

-- Company ID resolution (organization_id → company_id)
CREATE POLICY "public_store_companies_read" ON public.companies
  FOR SELECT TO anon
  USING (true);

-- Expected deliveries for stock info
CREATE POLICY "public_store_deliveries_read" ON public.expected_deliveries
  FOR SELECT TO anon
  USING (product_id IN (SELECT id FROM public.products WHERE status = 'published' AND type = 'physical'));

-- Note: portal_settings already has "portal_settings_public_read" anon SELECT policy.
