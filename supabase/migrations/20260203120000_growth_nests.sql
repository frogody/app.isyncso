-- =====================================================
-- GROWTH NESTS - Purchasable Lead Datasets for Growth Module
-- =====================================================

-- 1. growth_nests table (admin-managed purchasable datasets)
CREATE TABLE IF NOT EXISTS public.growth_nests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  industry TEXT,
  region TEXT,
  lead_count INTEGER DEFAULT 0,
  titles TEXT[] DEFAULT '{}',
  included_fields JSONB DEFAULT '[]'::jsonb,
  price_credits INTEGER DEFAULT 99,
  price_usd DECIMAL(10,2) DEFAULT 49.00,
  preview_data JSONB DEFAULT '[]'::jsonb,
  csv_storage_path TEXT,
  column_schema JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  badge TEXT CHECK (badge IN ('popular', 'new', 'best_value', NULL)),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. growth_nest_purchases table
CREATE TABLE IF NOT EXISTS public.growth_nest_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nest_id UUID NOT NULL REFERENCES public.growth_nests(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.enrich_workspaces(id) ON DELETE SET NULL,
  price_paid_credits INTEGER,
  price_paid_usd DECIMAL(10,2),
  payment_method TEXT CHECK (payment_method IN ('credits', 'stripe')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, nest_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_growth_nests_active ON public.growth_nests(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_growth_nests_featured ON public.growth_nests(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_growth_nests_industry ON public.growth_nests(industry);
CREATE INDEX IF NOT EXISTS idx_growth_nests_region ON public.growth_nests(region);
CREATE INDEX IF NOT EXISTS idx_growth_nest_purchases_user ON public.growth_nest_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_nest_purchases_nest ON public.growth_nest_purchases(nest_id);
CREATE INDEX IF NOT EXISTS idx_growth_nest_purchases_workspace ON public.growth_nest_purchases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_growth_nest_purchases_status ON public.growth_nest_purchases(status);

-- 4. RLS Policies
ALTER TABLE public.growth_nests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_nest_purchases ENABLE ROW LEVEL SECURITY;

-- growth_nests: Anyone can view active nests
DROP POLICY IF EXISTS "Anyone can view active growth nests" ON public.growth_nests;
CREATE POLICY "Anyone can view active growth nests" ON public.growth_nests
  FOR SELECT USING (is_active = true);

-- growth_nests: Platform admins can manage all
DROP POLICY IF EXISTS "Platform admins manage growth nests" ON public.growth_nests;
CREATE POLICY "Platform admins manage growth nests" ON public.growth_nests
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- growth_nest_purchases: Users can view own purchases
DROP POLICY IF EXISTS "Users can view own growth nest purchases" ON public.growth_nest_purchases;
CREATE POLICY "Users can view own growth nest purchases" ON public.growth_nest_purchases
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

-- growth_nest_purchases: Users can create own purchases
DROP POLICY IF EXISTS "Users can create growth nest purchases" ON public.growth_nest_purchases;
CREATE POLICY "Users can create growth nest purchases" ON public.growth_nest_purchases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_uid());

-- growth_nest_purchases: Platform admins can manage all
DROP POLICY IF EXISTS "Platform admins manage growth nest purchases" ON public.growth_nest_purchases;
CREATE POLICY "Platform admins manage growth nest purchases" ON public.growth_nest_purchases
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- 5. Storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('growth-nests', 'growth-nests', false, 52428800, ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for growth-nests bucket
DROP POLICY IF EXISTS "Platform admins can upload to growth-nests" ON storage.objects;
CREATE POLICY "Platform admins can upload to growth-nests" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'growth-nests' AND is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can read growth-nests" ON storage.objects;
CREATE POLICY "Platform admins can read growth-nests" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'growth-nests' AND is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update growth-nests" ON storage.objects;
CREATE POLICY "Platform admins can update growth-nests" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'growth-nests' AND is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can delete growth-nests" ON storage.objects;
CREATE POLICY "Platform admins can delete growth-nests" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'growth-nests' AND is_platform_admin());

-- 6. Seed 6 placeholder nests
INSERT INTO public.growth_nests (name, short_description, description, industry, region, lead_count, titles, price_credits, price_usd, is_active, is_featured, badge, included_fields)
VALUES
  ('US SaaS Tech Leaders', 'Decision makers at top SaaS companies', 'Curated list of VPs and Directors at fast-growing SaaS companies in the US. Includes verified emails and LinkedIn profiles.', 'Technology', 'United States', 500, ARRAY['VP of Sales', 'Director of Marketing', 'CTO', 'VP Engineering'], 99, 49.00, true, true, 'popular', '["email", "linkedin_url", "company", "title", "location"]'::jsonb),
  ('E-commerce Decision Makers', 'Heads of Growth at e-commerce brands', 'Marketing and growth leaders at DTC and e-commerce companies with $10M+ revenue.', 'E-commerce', 'United States', 350, ARRAY['Head of Growth', 'VP Marketing', 'CMO'], 99, 49.00, true, false, 'new', '["email", "linkedin_url", "company", "title"]'::jsonb),
  ('Fintech IT Leaders', 'IT leaders in European fintech', 'CIOs and IT Directors at Series A-C fintech startups across Europe.', 'FinTech', 'Europe', 200, ARRAY['CIO', 'IT Director', 'CTO'], 99, 49.00, true, false, NULL, '["email", "linkedin_url", "company", "title", "funding_stage"]'::jsonb),
  ('HealthTech Buyers', 'Healthcare IT decision makers', 'IT Directors and CIOs at hospitals and healthcare systems in North America.', 'Healthcare', 'North America', 150, ARRAY['IT Director', 'CIO', 'VP of IT'], 99, 49.00, true, false, NULL, '["email", "company", "title", "phone"]'::jsonb),
  ('Agency Tech Buyers', 'Marketing agency business development', 'New business and sales leaders at marketing and creative agencies.', 'Marketing', 'United States', 300, ARRAY['Head of New Business', 'Director of Sales', 'VP Business Development'], 99, 49.00, true, false, 'best_value', '["email", "linkedin_url", "company", "title", "website"]'::jsonb),
  ('European SaaS Leaders', 'European SaaS executives', 'C-level executives at European SaaS companies with $5M+ ARR.', 'Technology', 'Europe', 250, ARRAY['CEO', 'CTO', 'CMO', 'COO'], 99, 49.00, true, false, NULL, '["email", "linkedin_url", "company", "title", "location"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION update_growth_nests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS growth_nests_updated_at ON public.growth_nests;
CREATE TRIGGER growth_nests_updated_at
  BEFORE UPDATE ON public.growth_nests
  FOR EACH ROW EXECUTE FUNCTION update_growth_nests_updated_at();
