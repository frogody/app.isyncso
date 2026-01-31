-- Add AI context column to digital_products for AI Brief / AI Context system
ALTER TABLE public.digital_products ADD COLUMN IF NOT EXISTS ai_context JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.digital_products.ai_context IS 'AI Brief context data: target persona, positioning, use cases, social proof, brand voice, industry context';
