-- =============================================================================
-- Reach Marketing Hub - Foundation Tables
-- =============================================================================
-- Creates all tables for the Reach module: brand voice, campaigns, ad variants,
-- scheduled posts, SEO reports, copy studio, social connections, performance
-- metrics, and AI insights.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Brand Voice Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT 'Default',
  tone_descriptors TEXT[] DEFAULT '{}',
  vocabulary_preferences JSONB DEFAULT '{}',
  sentence_patterns JSONB DEFAULT '{}',
  things_to_avoid TEXT[] DEFAULT '{}',
  sample_texts TEXT[] DEFAULT '{}',
  full_analysis JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Ad Campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  platforms TEXT[] DEFAULT '{}',
  ad_type TEXT CHECK (ad_type IN ('single_image', 'carousel', 'video', 'story_reel', 'text_image')),
  campaign_goal TEXT CHECK (campaign_goal IN ('awareness', 'traffic', 'conversions', 'retargeting')),
  target_audience JSONB DEFAULT '{}',
  tone_override TEXT,
  brand_voice_profile_id UUID REFERENCES public.brand_voice_profiles(id),
  additional_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Ad Variants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_ad_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.reach_campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  placement TEXT NOT NULL,
  variant_number INTEGER DEFAULT 1,
  headline TEXT,
  primary_text TEXT,
  cta_label TEXT,
  image_url TEXT,
  video_url TEXT,
  carousel_slides JSONB DEFAULT '[]',
  dimensions JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'exported', 'published')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Content Calendar / Scheduled Posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  caption TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'carousel', 'text')),
  platforms TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  platform_statuses JSONB DEFAULT '{}',
  campaign_id UUID REFERENCES public.reach_campaigns(id),
  ad_variant_id UUID REFERENCES public.reach_ad_variants(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed')),
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. SEO Scan Reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_seo_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  findings JSONB DEFAULT '[]',
  meta_analysis JSONB DEFAULT '{}',
  performance_signals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. Copy Studio Saved Outputs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_copy_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  use_case TEXT NOT NULL,
  inputs JSONB DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  brand_voice_profile_id UUID REFERENCES public.brand_voice_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. Social Account Connections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_social_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter', 'tiktok', 'google_analytics')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_name TEXT,
  account_id TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. Performance Metrics Cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.reach_scheduled_posts(id),
  platform TEXT NOT NULL,
  metric_date DATE NOT NULL,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. AI-Generated Insights
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reach_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- Row Level Security
-- =============================================================================

-- brand_voice_profiles
ALTER TABLE public.brand_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.brand_voice_profiles
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_campaigns
ALTER TABLE public.reach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_campaigns
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_ad_variants (no company_id -- scoped via campaign join)
ALTER TABLE public.reach_ad_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped via campaign" ON public.reach_ad_variants
  FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.reach_campaigns
      WHERE company_id = public.auth_company_id()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.reach_campaigns
      WHERE company_id = public.auth_company_id()
    )
  );

-- reach_scheduled_posts
ALTER TABLE public.reach_scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_scheduled_posts
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_seo_reports
ALTER TABLE public.reach_seo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_seo_reports
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_copy_outputs
ALTER TABLE public.reach_copy_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_copy_outputs
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_social_connections
ALTER TABLE public.reach_social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_social_connections
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_performance_metrics
ALTER TABLE public.reach_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_performance_metrics
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- reach_insights
ALTER TABLE public.reach_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped access" ON public.reach_insights
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());


-- =============================================================================
-- Realtime
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.reach_scheduled_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reach_performance_metrics;


-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_brand_voice_profiles_company ON public.brand_voice_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_profiles_active ON public.brand_voice_profiles(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_reach_campaigns_company ON public.reach_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_reach_campaigns_status ON public.reach_campaigns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_reach_ad_variants_campaign ON public.reach_ad_variants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reach_scheduled_posts_company ON public.reach_scheduled_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_reach_scheduled_posts_scheduled ON public.reach_scheduled_posts(company_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reach_seo_reports_company ON public.reach_seo_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reach_copy_outputs_company ON public.reach_copy_outputs(company_id);
CREATE INDEX IF NOT EXISTS idx_reach_social_connections_company ON public.reach_social_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_reach_performance_metrics_company ON public.reach_performance_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_reach_performance_metrics_date ON public.reach_performance_metrics(company_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_reach_insights_company ON public.reach_insights(company_id);
