-- Migration: Talent Ecosystem Integration
-- Created: 2026-01-15
-- Description: Integrates Talent module with CRM contacts and Finance
--              - Adds 'client' contact type to prospects for recruitment clients
--              - Links candidates to contacts for CRM visibility
--              - Creates talent_deals table for recruitment pipeline with revenue tracking

-- ============================================================================
-- SECTION 1: Extend prospects table contact_type to include 'client'
-- ============================================================================

-- Drop the existing check constraint and recreate with 'client' included
ALTER TABLE public.prospects
DROP CONSTRAINT IF EXISTS prospects_contact_type_check;

ALTER TABLE public.prospects
ADD CONSTRAINT prospects_contact_type_check
CHECK (contact_type IN ('lead', 'prospect', 'customer', 'partner', 'candidate', 'target', 'client'));

-- Add is_recruitment_client flag to identify recruitment-specific clients
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS is_recruitment_client BOOLEAN DEFAULT FALSE;

-- Add recruitment-specific fields for client contacts
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS recruitment_fee_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS recruitment_fee_flat NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS recruitment_terms TEXT,
ADD COLUMN IF NOT EXISTS active_projects_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_placements INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_generated NUMERIC(14,2) DEFAULT 0;

COMMENT ON COLUMN public.prospects.is_recruitment_client IS 'True if this contact is a recruitment client (employer)';
COMMENT ON COLUMN public.prospects.recruitment_fee_percentage IS 'Default recruitment fee percentage for this client';
COMMENT ON COLUMN public.prospects.recruitment_fee_flat IS 'Default flat recruitment fee for this client';
COMMENT ON COLUMN public.prospects.recruitment_terms IS 'Default payment terms and conditions';
COMMENT ON COLUMN public.prospects.active_projects_count IS 'Number of active recruitment projects';
COMMENT ON COLUMN public.prospects.total_placements IS 'Total successful placements with this client';
COMMENT ON COLUMN public.prospects.total_revenue_generated IS 'Total revenue generated from this client';

-- Index for recruitment client queries
CREATE INDEX IF NOT EXISTS idx_prospects_recruitment_client
ON public.prospects(is_recruitment_client)
WHERE is_recruitment_client = TRUE;

-- ============================================================================
-- SECTION 2: Link candidates to contacts for CRM visibility
-- ============================================================================

-- Add contact_id to candidates table - links to prospect record
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.candidates.contact_id IS 'Links candidate to a CRM contact record for unified visibility';

-- Index for candidate-contact lookups
CREATE INDEX IF NOT EXISTS idx_candidates_contact_id
ON public.candidates(contact_id)
WHERE contact_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: Create talent_deals table for recruitment pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.talent_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Relationships
    client_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,

    -- Deal information
    title TEXT NOT NULL,
    description TEXT,

    -- Pipeline stage (recruitment-specific stages)
    stage TEXT NOT NULL DEFAULT 'lead',

    -- Financial
    deal_value NUMERIC(14,2) DEFAULT 0,
    fee_type TEXT DEFAULT 'percentage',
    fee_percentage NUMERIC(5,2),
    fee_flat NUMERIC(12,2),
    currency TEXT DEFAULT 'EUR',

    -- Candidate salary (for percentage calculation)
    candidate_salary NUMERIC(14,2),

    -- Dates
    expected_start_date DATE,
    actual_start_date DATE,
    probation_end_date DATE,
    confirmed_date DATE,

    -- Status flags
    is_guaranteed BOOLEAN DEFAULT FALSE,
    guarantee_period_days INTEGER DEFAULT 90,

    -- Tracking
    probability INTEGER DEFAULT 50,
    lost_reason TEXT,
    won_reason TEXT,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT talent_deals_stage_values
        CHECK (stage IN (
            'lead',           -- Initial contact with client
            'briefing',       -- Understanding requirements
            'agreement',      -- Contract/terms agreed
            'search',         -- Actively sourcing candidates
            'presented',      -- Candidates presented to client
            'interviews',     -- Client interviewing candidates
            'offer',          -- Offer stage
            'starting',       -- Candidate accepted, preparing to start
            'probation',      -- Candidate in probation period
            'confirmed',      -- Placement confirmed (revenue recognized)
            'lost'            -- Deal lost at any stage
        )),
    CONSTRAINT talent_deals_fee_type_values
        CHECK (fee_type IN ('percentage', 'flat', 'mixed')),
    CONSTRAINT talent_deals_probability_range
        CHECK (probability >= 0 AND probability <= 100)
);

COMMENT ON TABLE public.talent_deals IS 'Recruitment pipeline deals tracking from lead to confirmed placement';

-- ============================================================================
-- SECTION 4: Enable RLS on talent_deals
-- ============================================================================

ALTER TABLE public.talent_deals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access deals in their organization
CREATE POLICY talent_deals_organization_policy ON public.talent_deals
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- SECTION 5: Indexes for talent_deals
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_talent_deals_organization
    ON public.talent_deals(organization_id);

CREATE INDEX IF NOT EXISTS idx_talent_deals_client
    ON public.talent_deals(client_id)
    WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_talent_deals_candidate
    ON public.talent_deals(candidate_id)
    WHERE candidate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_talent_deals_project
    ON public.talent_deals(project_id)
    WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_talent_deals_stage
    ON public.talent_deals(stage);

CREATE INDEX IF NOT EXISTS idx_talent_deals_created
    ON public.talent_deals(created_at);

CREATE INDEX IF NOT EXISTS idx_talent_deals_pipeline
    ON public.talent_deals(organization_id, stage, created_at)
    WHERE stage NOT IN ('confirmed', 'lost');

-- Composite index for active deals with value
CREATE INDEX IF NOT EXISTS idx_talent_deals_active_value
    ON public.talent_deals(organization_id, stage, deal_value)
    WHERE stage NOT IN ('confirmed', 'lost');

-- ============================================================================
-- SECTION 6: Updated_at trigger for talent_deals
-- ============================================================================

-- Reuse existing update_updated_at_column function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS talent_deals_updated_at_trigger ON public.talent_deals;

CREATE TRIGGER talent_deals_updated_at_trigger
    BEFORE UPDATE ON public.talent_deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: Function to auto-create contact when candidate added to campaign
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_candidate_to_contact()
RETURNS TRIGGER AS $$
DECLARE
    v_contact_id UUID;
    v_owner_id UUID;
BEGIN
    -- Only proceed if candidate doesn't already have a contact_id
    IF NEW.contact_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get an owner_id (assigned_to or first org member)
    v_owner_id := COALESCE(
        NEW.assigned_to,
        (SELECT user_id FROM organization_members WHERE organization_id = NEW.organization_id LIMIT 1)
    );

    -- Check if a contact with this email already exists
    IF NEW.email IS NOT NULL THEN
        SELECT id INTO v_contact_id
        FROM public.prospects
        WHERE email = NEW.email
        AND owner_id = v_owner_id
        LIMIT 1;
    END IF;

    -- If no existing contact, create one
    IF v_contact_id IS NULL AND NEW.email IS NOT NULL THEN
        INSERT INTO public.prospects (
            owner_id,
            organization_id,
            first_name,
            last_name,
            email,
            phone,
            company,
            job_title,
            linkedin_url,
            location,
            contact_type,
            source,
            notes
        ) VALUES (
            v_owner_id,
            NEW.organization_id,
            NEW.first_name,
            NEW.last_name,
            NEW.email,
            NEW.phone,
            NEW.current_company,
            NEW.current_title,
            NEW.linkedin_url,
            NEW.location,
            'candidate',
            COALESCE(NEW.source, 'talent_module'),
            'Auto-created from Talent module candidate'
        )
        RETURNING id INTO v_contact_id;
    END IF;

    -- Link the candidate to the contact
    NEW.contact_id := v_contact_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS candidates_sync_to_contact_trigger ON public.candidates;

CREATE TRIGGER candidates_sync_to_contact_trigger
    BEFORE INSERT ON public.candidates
    FOR EACH ROW
    EXECUTE FUNCTION sync_candidate_to_contact();

-- ============================================================================
-- SECTION 8: Function to update client stats when deal is confirmed
-- ============================================================================

CREATE OR REPLACE FUNCTION update_client_stats_on_deal_confirm()
RETURNS TRIGGER AS $$
BEGIN
    -- When a deal moves to 'confirmed' stage
    IF NEW.stage = 'confirmed' AND OLD.stage != 'confirmed' AND NEW.client_id IS NOT NULL THEN
        UPDATE public.prospects
        SET
            total_placements = COALESCE(total_placements, 0) + 1,
            total_revenue_generated = COALESCE(total_revenue_generated, 0) + COALESCE(NEW.deal_value, 0),
            updated_date = NOW()
        WHERE id = NEW.client_id;
    END IF;

    -- When a deal is moved OUT of confirmed (reversal)
    IF OLD.stage = 'confirmed' AND NEW.stage != 'confirmed' AND NEW.client_id IS NOT NULL THEN
        UPDATE public.prospects
        SET
            total_placements = GREATEST(COALESCE(total_placements, 0) - 1, 0),
            total_revenue_generated = GREATEST(COALESCE(total_revenue_generated, 0) - COALESCE(OLD.deal_value, 0), 0),
            updated_date = NOW()
        WHERE id = NEW.client_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS talent_deals_update_client_stats_trigger ON public.talent_deals;

CREATE TRIGGER talent_deals_update_client_stats_trigger
    AFTER UPDATE ON public.talent_deals
    FOR EACH ROW
    EXECUTE FUNCTION update_client_stats_on_deal_confirm();

-- ============================================================================
-- End of Migration
-- ============================================================================
