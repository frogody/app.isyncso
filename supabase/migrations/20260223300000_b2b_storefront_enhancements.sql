-- ═══════════════════════════════════════════════════════════════
-- B2B Storefront Enhancement — New Tables + Auto Sales Order
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Client Favorites ──

CREATE TABLE IF NOT EXISTS public.client_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, product_id)
);

ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

-- Org users can view all favorites for their org
CREATE POLICY "client_favorites_org_read" ON public.client_favorites
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

-- Portal clients can manage their own favorites
CREATE POLICY "client_favorites_client_all" ON public.client_favorites
  FOR ALL TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

CREATE INDEX IF NOT EXISTS idx_client_favorites_client ON public.client_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_product ON public.client_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_org ON public.client_favorites(organization_id);

-- ── 2. Order Templates ──

CREATE TABLE IF NOT EXISTS public.client_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(client_id, name)
);

ALTER TABLE public.client_order_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_templates_org_read" ON public.client_order_templates
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "client_templates_client_all" ON public.client_order_templates
  FOR ALL TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

CREATE INDEX IF NOT EXISTS idx_client_templates_client ON public.client_order_templates(client_id);

-- ── 3. Client Notifications ──

CREATE TABLE IF NOT EXISTS public.client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order_status', 'stock_alert', 'price_change', 'announcement', 'invoice', 'inquiry_reply', 'general')),
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_notifications_org_read" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "client_notifications_org_insert" ON public.client_notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "client_notifications_client_select" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

CREATE POLICY "client_notifications_client_update" ON public.client_notifications
  FOR UPDATE TO authenticated
  USING (client_id IN (
    SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
  ));

CREATE INDEX IF NOT EXISTS idx_client_notifications_client ON public.client_notifications(client_id, is_read);
CREATE INDEX IF NOT EXISTS idx_client_notifications_org ON public.client_notifications(organization_id, created_at DESC);

-- ── 4. Order Messages ──

CREATE TABLE IF NOT EXISTS public.b2b_order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'merchant')),
  sender_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_messages_org_all" ON public.b2b_order_messages
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "order_messages_client_select" ON public.b2b_order_messages
  FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT id FROM public.b2b_orders WHERE client_id IN (
      SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
    )
  ));

CREATE POLICY "order_messages_client_insert" ON public.b2b_order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'client' AND
    order_id IN (
      SELECT id FROM public.b2b_orders WHERE client_id IN (
        SELECT id FROM public.portal_clients WHERE auth_user_id = auth_uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_order_messages_order ON public.b2b_order_messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_messages_unread ON public.b2b_order_messages(order_id) WHERE is_read = false;

-- ── 5. Store Announcements ──

CREATE TABLE IF NOT EXISTS public.store_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'promo', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.store_announcements ENABLE ROW LEVEL SECURITY;

-- Org users can manage announcements
CREATE POLICY "announcements_org_all" ON public.store_announcements
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

-- Portal clients can read non-expired announcements for their org
CREATE POLICY "announcements_client_read" ON public.store_announcements
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.portal_clients WHERE auth_user_id = auth_uid()
    )
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE INDEX IF NOT EXISTS idx_announcements_org ON public.store_announcements(organization_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.store_announcements(organization_id) WHERE is_pinned = true;

-- ── 6. Auto Sales Order from B2B Order Approval ──

CREATE OR REPLACE FUNCTION public.auto_create_sales_order_from_b2b()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales_order_id UUID;
  v_client_name TEXT;
  v_created_by UUID;
BEGIN
  -- Only fire when status changes to confirmed and no sales_order yet
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') AND NEW.sales_order_id IS NULL THEN

    -- Get client company name
    SELECT COALESCE(company_name, full_name, email) INTO v_client_name
    FROM portal_clients WHERE id = NEW.client_id;

    -- Get the approver as created_by (or first org user as fallback)
    v_created_by := NEW.approved_by;
    IF v_created_by IS NULL THEN
      SELECT id INTO v_created_by FROM users
      WHERE company_id = NEW.company_id LIMIT 1;
    END IF;

    -- Create the sales order
    INSERT INTO sales_orders (
      company_id, order_number, order_date,
      status, subtotal, total, currency,
      payment_status, internal_notes, metadata,
      created_at, created_by,
      shipping_name,
      shipping_address_line1, shipping_city,
      shipping_postal_code, shipping_country
    ) VALUES (
      NEW.company_id,
      NEW.order_number,
      now(),
      'confirmed',
      NEW.subtotal,
      NEW.total,
      COALESCE(NEW.currency, 'EUR'),
      'pending',
      'Auto-created from B2B wholesale order ' || NEW.order_number,
      jsonb_build_object('source', 'b2b_wholesale', 'b2b_order_id', NEW.id),
      now(),
      v_created_by,
      v_client_name,
      COALESCE(NEW.shipping_address->>'line1', ''),
      COALESCE(NEW.shipping_address->>'city', ''),
      COALESCE(NEW.shipping_address->>'postal_code', ''),
      COALESCE(NEW.shipping_address->>'country', 'NL')
    ) RETURNING id INTO v_sales_order_id;

    -- Link B2B order to sales order
    NEW.sales_order_id := v_sales_order_id;

    -- Copy line items to sales_order_items
    INSERT INTO sales_order_items (
      sales_order_id, product_id, product_name, sku,
      quantity, unit_price, line_total
    )
    SELECT
      v_sales_order_id,
      boi.product_id,
      boi.product_name,
      boi.sku,
      boi.quantity,
      boi.unit_price,
      boi.line_total
    FROM b2b_order_items boi
    WHERE boi.b2b_order_id = NEW.id;

    RAISE NOTICE 'Auto-created sales_order % from B2B order %', v_sales_order_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists to avoid conflict
DROP TRIGGER IF EXISTS trg_b2b_auto_sales_order ON public.b2b_orders;

CREATE TRIGGER trg_b2b_auto_sales_order
  BEFORE UPDATE ON public.b2b_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_sales_order_from_b2b();

-- ── 7. Client Notification Trigger on Order Status Changes ──

CREATE OR REPLACE FUNCTION public.notify_client_on_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_action_url TEXT;
  v_type TEXT := 'order_status';
  v_order_num TEXT;
BEGIN
  -- Only fire on status changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_order_num := COALESCE(NEW.order_number, 'B2B-' || LEFT(NEW.id::text, 8));
  v_action_url := '/shop/orders/' || NEW.id;

  CASE NEW.status
    WHEN 'confirmed' THEN
      v_title := 'Order ' || v_order_num || ' confirmed';
      v_message := 'Your order has been confirmed and is being prepared.';
    WHEN 'processing' THEN
      v_title := 'Order ' || v_order_num || ' is being processed';
      v_message := 'Your order is being prepared for shipment.';
    WHEN 'shipped' THEN
      v_title := 'Order ' || v_order_num || ' shipped';
      v_message := 'Your order has been shipped! Check your order for tracking details.';
    WHEN 'delivered' THEN
      v_title := 'Order ' || v_order_num || ' delivered';
      v_message := 'Your order has been delivered. Thank you for your business!';
    WHEN 'cancelled' THEN
      v_title := 'Order ' || v_order_num || ' cancelled';
      v_message := 'Your order has been cancelled. Contact us if you have questions.';
    ELSE
      RETURN NEW; -- Don't notify for other statuses
  END CASE;

  INSERT INTO client_notifications (
    client_id, organization_id, type, title, message, action_url, metadata
  ) VALUES (
    NEW.client_id, NEW.organization_id, v_type, v_title, v_message, v_action_url,
    jsonb_build_object('order_id', NEW.id, 'order_number', v_order_num, 'new_status', NEW.status)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_order_client_notification ON public.b2b_orders;

CREATE TRIGGER trg_b2b_order_client_notification
  AFTER UPDATE ON public.b2b_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_order_status();

-- ── 8. Client Notification on New Order Message from Merchant ──

CREATE OR REPLACE FUNCTION public.notify_client_on_merchant_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_order_num TEXT;
BEGIN
  -- Only notify for merchant messages
  IF NEW.sender_type != 'merchant' THEN
    RETURN NEW;
  END IF;

  SELECT client_id, COALESCE(order_number, 'B2B-' || LEFT(id::text, 8))
  INTO v_client_id, v_order_num
  FROM b2b_orders WHERE id = NEW.order_id;

  IF v_client_id IS NOT NULL THEN
    INSERT INTO client_notifications (
      client_id, organization_id, type, title, message, action_url, metadata
    ) VALUES (
      v_client_id, NEW.organization_id, 'order_status',
      'New message on order ' || v_order_num,
      LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
      '/shop/orders/' || NEW.order_id,
      jsonb_build_object('order_id', NEW.order_id, 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_merchant_message_notification ON public.b2b_order_messages;

CREATE TRIGGER trg_b2b_merchant_message_notification
  AFTER INSERT ON public.b2b_order_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_merchant_message();
