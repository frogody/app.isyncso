-- Customer reservation columns on stock_purchases
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS reserved_for_customer_id UUID REFERENCES public.crm_companies(id);
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS reserved_for_customer_name TEXT;
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS reserved_for_portal_client_id UUID REFERENCES public.portal_clients(id);

CREATE INDEX IF NOT EXISTS idx_stock_purchases_reserved_customer
  ON public.stock_purchases(reserved_for_customer_id) WHERE reserved_for_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_purchases_reserved_portal
  ON public.stock_purchases(reserved_for_portal_client_id) WHERE reserved_for_portal_client_id IS NOT NULL;

-- Link expected_deliveries back to stock_purchases for reservation data
ALTER TABLE public.expected_deliveries ADD COLUMN IF NOT EXISTS stock_purchase_id UUID REFERENCES public.stock_purchases(id);
CREATE INDEX IF NOT EXISTS idx_expected_deliveries_stock_purchase
  ON public.expected_deliveries(stock_purchase_id) WHERE stock_purchase_id IS NOT NULL;
