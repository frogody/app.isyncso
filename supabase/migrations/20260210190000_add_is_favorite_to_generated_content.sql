-- Add is_favorite column to generated_content table
ALTER TABLE public.generated_content ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Index for filtering favorites efficiently
CREATE INDEX IF NOT EXISTS idx_generated_content_is_favorite ON public.generated_content (is_favorite) WHERE is_favorite = true;
