-- Billing & Revenue Module Migration
-- Phase 9: Subscription Plans, Invoices, Payments, Coupons

-- ============================================================================
-- Subscription Plans Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Features
  features JSONB DEFAULT '[]', -- Array of feature strings
  limits JSONB DEFAULT '{}', -- e.g., {"users": 5, "storage_gb": 10, "api_calls": 10000}

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,

  -- Stripe Integration
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Company Subscriptions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),

  -- Subscription Details
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'expired')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- Dates
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  -- Stripe Integration
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  -- Pricing at time of subscription
  price_at_subscription DECIMAL(10,2),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id)
);

-- ============================================================================
-- Invoices Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.company_subscriptions(id),

  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'canceled', 'refunded')),

  -- Dates
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Line Items
  line_items JSONB DEFAULT '[]',

  -- Stripe Integration
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  -- PDF
  pdf_url TEXT,

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Payments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- 'card', 'bank_transfer', 'paypal', etc.

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')),

  -- Card Details (masked)
  card_brand TEXT, -- 'visa', 'mastercard', etc.
  card_last4 TEXT,

  -- Stripe Integration
  stripe_payment_id TEXT,
  stripe_charge_id TEXT,

  -- Error Handling
  failure_code TEXT,
  failure_message TEXT,

  -- Refund
  refunded_amount DECIMAL(10,2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Coupons Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Discount Type
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Usage Limits
  max_uses INT,
  current_uses INT DEFAULT 0,
  max_uses_per_customer INT DEFAULT 1,

  -- Applicable Plans
  applicable_plans UUID[], -- Array of plan IDs, NULL means all plans

  -- Restrictions
  minimum_amount DECIMAL(10,2),
  first_subscription_only BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stripe Integration
  stripe_coupon_id TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Coupon Redemptions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.company_subscriptions(id),

  -- Discount Applied
  discount_amount DECIMAL(10,2) NOT NULL,

  -- Audit
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(coupon_id, company_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON public.subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON public.company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Subscription Plans - Anyone can view active plans
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);

-- Company Subscriptions - Platform admins full access
CREATE POLICY "Platform admins full access to subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Company Subscriptions - Companies can view own
CREATE POLICY "Companies can view own subscription" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Invoices - Platform admins full access
CREATE POLICY "Platform admins full access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Invoices - Companies can view own
CREATE POLICY "Companies can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Payments - Platform admins full access
CREATE POLICY "Platform admins full access to payments" ON public.payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Payments - Companies can view own
CREATE POLICY "Companies can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Coupons - Platform admins full access
CREATE POLICY "Platform admins full access to coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Coupons - Anyone can view active coupons
CREATE POLICY "Anyone can view active coupons" ON public.coupons
  FOR SELECT TO authenticated USING (is_active = true);

-- Coupon Redemptions - Platform admins full access
CREATE POLICY "Platform admins full access to redemptions" ON public.coupon_redemptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.subscription_plans TO authenticated;
GRANT ALL ON public.company_subscriptions TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.coupon_redemptions TO authenticated;

-- ============================================================================
-- Seed Subscription Plans
-- ============================================================================

INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_active, is_featured, sort_order) VALUES
  ('Free', 'free', 'Get started with basic features', 0, 0,
   '["Up to 3 users", "Basic analytics", "Email support", "1GB storage"]'::jsonb,
   '{"users": 3, "storage_gb": 1, "api_calls": 1000}'::jsonb,
   true, false, 1),
  ('Starter', 'starter', 'Perfect for small teams', 29, 290,
   '["Up to 10 users", "Advanced analytics", "Priority email support", "10GB storage", "API access"]'::jsonb,
   '{"users": 10, "storage_gb": 10, "api_calls": 10000}'::jsonb,
   true, false, 2),
  ('Professional', 'professional', 'For growing businesses', 79, 790,
   '["Up to 50 users", "Full analytics suite", "Phone & email support", "100GB storage", "API access", "Custom integrations", "SSO"]'::jsonb,
   '{"users": 50, "storage_gb": 100, "api_calls": 100000}'::jsonb,
   true, true, 3),
  ('Enterprise', 'enterprise', 'For large organizations', 199, 1990,
   '["Unlimited users", "Enterprise analytics", "Dedicated support", "Unlimited storage", "API access", "Custom integrations", "SSO", "SLA", "Custom contracts"]'::jsonb,
   '{"users": -1, "storage_gb": -1, "api_calls": -1}'::jsonb,
   true, false, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed Coupons
-- ============================================================================

INSERT INTO public.coupons (code, name, description, discount_type, discount_value, valid_until, max_uses, first_subscription_only) VALUES
  ('WELCOME20', 'Welcome Discount', '20% off your first month', 'percentage', 20, NOW() + INTERVAL '1 year', 1000, true),
  ('ANNUAL50', 'Annual Bonus', '$50 off annual subscription', 'fixed_amount', 50, NOW() + INTERVAL '1 year', 500, false),
  ('STARTUP30', 'Startup Special', '30% off for startups', 'percentage', 30, NOW() + INTERVAL '6 months', 200, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Admin Functions
-- ============================================================================

-- Get billing overview
CREATE OR REPLACE FUNCTION public.admin_get_billing_overview()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mrr DECIMAL(10,2);
  arr DECIMAL(10,2);
BEGIN
  -- Calculate MRR from active subscriptions
  SELECT COALESCE(SUM(
    CASE
      WHEN cs.billing_cycle = 'monthly' THEN sp.price_monthly
      WHEN cs.billing_cycle = 'yearly' THEN sp.price_yearly / 12
      ELSE 0
    END
  ), 0) INTO mrr
  FROM company_subscriptions cs
  JOIN subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.status = 'active';

  arr := mrr * 12;

  RETURN json_build_object(
    'mrr', mrr,
    'arr', arr,
    'active_subscriptions', (SELECT COUNT(*) FROM company_subscriptions WHERE status = 'active'),
    'trialing', (SELECT COUNT(*) FROM company_subscriptions WHERE status = 'trialing'),
    'canceled_30d', (SELECT COUNT(*) FROM company_subscriptions WHERE status = 'canceled' AND canceled_at > NOW() - INTERVAL '30 days'),
    'pending_invoices', (SELECT COUNT(*) FROM invoices WHERE status IN ('pending', 'overdue')),
    'pending_amount', (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status IN ('pending', 'overdue')),
    'revenue_30d', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days'),
    'subscriptions_by_plan', (
      SELECT COALESCE(json_agg(json_build_object('plan', sp.name, 'count', cnt)), '[]'::json)
      FROM (
        SELECT plan_id, COUNT(*) as cnt
        FROM company_subscriptions
        WHERE status = 'active'
        GROUP BY plan_id
      ) t
      JOIN subscription_plans sp ON t.plan_id = sp.id
    ),
    'subscriptions_by_status', (
      SELECT COALESCE(json_agg(json_build_object('status', status, 'count', cnt)), '[]'::json)
      FROM (SELECT status, COUNT(*) as cnt FROM company_subscriptions GROUP BY status) t
    )
  );
END;
$$;

-- Get revenue chart data
CREATE OR REPLACE FUNCTION public.admin_get_revenue_chart(
  p_days INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
    FROM (
      SELECT
        date_trunc('day', created_at)::date as date,
        SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
      FROM payments
      WHERE created_at > NOW() - (p_days || ' days')::interval
      GROUP BY date_trunc('day', created_at)::date
    ) t
  );
END;
$$;

-- Get subscription plans
CREATE OR REPLACE FUNCTION public.admin_get_subscription_plans()
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
        sp.*,
        (SELECT COUNT(*) FROM company_subscriptions cs WHERE cs.plan_id = sp.id AND cs.status = 'active') as active_subscribers
      FROM subscription_plans sp
      ORDER BY sp.sort_order
    ) t
  );
END;
$$;

-- Get subscriptions
CREATE OR REPLACE FUNCTION public.admin_get_subscriptions(
  p_status TEXT DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
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
        cs.*,
        sp.name as plan_name,
        sp.price_monthly,
        sp.price_yearly,
        c.name as company_name
      FROM company_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      JOIN companies c ON cs.company_id = c.id
      WHERE (p_status IS NULL OR cs.status = p_status)
        AND (p_plan_id IS NULL OR cs.plan_id = p_plan_id)
      ORDER BY cs.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Get invoices
CREATE OR REPLACE FUNCTION public.admin_get_invoices(
  p_status TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
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
        i.*,
        c.name as company_name
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE (p_status IS NULL OR i.status = p_status)
        AND (p_company_id IS NULL OR i.company_id = p_company_id)
      ORDER BY i.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Get payments
CREATE OR REPLACE FUNCTION public.admin_get_payments(
  p_status TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
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
        p.*,
        c.name as company_name,
        i.invoice_number
      FROM payments p
      JOIN companies c ON p.company_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE (p_status IS NULL OR p.status = p_status)
        AND (p_company_id IS NULL OR p.company_id = p_company_id)
      ORDER BY p.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Get coupons
CREATE OR REPLACE FUNCTION public.admin_get_coupons(
  p_active_only BOOLEAN DEFAULT false
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
        c.*,
        (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.coupon_id = c.id) as total_redemptions,
        (SELECT COALESCE(SUM(discount_amount), 0) FROM coupon_redemptions cr WHERE cr.coupon_id = c.id) as total_discount_given
      FROM coupons c
      WHERE NOT p_active_only OR c.is_active = true
      ORDER BY c.created_at DESC
    ) t
  );
END;
$$;

-- Upsert subscription plan
CREATE OR REPLACE FUNCTION public.admin_upsert_plan(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE subscription_plans SET
      name = COALESCE(p_data->>'name', name),
      description = COALESCE(p_data->>'description', description),
      price_monthly = COALESCE((p_data->>'price_monthly')::DECIMAL, price_monthly),
      price_yearly = COALESCE((p_data->>'price_yearly')::DECIMAL, price_yearly),
      features = COALESCE(p_data->'features', features),
      limits = COALESCE(p_data->'limits', limits),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      is_featured = COALESCE((p_data->>'is_featured')::BOOLEAN, is_featured),
      sort_order = COALESCE((p_data->>'sort_order')::INT, sort_order),
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_active, is_featured, sort_order)
    VALUES (
      p_data->>'name',
      p_data->>'slug',
      p_data->>'description',
      COALESCE((p_data->>'price_monthly')::DECIMAL, 0),
      COALESCE((p_data->>'price_yearly')::DECIMAL, 0),
      COALESCE(p_data->'features', '[]'),
      COALESCE(p_data->'limits', '{}'),
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      COALESCE((p_data->>'is_featured')::BOOLEAN, false),
      COALESCE((p_data->>'sort_order')::INT, 0)
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(sp) FROM subscription_plans sp WHERE sp.id = result_id);
END;
$$;

-- Upsert coupon
CREATE OR REPLACE FUNCTION public.admin_upsert_coupon(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE coupons SET
      name = COALESCE(p_data->>'name', name),
      description = COALESCE(p_data->>'description', description),
      discount_type = COALESCE(p_data->>'discount_type', discount_type),
      discount_value = COALESCE((p_data->>'discount_value')::DECIMAL, discount_value),
      valid_until = COALESCE((p_data->>'valid_until')::TIMESTAMPTZ, valid_until),
      max_uses = COALESCE((p_data->>'max_uses')::INT, max_uses),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      first_subscription_only = COALESCE((p_data->>'first_subscription_only')::BOOLEAN, first_subscription_only),
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO coupons (code, name, description, discount_type, discount_value, valid_until, max_uses, is_active, first_subscription_only)
    VALUES (
      p_data->>'code',
      p_data->>'name',
      p_data->>'description',
      p_data->>'discount_type',
      (p_data->>'discount_value')::DECIMAL,
      (p_data->>'valid_until')::TIMESTAMPTZ,
      (p_data->>'max_uses')::INT,
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      COALESCE((p_data->>'first_subscription_only')::BOOLEAN, false)
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(c) FROM coupons c WHERE c.id = result_id);
END;
$$;

-- Update subscription
CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  p_subscription_id UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE company_subscriptions SET
    plan_id = COALESCE((p_data->>'plan_id')::UUID, plan_id),
    status = COALESCE(p_data->>'status', status),
    billing_cycle = COALESCE(p_data->>'billing_cycle', billing_cycle),
    current_period_end = COALESCE((p_data->>'current_period_end')::TIMESTAMPTZ, current_period_end),
    canceled_at = CASE
      WHEN p_data->>'status' = 'canceled' AND canceled_at IS NULL THEN NOW()
      ELSE canceled_at
    END,
    metadata = COALESCE(p_data->'metadata', metadata),
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN (
    SELECT row_to_json(t)
    FROM (
      SELECT
        cs.*,
        sp.name as plan_name,
        c.name as company_name
      FROM company_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      JOIN companies c ON cs.company_id = c.id
      WHERE cs.id = p_subscription_id
    ) t
  );
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.admin_get_billing_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_chart(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_subscription_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_subscriptions(TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_invoices(TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_payments(TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_coupons(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_plan(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_coupon(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, JSONB) TO authenticated;
