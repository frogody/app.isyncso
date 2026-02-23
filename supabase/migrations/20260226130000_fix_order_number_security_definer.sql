-- Fix generate_b2b_order_number to be SECURITY DEFINER
-- Without this, portal clients (who are not in the users table) can only see
-- their own orders via RLS, causing the MAX(order_number) scan to produce
-- duplicate order numbers across different clients.
--
-- Also drop company_id FK constraint: B2B tables are scoped by organization_id,
-- not the companies table. The checkout code correctly passes orgId as company_id
-- but the FK to companies(id) caused inserts to fail.
--
-- Also scope order_number generation by organization_id instead of company_id
-- for consistency with how B2B orders are actually scoped.

-- Drop the FK constraint that blocks inserts (orgId != companies.id)
ALTER TABLE public.b2b_orders DROP CONSTRAINT IF EXISTS b2b_orders_company_id_fkey;

-- Recreate function: SECURITY DEFINER + scope by organization_id
CREATE OR REPLACE FUNCTION public.generate_b2b_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'B2B-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.b2b_orders
  WHERE organization_id = NEW.organization_id;

  NEW.order_number := 'B2B-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;
