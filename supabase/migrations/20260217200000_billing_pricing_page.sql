-- ============================================================
-- Migration: Billing & Pricing Page Support
-- ============================================================

-- 1. Add stripe_customer_id to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_stripe_customer
  ON public.companies(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- 2. Create credit_packs table
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  badge TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_packs_read" ON public.credit_packs
  FOR SELECT TO authenticated USING (true);

-- Seed credit packs (Benelux EUR pricing)
INSERT INTO public.credit_packs (name, slug, credits, price, currency, badge, sort_order) VALUES
  ('Starter Pack', 'starter-100', 100, 9.00, 'EUR', NULL, 1),
  ('Growth Pack', 'growth-500', 500, 39.00, 'EUR', 'Popular', 2),
  ('Power Pack', 'power-2000', 2000, 129.00, 'EUR', 'Best Value', 3),
  ('Enterprise Pack', 'enterprise-10000', 10000, 499.00, 'EUR', NULL, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  badge = EXCLUDED.badge,
  sort_order = EXCLUDED.sort_order;

-- 3. Create credit_pack_purchases table
CREATE TABLE IF NOT EXISTS public.credit_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  credit_pack_id UUID REFERENCES public.credit_packs(id),
  credits INTEGER NOT NULL,
  amount_paid DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  stripe_checkout_session_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.credit_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_pack_purchases_read" ON public.credit_pack_purchases
  FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- 4. Update subscription_plans to EUR Benelux pricing
UPDATE public.subscription_plans SET
  price_monthly = 0,
  price_yearly = 0,
  currency = 'EUR',
  features = '["Basic dashboard","1 user","Community support"]'::jsonb,
  limits = '{"seats":1,"credits_monthly":10,"storage_gb":1,"apps":["learn"]}'::jsonb
WHERE slug = 'free';

UPDATE public.subscription_plans SET
  price_monthly = 49,
  price_yearly = 470,
  currency = 'EUR',
  features = '["3 team members","100 credits/month","5 GB storage","Learn & Growth apps","Email support"]'::jsonb,
  limits = '{"seats":3,"credits_monthly":100,"storage_gb":5,"apps":["learn","growth"]}'::jsonb
WHERE slug = 'starter';

UPDATE public.subscription_plans SET
  price_monthly = 99,
  price_yearly = 950,
  currency = 'EUR',
  is_featured = true,
  features = '["10 team members","500 credits/month","25 GB storage","Learn, Growth, Finance & Create","Priority support","API access"]'::jsonb,
  limits = '{"seats":10,"credits_monthly":500,"storage_gb":25,"apps":["learn","growth","finance","create"]}'::jsonb
WHERE slug = 'professional';

UPDATE public.subscription_plans SET
  price_monthly = 199,
  price_yearly = 1910,
  currency = 'EUR',
  features = '["25 team members","2000 credits/month","100 GB storage","All 7 apps","Dedicated support","Custom integrations","Advanced analytics"]'::jsonb,
  limits = '{"seats":25,"credits_monthly":2000,"storage_gb":100,"apps":["learn","growth","finance","create","sentinel","raise","talent"]}'::jsonb
WHERE slug = 'enterprise';

-- Add is_featured column if not exists
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
-- Add currency column if not exists
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
