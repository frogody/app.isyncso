-- Table for storing generated listing videos per product
CREATE TABLE IF NOT EXISTS public.product_listing_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID,
  channel TEXT DEFAULT 'generic',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT,
  preset_label TEXT,
  duration INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_listing_videos_product_id ON public.product_listing_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_product_listing_videos_company_id ON public.product_listing_videos(company_id);

ALTER TABLE public.product_listing_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view listing videos" ON public.product_listing_videos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert listing videos" ON public.product_listing_videos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own listing videos" ON public.product_listing_videos
  FOR DELETE TO authenticated USING (true);
