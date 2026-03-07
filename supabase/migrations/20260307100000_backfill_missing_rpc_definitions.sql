-- Backfill migration: 6 production RPCs that had no source migration file (H-4 audit item)
-- 4 functions extracted from production via pg_get_functiondef()
-- 2 functions (get_product_purchase_stats, get_reorder_point) do not exist in production — created as stubs

BEGIN;

-- 1. get_user_roles — RBAC role lookup
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
 RETURNS TABLE(role_name text, hierarchy_level integer, scope_type text, scope_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
     BEGIN
       RETURN QUERY
       SELECT r.name, r.hierarchy_level, ur.scope_type, ur.scope_id
       FROM public.rbac_user_roles ur
       JOIN public.rbac_roles r ON ur.role_id = r.id
       WHERE ur.user_id = p_user_id;
     END;
     $function$;

-- 2. get_user_permissions — RBAC permission lookup
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS TABLE(permission_name text, resource text, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
     BEGIN
       RETURN QUERY
       SELECT DISTINCT p.name, p.resource, p.action
       FROM public.rbac_user_roles ur
       JOIN public.rbac_role_permissions rp ON ur.role_id = rp.role_id
       JOIN public.rbac_permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = p_user_id;
     END;
     $function$;

-- 3. check_candidate_current_exclusion — talent exclusion check
CREATE OR REPLACE FUNCTION public.check_candidate_current_exclusion(p_company_name text, p_work_history jsonb, p_organization_id uuid)
 RETURNS TABLE(client_id uuid, client_company text, match_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prospect RECORD;
  v_aliases TEXT[];
BEGIN
  FOR v_prospect IN
    SELECT p.id, p.company, p.company_aliases
    FROM prospects p
    WHERE p.organization_id = p_organization_id
      AND p.exclude_candidates = true
      AND p.is_recruitment_client = true
  LOOP
    v_aliases := COALESCE(v_prospect.company_aliases, ARRAY[]::TEXT[]) || ARRAY[v_prospect.company];
    IF is_currently_at_company(p_company_name, p_work_history, v_aliases) THEN
      client_id := v_prospect.id;
      client_company := v_prospect.company;
      match_type := 'current_employer';
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  RETURN;
END;
$function$;

-- 4. get_store_dashboard_stats — sales dashboard aggregation
CREATE OR REPLACE FUNCTION public.get_store_dashboard_stats(p_company_id uuid, p_period_start timestamp with time zone)
 RETURNS TABLE(source text, order_count bigint, revenue numeric, pending_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(s.source, 'manual') as source,
    COUNT(*) as order_count,
    COALESCE(SUM(s.total), 0) as revenue,
    COUNT(*) FILTER (WHERE s.status = 'pending') as pending_count
  FROM sales_orders s
  WHERE s.company_id = p_company_id
    AND s.order_date >= p_period_start
  GROUP BY COALESCE(s.source, 'manual');
$function$;

-- 5. get_product_purchase_stats — NOT in production; stub for future implementation
-- Returns purchase history stats for a product (avg cost, last purchase date, supplier count)
CREATE OR REPLACE FUNCTION public.get_product_purchase_stats(p_product_id uuid, p_company_id uuid)
 RETURNS TABLE(total_purchased bigint, avg_unit_cost numeric, last_purchase_date timestamptz, supplier_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(SUM(poi.quantity), 0)::bigint AS total_purchased,
    COALESCE(AVG(poi.unit_price), 0) AS avg_unit_cost,
    MAX(po.order_date) AS last_purchase_date,
    COUNT(DISTINCT po.supplier_id)::bigint AS supplier_count
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.product_id = p_product_id
    AND po.company_id = p_company_id;
$function$;

-- 6. get_reorder_point — NOT in production; stub for future implementation
-- Calculates reorder point based on average daily sales and lead time
CREATE OR REPLACE FUNCTION public.get_reorder_point(p_product_id uuid, p_company_id uuid)
 RETURNS TABLE(avg_daily_sales numeric, lead_time_days integer, safety_stock integer, reorder_point integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    0::numeric AS avg_daily_sales,
    7 AS lead_time_days,
    0 AS safety_stock,
    0 AS reorder_point;
$function$;

COMMIT;
