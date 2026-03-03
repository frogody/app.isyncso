-- Recalibrate health scoring algorithms
-- Problem: Client health all scores 17-27 (critical), Product health inflated by hardcoded return rate
-- Fix: Adjust defaults for missing data (neutral instead of penalizing), softer engagement curve

-- ============================================================
-- 1. RECALIBRATED compute_client_health
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_client_health(
  p_prospect_id UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect RECORD;
  v_payment_score INTEGER;
  v_engagement_score INTEGER;
  v_volume_score INTEGER;
  v_communication_score INTEGER;
  v_overall_score INTEGER;
  v_risk_level TEXT;
  v_trend TEXT;
  v_previous_score INTEGER;
  v_total_invoices INTEGER;
  v_paid_on_time INTEGER;
  v_total_revenue NUMERIC;
  v_days_since_update INTEGER;
  v_days_since_comm INTEGER;
  v_last_comm TIMESTAMPTZ;
BEGIN
  -- Get prospect
  SELECT * INTO v_prospect FROM prospects WHERE id = p_prospect_id;
  IF v_prospect IS NULL THEN
    RETURN jsonb_build_object('error', 'Prospect not found');
  END IF;

  -- ============================================================
  -- COMPONENT 1: Payment Timeliness (30% weight)
  -- If no invoices exist, score 65 (neutral-positive, not penalized)
  -- ============================================================
  SELECT
    COUNT(*) FILTER (WHERE status = 'paid' AND amount_paid >= total AND updated_at <= due_date + INTERVAL '7 days'),
    COUNT(*)
  INTO v_paid_on_time, v_total_invoices
  FROM invoices
  WHERE company_id = p_company_id
    AND (
      LOWER(client_email) = LOWER(v_prospect.email)
      OR LOWER(client_name) ILIKE '%' || LOWER(COALESCE(v_prospect.first_name, '')) || '%'
      OR LOWER(client_name) ILIKE '%' || LOWER(COALESCE(v_prospect.last_name, '')) || '%'
      OR LOWER(client_name) ILIKE '%' || LOWER(COALESCE(v_prospect.company, '')) || '%'
    );

  IF v_total_invoices = 0 THEN
    v_payment_score := 65;  -- No invoices = neutral-positive (was 50)
  ELSE
    v_payment_score := ROUND((v_paid_on_time::NUMERIC / v_total_invoices) * 100)::INTEGER;
  END IF;

  -- ============================================================
  -- COMPONENT 2: Engagement Frequency (25% weight)
  -- Softer curve: less harsh for older prospects
  -- ============================================================
  v_days_since_update := EXTRACT(DAY FROM NOW() - COALESCE(v_prospect.updated_date, v_prospect.created_date, NOW() - INTERVAL '90 days'))::INTEGER;

  IF v_days_since_update < 3 THEN
    v_engagement_score := 100;
  ELSIF v_days_since_update < 7 THEN
    v_engagement_score := 85;   -- was 80
  ELSIF v_days_since_update < 14 THEN
    v_engagement_score := 70;   -- was 60
  ELSIF v_days_since_update < 30 THEN
    v_engagement_score := 55;   -- was 40
  ELSIF v_days_since_update < 60 THEN
    v_engagement_score := 40;   -- was 20
  ELSE
    v_engagement_score := 25;   -- was 10
  END IF;

  -- Stage bonus (kept same)
  IF v_prospect.stage IN ('won', 'customer') THEN
    v_engagement_score := LEAST(100, v_engagement_score + 20);
  ELSIF v_prospect.stage IN ('negotiation', 'proposal') THEN
    v_engagement_score := LEAST(100, v_engagement_score + 10);
  END IF;

  -- ============================================================
  -- COMPONENT 3: Order Volume Trend (25% weight)
  -- $0 revenue = 40 (neutral) instead of 20
  -- ============================================================
  SELECT COALESCE(SUM(total), 0) INTO v_total_revenue
  FROM invoices
  WHERE company_id = p_company_id
    AND status IN ('paid', 'sent', 'overdue')
    AND (
      LOWER(client_email) = LOWER(v_prospect.email)
      OR LOWER(client_name) ILIKE '%' || LOWER(COALESCE(v_prospect.first_name, '')) || '%'
      OR LOWER(client_name) ILIKE '%' || LOWER(COALESCE(v_prospect.last_name, '')) || '%'
      OR LOWER(client_name) ILIKE '%' || LOWER(COALESCE(v_prospect.company, '')) || '%'
    );

  IF v_total_revenue > 10000 THEN
    v_volume_score := 100;
  ELSIF v_total_revenue > 5000 THEN
    v_volume_score := 80;
  ELSIF v_total_revenue > 1000 THEN
    v_volume_score := 65;    -- was 60
  ELSIF v_total_revenue > 0 THEN
    v_volume_score := 50;    -- was 40
  ELSE
    v_volume_score := 40;    -- was 20 — no data = neutral
  END IF;

  -- ============================================================
  -- COMPONENT 4: Communication Recency (20% weight)
  -- No semantic data = 45 (neutral) instead of ~5
  -- ============================================================
  SELECT MAX(sa.created_at) INTO v_last_comm
  FROM semantic_activities sa
  JOIN entity_business_links ebl ON ebl.entity_id::TEXT = ANY(
    SELECT jsonb_array_elements_text(sa.metadata->'entity_ids')
  )
  WHERE sa.user_id IN (
    SELECT id FROM users WHERE company_id = p_company_id
  )
  AND sa.activity_type = 'COMMUNICATING'
  AND ebl.business_type = 'prospect'
  AND ebl.business_id = p_prospect_id;

  IF v_last_comm IS NULL THEN
    v_communication_score := 45;  -- was max(10, engagement-10) ≈ 0-10
  ELSE
    v_days_since_comm := EXTRACT(DAY FROM NOW() - v_last_comm)::INTEGER;
    IF v_days_since_comm < 3 THEN
      v_communication_score := 100;
    ELSIF v_days_since_comm < 7 THEN
      v_communication_score := 80;
    ELSIF v_days_since_comm < 14 THEN
      v_communication_score := 60;
    ELSIF v_days_since_comm < 30 THEN
      v_communication_score := 40;
    ELSE
      v_communication_score := 20;
    END IF;
  END IF;

  -- ============================================================
  -- OVERALL SCORE (same weights)
  -- ============================================================
  v_overall_score := ROUND(
    (v_payment_score * 0.30) +
    (v_engagement_score * 0.25) +
    (v_volume_score * 0.25) +
    (v_communication_score * 0.20)
  )::INTEGER;

  -- ============================================================
  -- RISK LEVEL (same thresholds)
  -- ============================================================
  IF v_overall_score >= 70 THEN
    v_risk_level := 'healthy';
  ELSIF v_overall_score >= 50 THEN
    v_risk_level := 'watch';
  ELSIF v_overall_score >= 30 THEN
    v_risk_level := 'at_risk';
  ELSE
    v_risk_level := 'critical';
  END IF;

  -- ============================================================
  -- TREND (compare to previous)
  -- ============================================================
  SELECT overall_score INTO v_previous_score
  FROM client_health_scores
  WHERE prospect_id = p_prospect_id AND company_id = p_company_id;

  IF v_previous_score IS NULL THEN
    v_trend := 'stable';
  ELSIF v_overall_score > v_previous_score + 5 THEN
    v_trend := 'improving';
  ELSIF v_overall_score < v_previous_score - 5 THEN
    v_trend := 'declining';
  ELSE
    v_trend := 'stable';
  END IF;

  -- ============================================================
  -- UPSERT
  -- ============================================================
  INSERT INTO client_health_scores (
    prospect_id, company_id, overall_score, risk_level, trend,
    components, computed_at
  ) VALUES (
    p_prospect_id, p_company_id, v_overall_score, v_risk_level, v_trend,
    jsonb_build_object(
      'payment_timeliness', v_payment_score,
      'engagement_frequency', v_engagement_score,
      'order_volume_trend', v_volume_score,
      'communication_recency', v_communication_score
    ),
    NOW()
  )
  ON CONFLICT (prospect_id, company_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    risk_level = EXCLUDED.risk_level,
    trend = EXCLUDED.trend,
    components = EXCLUDED.components,
    computed_at = EXCLUDED.computed_at;

  RETURN jsonb_build_object(
    'prospect_id', p_prospect_id,
    'overall_score', v_overall_score,
    'risk_level', v_risk_level,
    'trend', v_trend,
    'components', jsonb_build_object(
      'payment_timeliness', v_payment_score,
      'engagement_frequency', v_engagement_score,
      'order_volume_trend', v_volume_score,
      'communication_recency', v_communication_score
    )
  );
END;
$$;

-- ============================================================
-- 2. RECALIBRATED compute_product_health
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_product_health(
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_sales_score INTEGER;
  v_stock_score INTEGER;
  v_margin_score INTEGER;
  v_listing_score INTEGER;
  v_return_score INTEGER;
  v_overall_score INTEGER;
  v_health_level TEXT;
  v_trend TEXT;
  v_previous_score INTEGER;
  v_units_sold INTEGER;
  v_quantity INTEGER;
  v_threshold INTEGER;
  v_margin_pct NUMERIC;
  v_results JSONB := '[]'::JSONB;
  v_count INTEGER := 0;
BEGIN
  FOR v_product IN
    SELECT p.id, p.name, p.featured_image, p.gallery, p.description,
           p.short_description, p.tags, p.status,
           pp.inventory
    FROM products p
    LEFT JOIN physical_products pp ON pp.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'published'
  LOOP
    -- ============================================================
    -- COMPONENT 1: Sales Velocity (25% weight) — kept same
    -- ============================================================
    SELECT COALESCE(SUM(soi.quantity), 0) INTO v_units_sold
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = v_product.id
      AND so.company_id = p_company_id
      AND so.order_date >= CURRENT_DATE - 30
      AND so.status NOT IN ('cancelled', 'draft');

    IF v_units_sold = 0 THEN
      v_sales_score := 10;
    ELSIF v_units_sold <= 5 THEN
      v_sales_score := 40;
    ELSIF v_units_sold <= 20 THEN
      v_sales_score := 60;
    ELSIF v_units_sold <= 50 THEN
      v_sales_score := 80;
    ELSE
      v_sales_score := 100;
    END IF;

    -- ============================================================
    -- COMPONENT 2: Stock Health (25% weight)
    -- NEW: If 0 sales AND in stock, cap at 70 (not 100)
    -- Rewarding warehousing without selling is misleading
    -- ============================================================
    v_quantity := COALESCE((v_product.inventory->>'quantity')::INTEGER, 0);
    v_threshold := COALESCE((v_product.inventory->>'low_stock_threshold')::INTEGER, 5);

    IF v_quantity = 0 THEN
      v_stock_score := 0;
    ELSIF v_quantity <= v_threshold THEN
      v_stock_score := 30;
    ELSIF v_quantity <= v_threshold * 2 THEN
      v_stock_score := 60;
    ELSIF v_quantity <= v_threshold * 5 THEN
      v_stock_score := 85;
    ELSE
      v_stock_score := 100;
    END IF;

    -- If no sales but in stock, cap stock health at 70
    IF v_units_sold = 0 AND v_stock_score > 70 THEN
      v_stock_score := 70;
    END IF;

    -- ============================================================
    -- COMPONENT 3: Margin Health (20% weight)
    -- No data = 40 (slightly below neutral, was 50)
    -- ============================================================
    SELECT gross_margin_pct INTO v_margin_pct
    FROM product_margins
    WHERE product_id = v_product.id AND company_id = p_company_id
    ORDER BY period_start DESC LIMIT 1;

    IF v_margin_pct IS NULL THEN
      v_margin_score := 40;   -- was 50
    ELSIF v_margin_pct < 0 THEN
      v_margin_score := 0;
    ELSIF v_margin_pct < 10 THEN
      v_margin_score := 30;
    ELSIF v_margin_pct < 25 THEN
      v_margin_score := 50;
    ELSIF v_margin_pct < 40 THEN
      v_margin_score := 75;
    ELSE
      v_margin_score := 100;
    END IF;

    -- ============================================================
    -- COMPONENT 4: Listing Quality (15% weight) — kept same
    -- ============================================================
    v_listing_score := 20;
    IF v_product.featured_image IS NOT NULL THEN
      v_listing_score := v_listing_score + 25;
    END IF;
    IF v_product.gallery IS NOT NULL AND jsonb_array_length(v_product.gallery) > 0 THEN
      v_listing_score := v_listing_score + 15;
    END IF;
    IF v_product.description IS NOT NULL AND LENGTH(v_product.description) > 50 THEN
      v_listing_score := v_listing_score + 20;
    END IF;
    IF v_product.short_description IS NOT NULL THEN
      v_listing_score := v_listing_score + 10;
    END IF;
    IF v_product.tags IS NOT NULL AND jsonb_array_length(v_product.tags) > 0 THEN
      v_listing_score := v_listing_score + 10;
    END IF;
    v_listing_score := LEAST(100, v_listing_score);

    -- ============================================================
    -- COMPONENT 5: Return Rate (15% weight)
    -- Changed: 50 (neutral placeholder) instead of 80 (inflated)
    -- ============================================================
    v_return_score := 50;  -- was 80

    -- ============================================================
    -- OVERALL SCORE (same weights)
    -- ============================================================
    v_overall_score := ROUND(
      (v_sales_score * 0.25) +
      (v_stock_score * 0.25) +
      (v_margin_score * 0.20) +
      (v_listing_score * 0.15) +
      (v_return_score * 0.15)
    )::INTEGER;

    -- ============================================================
    -- CAP: If zero sales in last 30 days, cap overall at 45 (watch)
    -- A product nobody is buying shouldn't be "healthy"
    -- ============================================================
    IF v_units_sold = 0 AND v_overall_score > 45 THEN
      v_overall_score := 45;
    END IF;

    -- ============================================================
    -- HEALTH LEVEL (same thresholds)
    -- ============================================================
    IF v_overall_score >= 80 THEN
      v_health_level := 'thriving';
    ELSIF v_overall_score >= 60 THEN
      v_health_level := 'healthy';
    ELSIF v_overall_score >= 40 THEN
      v_health_level := 'watch';
    ELSIF v_overall_score >= 20 THEN
      v_health_level := 'at_risk';
    ELSE
      v_health_level := 'critical';
    END IF;

    -- ============================================================
    -- TREND (compare to previous)
    -- ============================================================
    SELECT overall_score INTO v_previous_score
    FROM product_health_scores
    WHERE product_id = v_product.id AND company_id = p_company_id;

    IF v_previous_score IS NULL THEN
      v_trend := 'stable';
    ELSIF v_overall_score > v_previous_score + 5 THEN
      v_trend := 'improving';
    ELSIF v_overall_score < v_previous_score - 5 THEN
      v_trend := 'declining';
    ELSE
      v_trend := 'stable';
    END IF;

    -- ============================================================
    -- UPSERT
    -- ============================================================
    INSERT INTO product_health_scores (
      product_id, company_id, overall_score, health_level, trend,
      components, computed_at
    ) VALUES (
      v_product.id, p_company_id, v_overall_score, v_health_level, v_trend,
      jsonb_build_object(
        'sales_velocity', v_sales_score,
        'stock_health', v_stock_score,
        'margin_health', v_margin_score,
        'listing_quality', v_listing_score,
        'return_rate', v_return_score
      ),
      NOW()
    )
    ON CONFLICT (product_id, company_id) DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      health_level = EXCLUDED.health_level,
      trend = EXCLUDED.trend,
      components = EXCLUDED.components,
      computed_at = EXCLUDED.computed_at;

    v_results := v_results || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'overall_score', v_overall_score,
      'health_level', v_health_level,
      'trend', v_trend
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'computed', v_count,
    'results', v_results
  );
END;
$$;
