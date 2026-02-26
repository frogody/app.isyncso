-- Portal client RLS policies for invoice and payment access
-- Portal clients need to read invoices and payments linked to their B2B orders.
--
-- IMPORTANT: Policies must NOT reference their own table in subqueries
-- to avoid PostgreSQL "infinite recursion detected in policy" (42P17).

-- Portal clients can view invoices for their own B2B orders
CREATE POLICY "portal_client_view_invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    b2b_order_id IN (
      SELECT bo.id
      FROM public.b2b_orders bo
      JOIN public.portal_clients pc ON pc.id = bo.client_id
      WHERE pc.auth_user_id = auth_uid()
    )
  );

-- Portal clients can view payments for invoices linked to their orders
CREATE POLICY "portal_client_view_payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT i.id
      FROM public.invoices i
      JOIN public.b2b_orders bo ON bo.id = i.b2b_order_id
      JOIN public.portal_clients pc ON pc.id = bo.client_id
      WHERE pc.auth_user_id = auth_uid()
    )
  );
