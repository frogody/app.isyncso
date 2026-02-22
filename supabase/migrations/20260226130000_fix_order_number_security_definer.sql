-- Fix generate_b2b_order_number to be SECURITY DEFINER
-- Without this, portal clients (who are not in the users table) can only see
-- their own orders via RLS, causing the MAX(order_number) scan to produce
-- duplicate order numbers across different clients.

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
  WHERE company_id = NEW.company_id;

  NEW.order_number := 'B2B-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;
