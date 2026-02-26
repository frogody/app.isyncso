-- Allow portal clients to INSERT orders (they could only SELECT before)
-- Required for the B2B storefront checkout flow where the buyer creates their own order

CREATE POLICY "b2b_orders_client_insert" ON public.b2b_orders
FOR INSERT TO authenticated
WITH CHECK (
  client_id IN (
    SELECT id FROM portal_clients
    WHERE auth_user_id = auth_uid()
  )
);
