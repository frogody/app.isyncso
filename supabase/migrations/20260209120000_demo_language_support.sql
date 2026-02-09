-- Add language column to demo_links for multi-language demo support
ALTER TABLE public.demo_links ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';
CREATE INDEX IF NOT EXISTS idx_demo_links_language ON public.demo_links(language);
