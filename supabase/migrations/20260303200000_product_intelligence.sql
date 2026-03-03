-- ============================================================================
-- Product Intelligence: Margins, Alerts, Health Scores
-- ============================================================================

-- 1. Product Margins Table
CREATE TABLE IF NOT EXISTS public.product_margins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  average_cost NUMERIC DEFAULT 0,
  last_purchase_cost NUMERIC DEFAULT 0,
  avg_selling_price NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_units_sold INTEGER DEFAULT 0,
  gross_margin_pct NUMERIC DEFAULT 0,
  gross_margin_absolute NUMERIC DEFAULT 0,
  total_gross_profit NUMERIC DEFAULT 0,
  margin_trend TEXT CHECK (margin_trend IN ('improving', 'stable', 'declining')),
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_reason TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, product_id, period_start)
);

ALTER TABLE public.product_margins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select" ON public.product_margins
  FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "pm_insert" ON public.product_margins
  FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE INDEX idx_pm_company ON public.product_margins(company_id);
CREATE INDEX idx_pm_product ON public.product_margins(product_id);
CREATE INDEX idx_pm_period ON public.product_margins(period_start, period_end);
CREATE INDEX idx_pm_anomaly ON public.product_margins(is_anomaly) WHERE is_anomaly = true;

-- 2. Margin Alerts Table
CREATE TABLE IF NOT EXISTS public.margin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('margin_drop', 'negative_margin', 'cost_spike', 'price_erosion', 'below_threshold')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  current_value NUMERIC,
  previous_value NUMERIC,
  threshold_value NUMERIC,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.margin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_select" ON public.margin_alerts
  FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "ma_update" ON public.margin_alerts
  FOR UPDATE TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "ma_insert" ON public.margin_alerts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE INDEX idx_ma_company ON public.margin_alerts(company_id);
CREATE INDEX idx_ma_product ON public.margin_alerts(product_id);
CREATE INDEX idx_ma_unack ON public.margin_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX idx_ma_severity ON public.margin_alerts(severity);

-- 3. Product Health Scores Table
CREATE TABLE IF NOT EXISTS public.product_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  components JSONB NOT NULL DEFAULT '{}',
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  health_level TEXT CHECK (health_level IN ('thriving', 'healthy', 'watch', 'at_risk', 'critical')),
  computed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, company_id)
);

ALTER TABLE public.product_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phs_select" ON public.product_health_scores
  FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "phs_insert" ON public.product_health_scores
  FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "phs_update" ON public.product_health_scores
  FOR UPDATE TO authenticated
  USING (company_id = auth_company_id());

CREATE INDEX idx_phs_product ON public.product_health_scores(product_id);
CREATE INDEX idx_phs_company ON public.product_health_scores(company_id);
CREATE INDEX idx_phs_health ON public.product_health_scores(health_level);

-- ============================================================================
-- RPC: compute_product_margins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_product_margins(
  p_company_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_product RECORD;
  v_prev_margin NUMERIC;
  v_count INTEGER := 0;
  v_alert_count INTEGER := 0;
BEGIN
  v_period_end := CURRENT_DATE;
  v_period_start := CURRENT_DATE - p_period_days;

  FOR v_product IN
    SELECT
      p.id AS product_id,
      p.name,
      COALESCE(pp.pricing->>'cost_price', pp.pricing->>'base_price', '0')::NUMERIC AS avg_cost,
      COALESCE(
        (SELECT AVG(soi.unit_price)
         FROM sales_order_items soi
         JOIN sales_orders so ON so.id = soi.sales_order_id
         WHERE soi.product_id = p.id
           AND so.company_id = p_company_id
           AND so.order_date >= v_period_start
           AND so.order_date <= v_period_end
           AND so.status NOT IN ('cancelled', 'draft')
        ), 0
      ) AS avg_sell_price,
      COALESCE(
        (SELECT SUM(soi.line_total)
         FROM sales_order_items soi
         JOIN sales_orders so ON so.id = soi.sales_order_id
         WHERE soi.product_id = p.id
           AND so.company_id = p_company_id
           AND so.order_date >= v_period_start
           AND so.order_date <= v_period_end
           AND so.status NOT IN ('cancelled', 'draft')
        ), 0
      ) AS total_rev,
      COALESCE(
        (SELECT SUM(soi.quantity)
         FROM sales_order_items soi
         JOIN sales_orders so ON so.id = soi.sales_order_id
         WHERE soi.product_id = p.id
           AND so.company_id = p_company_id
           AND so.order_date >= v_period_start
           AND so.order_date <= v_period_end
           AND so.status NOT IN ('cancelled', 'draft')
        ), 0
      ) AS total_units
    FROM products p
    LEFT JOIN physical_products pp ON pp.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'published'
  LOOP
    DECLARE
      v_margin_pct NUMERIC := 0;
      v_margin_abs NUMERIC := 0;
      v_gross_profit NUMERIC := 0;
      v_trend TEXT := 'stable';
      v_is_anomaly BOOLEAN := false;
      v_anomaly_reason TEXT := NULL;
    BEGIN
      -- Calculate margins
      IF v_product.avg_sell_price > 0 THEN
        v_margin_abs := v_product.avg_sell_price - v_product.avg_cost;
        v_margin_pct := (v_margin_abs / v_product.avg_sell_price) * 100;
      END IF;
      v_gross_profit := v_margin_abs * v_product.total_units;

      -- Check previous margin for trend
      SELECT gross_margin_pct INTO v_prev_margin
      FROM product_margins
      WHERE product_id = v_product.product_id
        AND company_id = p_company_id
        AND period_start < v_period_start
      ORDER BY period_start DESC
      LIMIT 1;

      IF v_prev_margin IS NOT NULL THEN
        IF v_margin_pct > v_prev_margin + 5 THEN v_trend := 'improving';
        ELSIF v_margin_pct < v_prev_margin - 5 THEN v_trend := 'declining';
        ELSE v_trend := 'stable';
        END IF;
      END IF;

      -- Anomaly detection
      IF v_margin_pct < 0 THEN
        v_is_anomaly := true;
        v_anomaly_reason := 'Negative margin: selling below cost';

        INSERT INTO margin_alerts (company_id, product_id, alert_type, severity, title, description, current_value, previous_value)
        VALUES (p_company_id, v_product.product_id, 'negative_margin', 'critical',
          'Negative Margin: ' || v_product.name,
          'Product is being sold below cost. Margin: ' || ROUND(v_margin_pct, 1) || '%',
          v_margin_pct, v_prev_margin)
        ON CONFLICT DO NOTHING;
        v_alert_count := v_alert_count + 1;

      ELSIF v_prev_margin IS NOT NULL AND v_margin_pct < v_prev_margin * 0.8 THEN
        v_is_anomaly := true;
        v_anomaly_reason := 'Margin dropped >20% from previous period';

        INSERT INTO margin_alerts (company_id, product_id, alert_type, severity, title, description, current_value, previous_value)
        VALUES (p_company_id, v_product.product_id, 'margin_drop', 'high',
          'Margin Drop: ' || v_product.name,
          'Margin dropped from ' || ROUND(v_prev_margin, 1) || '% to ' || ROUND(v_margin_pct, 1) || '%',
          v_margin_pct, v_prev_margin)
        ON CONFLICT DO NOTHING;
        v_alert_count := v_alert_count + 1;
      END IF;

      -- Upsert margin record
      INSERT INTO product_margins (
        company_id, product_id, average_cost, last_purchase_cost, avg_selling_price,
        total_revenue, total_units_sold, gross_margin_pct, gross_margin_absolute,
        total_gross_profit, margin_trend, is_anomaly, anomaly_reason,
        period_start, period_end, computed_at
      ) VALUES (
        p_company_id, v_product.product_id, v_product.avg_cost, v_product.avg_cost,
        v_product.avg_sell_price, v_product.total_rev, v_product.total_units,
        ROUND(v_margin_pct, 2), ROUND(v_margin_abs, 2), ROUND(v_gross_profit, 2),
        v_trend, v_is_anomaly, v_anomaly_reason,
        v_period_start, v_period_end, now()
      )
      ON CONFLICT (company_id, product_id, period_start) DO UPDATE SET
        average_cost = EXCLUDED.average_cost,
        last_purchase_cost = EXCLUDED.last_purchase_cost,
        avg_selling_price = EXCLUDED.avg_selling_price,
        total_revenue = EXCLUDED.total_revenue,
        total_units_sold = EXCLUDED.total_units_sold,
        gross_margin_pct = EXCLUDED.gross_margin_pct,
        gross_margin_absolute = EXCLUDED.gross_margin_absolute,
        total_gross_profit = EXCLUDED.total_gross_profit,
        margin_trend = EXCLUDED.margin_trend,
        is_anomaly = EXCLUDED.is_anomaly,
        anomaly_reason = EXCLUDED.anomaly_reason,
        computed_at = now();

      v_count := v_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'products_processed', v_count,
    'alerts_created', v_alert_count,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$;

-- ============================================================================
-- RPC: compute_product_health
-- ============================================================================

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
  v_count INTEGER := 0;
  v_sales_velocity INTEGER;
  v_stock_health INTEGER;
  v_margin_health INTEGER;
  v_listing_quality INTEGER;
  v_return_rate INTEGER;
  v_overall INTEGER;
  v_health_level TEXT;
  v_trend TEXT;
  v_prev_score INTEGER;
BEGIN
  FOR v_product IN
    SELECT
      p.id AS product_id,
      p.name,
      p.status,
      p.description,
      p.short_description,
      p.featured_image,
      p.gallery,
      p.tags,
      pp.inventory,
      pp.pricing,
      pp.specifications
    FROM products p
    LEFT JOIN physical_products pp ON pp.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'published'
  LOOP
    -- 1. Sales Velocity (25%) — recent orders in last 30 days
    SELECT COALESCE(SUM(soi.quantity), 0) INTO v_sales_velocity
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = v_product.product_id
      AND so.company_id = p_company_id
      AND so.order_date >= CURRENT_DATE - 30
      AND so.status NOT IN ('cancelled', 'draft');

    -- Normalize: 0 units = 10, 1-5 = 40, 6-20 = 60, 21-50 = 80, 50+ = 100
    v_sales_velocity := CASE
      WHEN v_sales_velocity = 0 THEN 10
      WHEN v_sales_velocity <= 5 THEN 40
      WHEN v_sales_velocity <= 20 THEN 60
      WHEN v_sales_velocity <= 50 THEN 80
      ELSE 100
    END;

    -- 2. Stock Health (25%)
    DECLARE
      v_qty INTEGER := COALESCE((v_product.inventory->>'quantity')::INTEGER, 0);
      v_threshold INTEGER := COALESCE((v_product.inventory->>'low_stock_threshold')::INTEGER, 10);
    BEGIN
      v_stock_health := CASE
        WHEN v_qty = 0 THEN 0
        WHEN v_qty <= v_threshold THEN 30
        WHEN v_qty <= v_threshold * 2 THEN 60
        WHEN v_qty <= v_threshold * 5 THEN 85
        ELSE 100
      END;
    END;

    -- 3. Margin Health (20%)
    SELECT COALESCE(
      (SELECT CASE
        WHEN pm.gross_margin_pct < 0 THEN 0
        WHEN pm.gross_margin_pct < 10 THEN 30
        WHEN pm.gross_margin_pct < 25 THEN 50
        WHEN pm.gross_margin_pct < 40 THEN 75
        ELSE 100
       END
       FROM product_margins pm
       WHERE pm.product_id = v_product.product_id
         AND pm.company_id = p_company_id
       ORDER BY pm.period_start DESC LIMIT 1
      ), 50  -- default if no margin data
    ) INTO v_margin_health;

    -- 4. Listing Quality (15%) — images, description, tags
    v_listing_quality := 20; -- base
    IF v_product.featured_image IS NOT NULL THEN v_listing_quality := v_listing_quality + 25; END IF;
    IF v_product.gallery IS NOT NULL AND jsonb_array_length(v_product.gallery) > 0 THEN v_listing_quality := v_listing_quality + 15; END IF;
    IF v_product.description IS NOT NULL AND length(v_product.description) > 50 THEN v_listing_quality := v_listing_quality + 20; END IF;
    IF v_product.short_description IS NOT NULL THEN v_listing_quality := v_listing_quality + 10; END IF;
    IF v_product.tags IS NOT NULL AND array_length(v_product.tags, 1) > 0 THEN v_listing_quality := v_listing_quality + 10; END IF;
    v_listing_quality := LEAST(100, v_listing_quality);

    -- 5. Return Rate (15%) — placeholder (no returns table yet), default 80
    v_return_rate := 80;

    -- Weighted overall
    v_overall := (v_sales_velocity * 25 + v_stock_health * 25 + v_margin_health * 20 + v_listing_quality * 15 + v_return_rate * 15) / 100;

    -- Health level
    v_health_level := CASE
      WHEN v_overall >= 80 THEN 'thriving'
      WHEN v_overall >= 60 THEN 'healthy'
      WHEN v_overall >= 40 THEN 'watch'
      WHEN v_overall >= 20 THEN 'at_risk'
      ELSE 'critical'
    END;

    -- Trend from previous score
    SELECT overall_score INTO v_prev_score
    FROM product_health_scores
    WHERE product_id = v_product.product_id AND company_id = p_company_id;

    v_trend := CASE
      WHEN v_prev_score IS NULL THEN 'stable'
      WHEN v_overall > v_prev_score + 5 THEN 'improving'
      WHEN v_overall < v_prev_score - 5 THEN 'declining'
      ELSE 'stable'
    END;

    -- Upsert
    INSERT INTO product_health_scores (product_id, company_id, overall_score, components, trend, health_level, computed_at, updated_at)
    VALUES (
      v_product.product_id, p_company_id, v_overall,
      jsonb_build_object(
        'sales_velocity', v_sales_velocity,
        'stock_health', v_stock_health,
        'margin_health', v_margin_health,
        'listing_quality', v_listing_quality,
        'return_rate', v_return_rate
      ),
      v_trend, v_health_level, now(), now()
    )
    ON CONFLICT (product_id, company_id) DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      components = EXCLUDED.components,
      trend = EXCLUDED.trend,
      health_level = EXCLUDED.health_level,
      computed_at = now(),
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'products_scored', v_count,
    'company_id', p_company_id
  );
END;
$$;
