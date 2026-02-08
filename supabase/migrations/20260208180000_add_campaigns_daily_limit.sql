-- Add daily_limit column to campaigns table
-- Supports outreach rate limiting (max candidates to contact per day)
-- Referenced by GrowthCampaigns.jsx and TalentCampaignDetail.jsx
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50;
