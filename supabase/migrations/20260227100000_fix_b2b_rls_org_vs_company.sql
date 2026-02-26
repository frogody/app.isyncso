-- Fix B2B RLS: organization_id vs company_id mismatch
-- Problem: Users can have different organization_id and company_id values.
-- B2B orders store organization_id, but RLS compared against auth_company_id()
-- (which returns the user's company_id). This made B2B orders invisible.

-- 1. Create auth_organization_id() helper function
CREATE OR REPLACE FUNCTION public.auth_organization_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.users WHERE id = auth.uid() $$;

-- 2. Fix b2b_orders RLS to check both organization_id and company_id
DROP POLICY IF EXISTS "b2b_orders_org" ON public.b2b_orders;
CREATE POLICY "b2b_orders_org" ON public.b2b_orders
  FOR ALL TO authenticated
  USING (
    organization_id = auth_organization_id()
    OR organization_id = auth_company_id()
  );

-- 3. Fix b2b_order_items RLS similarly
DROP POLICY IF EXISTS "b2b_order_items_via_order" ON public.b2b_order_items;
CREATE POLICY "b2b_order_items_via_order" ON public.b2b_order_items
  FOR ALL TO authenticated
  USING (
    b2b_order_id IN (
      SELECT id FROM b2b_orders
      WHERE organization_id = auth_organization_id()
         OR organization_id = auth_company_id()
         OR client_id IN (
              SELECT id FROM portal_clients WHERE auth_user_id = auth_uid()
            )
    )
  );
