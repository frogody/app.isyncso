-- Portal client RLS policies for tracking data access
-- Portal clients (B2B storefront users) need to read shipping_tasks
-- and tracking_jobs to see shipment tracking on the order detail page.

-- Portal clients can view shipping tasks for their own orders
CREATE POLICY "portal_client_view_shipping_tasks" ON public.shipping_tasks
  FOR SELECT TO authenticated
  USING (
    b2b_order_id IN (
      SELECT bo.id
      FROM public.b2b_orders bo
      JOIN public.portal_clients pc ON pc.id = bo.client_id
      WHERE pc.auth_user_id = auth_uid()
    )
  );

-- Portal clients can view tracking jobs linked to their shipping tasks
CREATE POLICY "portal_client_view_tracking_jobs" ON public.tracking_jobs
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT tj.id
      FROM public.tracking_jobs tj
      JOIN public.shipping_tasks st ON st.id = tj.shipping_task_id
      JOIN public.b2b_orders bo ON bo.id = st.b2b_order_id
      JOIN public.portal_clients pc ON pc.id = bo.client_id
      WHERE pc.auth_user_id = auth_uid()
    )
  );
