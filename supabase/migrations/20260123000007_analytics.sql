-- Analytics & Insights Module Migration
-- Phase 6: Platform Analytics for Admin Backend

-- ============================================================================
-- Analytics Events Table (for tracking user actions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL, -- 'page_view', 'feature_use', 'login', 'signup', etc.
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Context
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,

  -- Session
  session_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Daily Aggregated Metrics (pre-computed for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'users', 'revenue', 'signups', 'app_usage', etc.
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,2) DEFAULT 0,
  dimensions JSONB DEFAULT '{}', -- For segmentation (by company, app, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(metric_date, metric_type, metric_name, dimensions)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_company ON public.analytics_events(company_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_type ON public.analytics_daily_metrics(metric_type);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Platform admins full access to events" ON public.analytics_events;
DROP POLICY IF EXISTS "Platform admins full access to metrics" ON public.analytics_daily_metrics;

-- Platform admins can access all analytics data
CREATE POLICY "Platform admins full access to events" ON public.analytics_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      JOIN public.users u ON pa.user_id = u.auth_id
      WHERE u.id = auth.uid() AND pa.is_active = true
    )
  );

CREATE POLICY "Platform admins full access to metrics" ON public.analytics_daily_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      JOIN public.users u ON pa.user_id = u.auth_id
      WHERE u.id = auth.uid() AND pa.is_active = true
    )
  );

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_daily_metrics TO authenticated;

-- ============================================================================
-- Analytics Helper Functions
-- ============================================================================

-- Get overview stats with period comparison
CREATE OR REPLACE FUNCTION public.admin_get_analytics_overview(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_start DATE := p_start_date - (p_end_date - p_start_date);
  prev_end DATE := p_start_date - INTERVAL '1 day';
  result JSON;
BEGIN
  SELECT json_build_object(
    'period', json_build_object('start', p_start_date, 'end', p_end_date),

    -- User metrics
    'total_users', (SELECT COUNT(*) FROM users),
    'new_users', (SELECT COUNT(*) FROM users WHERE created_at::DATE BETWEEN p_start_date AND p_end_date),
    'new_users_prev', (SELECT COUNT(*) FROM users WHERE created_at::DATE BETWEEN prev_start AND prev_end),

    'active_users', (SELECT COUNT(DISTINCT id) FROM users WHERE last_login::DATE BETWEEN p_start_date AND p_end_date),
    'active_users_prev', (SELECT COUNT(DISTINCT id) FROM users WHERE last_login::DATE BETWEEN prev_start AND prev_end),

    -- Organization metrics
    'total_organizations', (SELECT COUNT(*) FROM companies),
    'new_organizations', (SELECT COUNT(*) FROM companies WHERE created_at::DATE BETWEEN p_start_date AND p_end_date),
    'new_organizations_prev', (SELECT COUNT(*) FROM companies WHERE created_at::DATE BETWEEN prev_start AND prev_end),

    -- Revenue metrics (from data purchases and app licenses)
    'total_revenue', COALESCE((
      SELECT SUM(amount) FROM data_purchases
      WHERE payment_status = 'completed' AND purchased_at::DATE BETWEEN p_start_date AND p_end_date
    ), 0) + COALESCE((
      SELECT SUM(amount) FROM app_licenses
      WHERE status = 'active' AND created_at::DATE BETWEEN p_start_date AND p_end_date
    ), 0),
    'total_revenue_prev', COALESCE((
      SELECT SUM(amount) FROM data_purchases
      WHERE payment_status = 'completed' AND purchased_at::DATE BETWEEN prev_start AND prev_end
    ), 0) + COALESCE((
      SELECT SUM(amount) FROM app_licenses
      WHERE status = 'active' AND created_at::DATE BETWEEN prev_start AND prev_end
    ), 0),

    -- App metrics
    'total_app_licenses', (SELECT COUNT(*) FROM app_licenses WHERE status = 'active'),
    'new_app_licenses', (SELECT COUNT(*) FROM app_licenses WHERE status = 'active' AND created_at::DATE BETWEEN p_start_date AND p_end_date),

    -- Data product metrics
    'total_data_products', (SELECT COUNT(*) FROM data_products WHERE status = 'published'),
    'total_data_purchases', (SELECT COUNT(*) FROM data_purchases WHERE payment_status = 'completed' AND purchased_at::DATE BETWEEN p_start_date AND p_end_date)
  ) INTO result;

  RETURN result;
END;
$$;

-- Get user growth over time
CREATE OR REPLACE FUNCTION public.admin_get_user_growth(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        CASE p_granularity
          WHEN 'day' THEN created_at::DATE
          WHEN 'week' THEN DATE_TRUNC('week', created_at)::DATE
          WHEN 'month' THEN DATE_TRUNC('month', created_at)::DATE
          ELSE created_at::DATE
        END as date,
        COUNT(*) as new_users,
        SUM(COUNT(*)) OVER (ORDER BY
          CASE p_granularity
            WHEN 'day' THEN created_at::DATE
            WHEN 'week' THEN DATE_TRUNC('week', created_at)::DATE
            WHEN 'month' THEN DATE_TRUNC('month', created_at)::DATE
            ELSE created_at::DATE
          END
        ) as cumulative_users
      FROM users
      WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
      GROUP BY 1
      ORDER BY 1
    ) t
  );
END;
$$;

-- Get revenue over time
CREATE OR REPLACE FUNCTION public.admin_get_revenue_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        date,
        COALESCE(SUM(data_revenue), 0) as data_revenue,
        COALESCE(SUM(license_revenue), 0) as license_revenue,
        COALESCE(SUM(data_revenue), 0) + COALESCE(SUM(license_revenue), 0) as total_revenue
      FROM (
        -- Data purchases
        SELECT
          CASE p_granularity
            WHEN 'day' THEN purchased_at::DATE
            WHEN 'week' THEN DATE_TRUNC('week', purchased_at)::DATE
            WHEN 'month' THEN DATE_TRUNC('month', purchased_at)::DATE
            ELSE purchased_at::DATE
          END as date,
          amount as data_revenue,
          0::DECIMAL as license_revenue
        FROM data_purchases
        WHERE payment_status = 'completed' AND purchased_at::DATE BETWEEN p_start_date AND p_end_date

        UNION ALL

        -- App licenses
        SELECT
          CASE p_granularity
            WHEN 'day' THEN created_at::DATE
            WHEN 'week' THEN DATE_TRUNC('week', created_at)::DATE
            WHEN 'month' THEN DATE_TRUNC('month', created_at)::DATE
            ELSE created_at::DATE
          END as date,
          0::DECIMAL as data_revenue,
          amount as license_revenue
        FROM app_licenses
        WHERE status = 'active' AND created_at::DATE BETWEEN p_start_date AND p_end_date
      ) combined
      GROUP BY date
      ORDER BY date
    ) t
  );
END;
$$;

-- Get app usage stats
CREATE OR REPLACE FUNCTION public.admin_get_app_usage_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        a.id,
        a.name,
        a.slug,
        a.icon,
        a.category,
        a.pricing_type,
        COUNT(DISTINCT l.company_id) as licensed_companies,
        COUNT(DISTINCT l.id) as total_licenses,
        COALESCE(SUM(l.amount), 0) as total_revenue,
        COALESCE((SELECT COUNT(*) FROM app_usage_logs u WHERE u.app_id = a.id AND u.created_at::DATE BETWEEN p_start_date AND p_end_date), 0) as usage_count
      FROM platform_apps a
      LEFT JOIN app_licenses l ON a.id = l.app_id AND l.status = 'active'
      WHERE a.is_active = true
      GROUP BY a.id, a.name, a.slug, a.icon, a.category, a.pricing_type
      ORDER BY licensed_companies DESC, usage_count DESC
    ) t
  );
END;
$$;

-- Get top users by activity
CREATE OR REPLACE FUNCTION public.admin_get_top_users(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_limit INT DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.role,
        c.name as company_name,
        u.last_login,
        COALESCE((SELECT COUNT(*) FROM analytics_events e WHERE e.user_id = u.id AND e.created_at::DATE BETWEEN p_start_date AND p_end_date), 0) as event_count
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.last_login IS NOT NULL
      ORDER BY u.last_login DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Get organization stats
CREATE OR REPLACE FUNCTION public.admin_get_organization_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        c.id,
        c.name,
        c.industry,
        c.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as user_count,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.last_login::DATE BETWEEN p_start_date AND p_end_date) as active_users,
        (SELECT COUNT(*) FROM app_licenses l WHERE l.company_id = c.id AND l.status = 'active') as app_licenses,
        COALESCE((SELECT SUM(l.amount) FROM app_licenses l WHERE l.company_id = c.id AND l.status = 'active'), 0) as monthly_spend
      FROM companies c
      WHERE c.is_active = true
      ORDER BY user_count DESC
    ) t
  );
END;
$$;

-- Get daily active users trend
CREATE OR REPLACE FUNCTION public.admin_get_dau_trend(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        d.date::DATE as date,
        COUNT(DISTINCT u.id) as dau
      FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d(date)
      LEFT JOIN users u ON u.last_login::DATE = d.date::DATE
      GROUP BY d.date
      ORDER BY d.date
    ) t
  );
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.admin_get_analytics_overview(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_growth(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_analytics(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_app_usage_stats(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_top_users(DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_organization_analytics(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_dau_trend(DATE, DATE) TO authenticated;
