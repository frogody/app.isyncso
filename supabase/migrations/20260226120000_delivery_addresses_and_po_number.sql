-- ============================================================================
-- Multiple Delivery Addresses + Auto-Generated PO Numbers
-- ============================================================================

-- 1. Add delivery_addresses JSONB array to portal_clients
-- Each entry: { id, label, street, city, postal_code, state, country, is_default }
ALTER TABLE public.portal_clients
  ADD COLUMN IF NOT EXISTS delivery_addresses JSONB DEFAULT '[]'::jsonb;

-- 2. Add phone column to portal_clients (was missing but UI referenced it)
ALTER TABLE public.portal_clients
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Add dedicated po_number column to b2b_orders
ALTER TABLE public.b2b_orders
  ADD COLUMN IF NOT EXISTS po_number TEXT;

-- 4. Create index for PO number lookups
CREATE INDEX IF NOT EXISTS idx_b2b_orders_po_number
  ON public.b2b_orders(po_number)
  WHERE po_number IS NOT NULL;

-- 5. Create sequence for PO numbers (per-organization, reset yearly)
-- We use a simple global sequence + organization prefix approach
CREATE SEQUENCE IF NOT EXISTS public.b2b_po_number_seq START 1;

-- 6. Function to auto-generate PO number on INSERT
CREATE OR REPLACE FUNCTION public.generate_b2b_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
BEGIN
  -- Only generate if po_number is not already set
  IF NEW.po_number IS NOT NULL AND NEW.po_number != '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(NOW(), 'YYYY');
  v_seq := nextval('b2b_po_number_seq');

  -- Format: PO-YYYY-NNNNN (e.g. PO-2026-00001)
  NEW.po_number := 'PO-' || v_year || '-' || lpad(v_seq::text, 5, '0');

  RETURN NEW;
END;
$$;

-- 7. Attach trigger
DROP TRIGGER IF EXISTS trg_b2b_po_number ON public.b2b_orders;
CREATE TRIGGER trg_b2b_po_number
  BEFORE INSERT ON public.b2b_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_b2b_po_number();

-- 8. Migrate existing shipping/billing addresses into delivery_addresses array
-- for clients that have a shipping_address but no delivery_addresses yet
UPDATE public.portal_clients
SET delivery_addresses = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'label', 'Primary',
    'street', COALESCE(shipping_address->>'street', ''),
    'city', COALESCE(shipping_address->>'city', ''),
    'postal_code', COALESCE(shipping_address->>'postal_code', shipping_address->>'zip', ''),
    'state', COALESCE(shipping_address->>'state', ''),
    'country', COALESCE(shipping_address->>'country', ''),
    'is_default', true
  )
)
WHERE shipping_address IS NOT NULL
  AND shipping_address != '{}'::jsonb
  AND (delivery_addresses IS NULL OR delivery_addresses = '[]'::jsonb);

-- Also add billing address as second entry if different
UPDATE public.portal_clients
SET delivery_addresses = delivery_addresses || jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'label', 'Billing',
    'street', COALESCE(billing_address->>'street', ''),
    'city', COALESCE(billing_address->>'city', ''),
    'postal_code', COALESCE(billing_address->>'postal_code', billing_address->>'zip', ''),
    'state', COALESCE(billing_address->>'state', ''),
    'country', COALESCE(billing_address->>'country', ''),
    'is_default', false
  )
)
WHERE billing_address IS NOT NULL
  AND billing_address != '{}'::jsonb
  AND billing_address IS DISTINCT FROM shipping_address
  AND delivery_addresses IS NOT NULL
  AND jsonb_array_length(delivery_addresses) > 0;
