-- Fix RLS policies for products tables to allow INSERT operations
-- The original policies used FOR ALL USING without WITH CHECK, which doesn't work for INSERT

-- ============================================================================
-- DROP OLD POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Admins can manage digital products" ON public.digital_products;
DROP POLICY IF EXISTS "Admins can manage physical products" ON public.physical_products;

-- ============================================================================
-- CREATE NEW POLICIES WITH PROPER WITH CHECK CLAUSES
-- ============================================================================

-- Products: Allow users to INSERT/UPDATE/DELETE products for their own company
CREATE POLICY "Users can manage products for their company" ON public.products
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Suppliers: Allow users to manage suppliers for their company
CREATE POLICY "Users can manage suppliers for their company" ON public.suppliers
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Product Categories: Allow users to manage categories for their company
CREATE POLICY "Users can manage categories for their company" ON public.product_categories
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Digital Products: Allow users to manage digital products for their company
CREATE POLICY "Users can manage digital products for their company" ON public.digital_products
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Physical Products: Allow users to manage physical products for their company
CREATE POLICY "Users can manage physical products for their company" ON public.physical_products
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM public.products WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );
