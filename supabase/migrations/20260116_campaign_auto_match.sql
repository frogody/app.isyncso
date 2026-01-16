-- Add auto-match settings to campaigns table
-- Auto-matching runs automatically when campaign is activated

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS auto_match_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS min_match_score INTEGER DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.auto_match_enabled IS 'When true, automatically run candidate matching when campaign is activated';
COMMENT ON COLUMN public.campaigns.min_match_score IS 'Minimum match score threshold (0-100) for candidates to be included';
