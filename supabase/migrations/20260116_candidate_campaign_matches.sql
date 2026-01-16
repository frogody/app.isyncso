-- Create table to store candidate-campaign match results
-- This allows viewing all campaigns a candidate has matched with from the candidate profile

CREATE TABLE IF NOT EXISTS public.candidate_campaign_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    match_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    intelligence_score INTEGER,
    recommended_approach TEXT,
    status TEXT DEFAULT 'matched',
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    role_title TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_name TEXT,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, campaign_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_candidate_campaign_matches_candidate
    ON public.candidate_campaign_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_campaign_matches_campaign
    ON public.candidate_campaign_matches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_candidate_campaign_matches_org
    ON public.candidate_campaign_matches(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidate_campaign_matches_score
    ON public.candidate_campaign_matches(match_score DESC);

-- RLS policies
ALTER TABLE public.candidate_campaign_matches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view matches for their organization
CREATE POLICY "Users can view org matches" ON public.candidate_campaign_matches
    FOR SELECT TO authenticated
    USING (organization_id = public.auth_company_id());

-- Allow authenticated users to insert matches for their organization
CREATE POLICY "Users can insert org matches" ON public.candidate_campaign_matches
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = public.auth_company_id());

-- Allow authenticated users to update matches for their organization
CREATE POLICY "Users can update org matches" ON public.candidate_campaign_matches
    FOR UPDATE TO authenticated
    USING (organization_id = public.auth_company_id());

-- Allow authenticated users to delete matches for their organization
CREATE POLICY "Users can delete org matches" ON public.candidate_campaign_matches
    FOR DELETE TO authenticated
    USING (organization_id = public.auth_company_id());

-- Add comment for documentation
COMMENT ON TABLE public.candidate_campaign_matches IS 'Stores campaign match results for candidates, enabling viewing all matched campaigns from candidate profile';
