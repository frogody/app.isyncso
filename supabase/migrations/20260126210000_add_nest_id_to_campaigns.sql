-- Migration: Add nest_id to campaigns table
-- Created: 2026-01-26
-- Description: Links campaigns to source nests for tracking candidate origin

-- Add nest_id foreign key to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS nest_id UUID REFERENCES public.nests(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_campaigns_nest ON public.campaigns(nest_id);

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.nest_id IS 'Reference to the source nest used for candidate sourcing in this campaign';
