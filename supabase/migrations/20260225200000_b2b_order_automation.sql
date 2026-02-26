-- ---------------------------------------------------------------------------
-- B2B Order Automation: schema changes for the order processing pipeline.
-- Makes shipping_tasks.sales_order_id nullable, adds b2b_order_id to
-- shipping_tasks and invoices, creates b2b_order_notifications table.
-- ---------------------------------------------------------------------------

-- 1. Make shipping_tasks.sales_order_id nullable for B2B orders
ALTER TABLE public.shipping_tasks ALTER COLUMN sales_order_id DROP NOT NULL;

-- 2. Add b2b_order_id to shipping_tasks
ALTER TABLE public.shipping_tasks
  ADD COLUMN IF NOT EXISTS b2b_order_id UUID REFERENCES b2b_orders(id);

-- 3. Add b2b_order_id to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS b2b_order_id UUID REFERENCES b2b_orders(id);

-- 4. Create b2b_order_notifications table (email logging for webhook)
CREATE TABLE IF NOT EXISTS public.b2b_order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  event TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  html_body TEXT,
  status TEXT DEFAULT 'logged',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_order_notif_org_access" ON public.b2b_order_notifications
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

-- Index for fast lookups by order
CREATE INDEX IF NOT EXISTS idx_b2b_order_notifications_order
  ON public.b2b_order_notifications (order_id);

-- Index for shipping tasks B2B lookup
CREATE INDEX IF NOT EXISTS idx_shipping_tasks_b2b_order
  ON public.shipping_tasks (b2b_order_id)
  WHERE b2b_order_id IS NOT NULL;

-- Index for invoices B2B lookup
CREATE INDEX IF NOT EXISTS idx_invoices_b2b_order
  ON public.invoices (b2b_order_id)
  WHERE b2b_order_id IS NOT NULL;
