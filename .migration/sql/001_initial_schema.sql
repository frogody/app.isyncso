-- ISYNCSO Migration: Initial Schema
-- Project: isyncso-sync (sfxpmzicgpaxfntqleig)
-- Generated: 2026-01-04
--
-- Run order: Execute tables in dependency order (Level 0 → Level 3)

-- ============================================================================
-- LEVEL 0: ROOT ENTITIES
-- ============================================================================

-- Organizations (multi-tenant root)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email_domain TEXT,
    website TEXT,
    description TEXT,
    industry TEXT,
    company_size TEXT,
    logo_url TEXT,
    address JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{
        "round_robin_enabled": false,
        "assignment_method": "manual",
        "active_recruiters": [],
        "last_assigned_index": 0,
        "email_notifications": {},
        "branding": {}
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEVEL 1: CORE ENTITIES
-- ============================================================================

-- Projects (recruitment projects)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    client_company TEXT,
    client_contact_name TEXT,
    client_contact_email TEXT,
    client_contact_phone TEXT,
    project_type TEXT DEFAULT 'client_specific',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'discovery' CHECK (status IN (
        'discovery', 'active_search', 'shortlisting',
        'interviewing', 'negotiating', 'on_hold', 'closed'
    )),
    deadline DATE,
    budget NUMERIC,
    notes TEXT,
    client_preferences TEXT,
    location_description TEXT,
    location_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates (job candidates)
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    linkedin_profile TEXT,
    job_title TEXT,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    person_home_location TEXT,
    profile_picture_url TEXT,
    contacted BOOLEAN DEFAULT FALSE,
    -- AI-generated intelligence
    intelligence JSONB DEFAULT '{}',
    intelligence_generated_at TIMESTAMPTZ,
    -- Additional metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Conversations (AI chat history)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    messages JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEVEL 2: DEPENDENT ENTITIES
-- ============================================================================

-- Roles (job positions within projects)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    preferred_experience TEXT,
    location_requirements TEXT,
    salary_range TEXT,
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN (
        'full_time', 'part_time', 'contract', 'freelance'
    )),
    seniority_level TEXT CHECK (seniority_level IN (
        'junior', 'medior', 'senior', 'lead', 'executive'
    )),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'paused', 'filled', 'cancelled')),
    target_start_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns (outreach campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    auto_match_enabled BOOLEAN DEFAULT FALSE,
    matching_criteria JSONB DEFAULT '{}',
    matched_candidates UUID[] DEFAULT '{}',
    stats JSONB DEFAULT '{
        "total_sent": 0,
        "total_responses": 0,
        "total_interested": 0,
        "response_rate": 0
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (follow-ups, to-dos)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'other' CHECK (type IN (
        'follow_up', 'outreach', 'interview', 'meeting', 'research', 'other'
    )),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'cancelled'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    due_date DATE,
    notes TEXT,
    auto_created BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEVEL 3: OUTREACH ENTITIES
-- ============================================================================

-- Outreach Tasks (campaign automation queue)
CREATE TABLE IF NOT EXISTS outreach_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    task_type TEXT DEFAULT 'send_message' CHECK (task_type IN ('send_message', 'check_reply')),
    status TEXT DEFAULT 'pending_generation' CHECK (status IN (
        'pending_generation', 'pending_approval', 'approved_ready',
        'in_progress', 'sent', 'awaiting_reply', 'replied', 'completed', 'failed'
    )),
    attempt_number INTEGER DEFAULT 1,
    message_content TEXT,
    generated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ,
    agent_completed_at TIMESTAMPTZ,
    reply_detected BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Messages (sent messages log)
CREATE TABLE IF NOT EXISTS outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    outreach_task_id UUID REFERENCES outreach_tasks(id) ON DELETE SET NULL,
    sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_by_name TEXT,
    candidate_name TEXT,
    candidate_linkedin TEXT,
    candidate_job_title TEXT,
    candidate_company TEXT,
    message_content TEXT NOT NULL,
    message_length INTEGER,
    status TEXT DEFAULT 'sent' CHECK (status IN (
        'sent', 'viewed', 'responded', 'interested', 'not_interested', 'no_response'
    )),
    follow_up_sequence INTEGER DEFAULT 1,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUPPORT TABLES
-- ============================================================================

-- User Invitations (pending org invitations)
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
    token TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regeneration Jobs (background AI jobs)
CREATE TABLE IF NOT EXISTS regeneration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    total_candidates INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    current_index INTEGER DEFAULT 0,
    results JSONB DEFAULT '[]',
    error_log JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organization-scoped queries (multi-tenant performance)
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_org ON candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_org ON outreach_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_org ON outreach_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org ON chat_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organization_id);

-- User assignment queries
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_candidates_owner ON candidates(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);

-- Status-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_status ON outreach_tasks(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Relationship queries
CREATE INDEX IF NOT EXISTS idx_roles_project ON roles(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_candidate ON tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_campaign ON outreach_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_candidate ON outreach_tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_candidate ON outreach_messages(candidate_id);

-- Full-text search on candidates
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates USING gin(
    to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'organizations', 'user_profiles', 'projects', 'candidates',
            'chat_conversations', 'roles', 'campaigns', 'tasks',
            'outreach_tasks', 'outreach_messages'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END
$$;
