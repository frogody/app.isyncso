-- ============================================================================
-- Fix: B2B Chat Security, Inventory Race Condition, Price Function Bug
-- Migration: 20260223100000_fix_b2b_security_and_inventory.sql
--
-- Issue 1: b2b_chat_messages anonymous RLS policies allow any anonymous user
--          to read ALL chat messages and insert messages without restriction.
-- Issue 2: reserve_b2b_inventory() has a race condition between SELECT and
--          UPDATE — concurrent calls can over-reserve inventory.
-- Issue 3: get_b2b_client_price() default price list query is missing the
--          max_quantity boundary check present in client/group queries.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- ISSUE 1: Drop overly permissive anonymous RLS policies on b2b_chat_messages
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "b2b_chat_messages_anon_select" ON public.b2b_chat_messages;
DROP POLICY IF EXISTS "b2b_chat_messages_anon_insert" ON public.b2b_chat_messages;

-- Replace with proper authenticated-only policies scoped to the user's
-- organization. Portal clients (who may not be in the users table) access
-- chat via their portal_clients record linked to the organization.

-- Authenticated org members can read chat messages for their organization
CREATE POLICY "b2b_chat_messages_auth_select"
  ON public.b2b_chat_messages
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM public.portal_clients WHERE auth_user_id = auth.uid()
    )
  );

-- Authenticated org members can insert chat messages for their organization
CREATE POLICY "b2b_chat_messages_auth_insert"
  ON public.b2b_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM public.portal_clients WHERE auth_user_id = auth.uid()
    )
  );

-- Drop the original authenticated policies that only checked users table,
-- since the new ones above cover both org users AND portal clients.
DROP POLICY IF EXISTS "b2b_chat_messages_select" ON public.b2b_chat_messages;
DROP POLICY IF EXISTS "b2b_chat_messages_insert" ON public.b2b_chat_messages;


-- ═══════════════════════════════════════════════════════════════════════════
-- ISSUE 2: Fix race condition in reserve_b2b_inventory()
-- Add FOR UPDATE to the SELECT to lock the inventory row during the
-- transaction, preventing concurrent reservations from reading stale data.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reserve_b2b_inventory(
  p_product_id UUID,
  p_company_id UUID,
  p_quantity INTEGER,
  p_warehouse TEXT DEFAULT 'main'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- Lock the row with FOR UPDATE to prevent concurrent reads of stale data
  SELECT quantity_on_hand - quantity_reserved INTO v_available
  FROM inventory
  WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND warehouse_location = p_warehouse
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN false;
  END IF;

  UPDATE inventory
  SET quantity_reserved = quantity_reserved + p_quantity,
      quantity_allocated_b2b = quantity_allocated_b2b + p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND warehouse_location = p_warehouse;

  RETURN true;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ISSUE 3: Fix missing max_quantity check in get_b2b_client_price()
-- The default price list query (section 4) was missing the upper-bound
-- max_quantity filter that exists in the client and group price list queries.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_b2b_client_price(
  p_client_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(unit_price NUMERIC, source TEXT, discount_percent NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_list_id UUID;
  v_group_price_list_id UUID;
  v_group_discount NUMERIC;
  v_default_price_list_id UUID;
  v_base_price NUMERIC;
  v_found_price NUMERIC;
BEGIN
  -- Get client's direct price list
  SELECT pc.price_list_id, pc.client_group_id INTO v_price_list_id
  FROM portal_clients pc WHERE pc.id = p_client_id;

  -- 1. Check client's direct price list
  IF v_price_list_id IS NOT NULL THEN
    SELECT pli.unit_price INTO v_found_price
    FROM b2b_price_list_items pli
    WHERE pli.price_list_id = v_price_list_id
      AND pli.product_id = p_product_id
      AND pli.min_quantity <= p_quantity
      AND (pli.max_quantity IS NULL OR pli.max_quantity >= p_quantity)
    ORDER BY pli.min_quantity DESC
    LIMIT 1;

    IF v_found_price IS NOT NULL THEN
      RETURN QUERY SELECT v_found_price, 'client_price_list'::TEXT, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- 2. Check client group's price list
  SELECT cg.price_list_id, cg.discount_percentage
  INTO v_group_price_list_id, v_group_discount
  FROM b2b_client_groups cg
  JOIN portal_clients pc ON pc.client_group_id = cg.id
  WHERE pc.id = p_client_id;

  IF v_group_price_list_id IS NOT NULL THEN
    SELECT pli.unit_price INTO v_found_price
    FROM b2b_price_list_items pli
    WHERE pli.price_list_id = v_group_price_list_id
      AND pli.product_id = p_product_id
      AND pli.min_quantity <= p_quantity
      AND (pli.max_quantity IS NULL OR pli.max_quantity >= p_quantity)
    ORDER BY pli.min_quantity DESC
    LIMIT 1;

    IF v_found_price IS NOT NULL THEN
      RETURN QUERY SELECT v_found_price, 'group_price_list'::TEXT, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- 3. Check group discount on base price
  SELECT p.price INTO v_base_price FROM products p WHERE p.id = p_product_id;

  IF v_group_discount IS NOT NULL AND v_group_discount > 0 AND v_base_price IS NOT NULL THEN
    RETURN QUERY SELECT
      ROUND(v_base_price * (1 - v_group_discount / 100), 2),
      'group_discount'::TEXT,
      v_group_discount;
    RETURN;
  END IF;

  -- 4. Check default org price list (FIXED: added max_quantity check)
  SELECT pl.id INTO v_default_price_list_id
  FROM b2b_price_lists pl
  JOIN portal_clients pc ON pc.organization_id = pl.organization_id
  WHERE pc.id = p_client_id AND pl.is_default = true AND pl.status = 'active'
  LIMIT 1;

  IF v_default_price_list_id IS NOT NULL THEN
    SELECT pli.unit_price INTO v_found_price
    FROM b2b_price_list_items pli
    WHERE pli.price_list_id = v_default_price_list_id
      AND pli.product_id = p_product_id
      AND pli.min_quantity <= p_quantity
      AND (pli.max_quantity IS NULL OR pli.max_quantity >= p_quantity)
    ORDER BY pli.min_quantity DESC
    LIMIT 1;

    IF v_found_price IS NOT NULL THEN
      RETURN QUERY SELECT v_found_price, 'default_price_list'::TEXT, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- 5. Fallback: base product price
  RETURN QUERY SELECT COALESCE(v_base_price, 0::NUMERIC), 'base_price'::TEXT, 0::NUMERIC;
END;
$$;

COMMIT;
