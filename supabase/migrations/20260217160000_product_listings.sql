-- Product Listings: AI-generated marketplace-ready listings
CREATE TABLE IF NOT EXISTS product_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  product_id UUID NOT NULL,
  channel TEXT NOT NULL,  -- 'shopify', 'bolcom', 'amazon', 'generic'
  status TEXT DEFAULT 'draft',  -- 'draft', 'ready', 'published', 'needs_update'

  -- AI-Generated Copy
  listing_title TEXT,
  listing_subtitle TEXT,
  listing_description TEXT,
  bullet_points JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  search_keywords JSONB DEFAULT '[]'::jsonb,

  -- AI-Generated Media
  hero_image_url TEXT,
  gallery_urls JSONB DEFAULT '[]'::jsonb,
  lifestyle_urls JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,

  -- Channel-specific data
  channel_data JSONB DEFAULT '{}'::jsonb,

  -- Quality scoring
  listing_score INTEGER,
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  generation_config JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(product_id, channel)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_listings_company ON product_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_product_listings_product ON product_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_listings_channel ON product_listings(channel);

-- RLS
ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_listings_select" ON product_listings
FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "product_listings_insert" ON product_listings
FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "product_listings_update" ON product_listings
FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "product_listings_delete" ON product_listings
FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id());
