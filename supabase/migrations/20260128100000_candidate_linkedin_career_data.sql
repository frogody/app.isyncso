-- Add LinkedIn Skills & Career Data columns to candidates table
-- Migration: 20260128100000_candidate_linkedin_career_data.sql
-- Purpose: Replicate CRM Contact Profile's Skills & Career tab functionality for Talent Candidates

-- ============================================================================
-- CANDIDATES TABLE: Add missing LinkedIn career data columns
-- ============================================================================

-- Skills, Education, Work History as JSONB (matching prospects table schema)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Location details
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_region TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_country TEXT;

-- Additional contact info
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email_status TEXT; -- valid, invalid, catch-all

-- Age and gender for demographic context
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender TEXT;

-- ============================================================================
-- INDEXES for faster querying
-- ============================================================================

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_candidates_work_history ON public.candidates USING gin(work_history);
CREATE INDEX IF NOT EXISTS idx_candidates_education ON public.candidates USING gin(education);
CREATE INDEX IF NOT EXISTS idx_candidates_certifications ON public.candidates USING gin(certifications);
CREATE INDEX IF NOT EXISTS idx_candidates_interests ON public.candidates USING gin(interests);

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON COLUMN public.candidates.work_history IS 'JSONB array of work history objects from LinkedIn enrichment';
COMMENT ON COLUMN public.candidates.education IS 'JSONB array of education objects from LinkedIn enrichment';
COMMENT ON COLUMN public.candidates.certifications IS 'JSONB array of certifications from LinkedIn enrichment';
COMMENT ON COLUMN public.candidates.interests IS 'JSONB array of interests/topics from LinkedIn enrichment';
