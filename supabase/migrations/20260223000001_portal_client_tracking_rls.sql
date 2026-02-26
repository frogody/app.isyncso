-- Portal client RLS policies for tracking data access
-- Portal clients (B2B storefront users) need to read shipping_tasks,
-- tracking_jobs, and shipment_checkpoints to see shipment tracking.
--
-- IMPORTANT: Policies must NOT reference their own table in subqueries
-- to avoid PostgreSQL "infinite recursion detected in policy" (42P17).

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
-- NOTE: Goes through shipping_tasks (not self-referencing tracking_jobs)
CREATE POLICY "portal_client_view_tracking_jobs" ON public.tracking_jobs
  FOR SELECT TO authenticated
  USING (
    shipping_task_id IN (
      SELECT st.id
      FROM public.shipping_tasks st
      JOIN public.b2b_orders bo ON bo.id = st.b2b_order_id
      JOIN public.portal_clients pc ON pc.id = bo.client_id
      WHERE pc.auth_user_id = auth_uid()
    )
  );

-- Portal clients can view checkpoints for their tracking jobs
-- NOTE: Goes through shipping_tasks.tracking_job_id (not tracking_jobs table)
CREATE POLICY "checkpoints_portal_client" ON public.shipment_checkpoints
  FOR SELECT TO authenticated
  USING (
    tracking_job_id IN (
      SELECT st.tracking_job_id
      FROM public.shipping_tasks st
      JOIN public.b2b_orders bo ON bo.id = st.b2b_order_id
      JOIN public.portal_clients pc ON pc.id = bo.client_id
      WHERE pc.auth_user_id = auth_uid()
        AND st.tracking_job_id IS NOT NULL
    )
  );
