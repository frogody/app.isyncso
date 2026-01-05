-- iSyncSO Database Schema for Supabase
-- Extends the existing SkillSync database with recruitment-focused tables

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  settings JSONB DEFAULT '{}',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CANDIDATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Basic info
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,

  -- Current position
  current_title TEXT,
  current_company TEXT,
  current_company_id TEXT,

  -- Location
  location TEXT,
  city TEXT,
  country TEXT,

  -- Professional data
  skills JSONB DEFAULT '[]',
  experience_years INTEGER,
  education JSONB DEFAULT '[]',
  work_history JSONB DEFAULT '[]',

  -- AI Intelligence
  intelligence JSONB DEFAULT '{}',
  intelligence_summary TEXT,
  intelligence_generated_at TIMESTAMPTZ,

  -- Matching & scoring
  match_score NUMERIC(5,2),
  fit_analysis JSONB DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'new',
  contacted BOOLEAN DEFAULT FALSE,
  contacted_date TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID,

  -- Source
  source TEXT,
  source_id TEXT,

  -- Raw data
  raw_data JSONB DEFAULT '{}',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_org ON public.candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_assigned ON public.candidates(assigned_to);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',

  -- Client info
  client_name TEXT,
  client_contact_name TEXT,
  client_contact_email TEXT,
  client_contact_phone TEXT,
  client_preferences TEXT,

  -- Location
  location_address TEXT,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT '[]',
  responsibilities JSONB DEFAULT '[]',

  -- Compensation
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT DEFAULT 'EUR',

  -- Details
  location TEXT,
  remote_policy TEXT,
  employment_type TEXT,
  experience_required TEXT,

  -- Status
  status TEXT DEFAULT 'open',
  positions_count INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,

  -- AI Analysis
  ideal_candidate_profile JSONB DEFAULT '{}',
  matching_keywords JSONB DEFAULT '[]',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_project ON public.roles(project_id);

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',

  -- Target criteria
  target_criteria JSONB DEFAULT '{}',

  -- Matched candidates
  matched_candidates JSONB DEFAULT '[]',

  -- Outreach settings
  outreach_template TEXT,
  outreach_style JSONB DEFAULT '{}',

  -- Stats
  total_matched INTEGER DEFAULT 0,
  total_contacted INTEGER DEFAULT 0,
  total_responded INTEGER DEFAULT 0,

  -- Timestamps
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns(organization_id);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',

  -- Assignment
  assigned_to UUID,

  -- Related entities
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,

  -- Scheduling
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- ============================================================================
-- OUTREACH TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.outreach_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending',
  message TEXT,
  response TEXT,

  -- Scheduling
  scheduled_date TIMESTAMPTZ,
  sent_date TIMESTAMPTZ,
  response_date TIMESTAMPTZ,

  -- Metadata
  channel TEXT DEFAULT 'linkedin',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_campaign ON public.outreach_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_candidate ON public.outreach_tasks(candidate_id);

-- ============================================================================
-- CHAT CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,

  title TEXT,
  type TEXT DEFAULT 'general',

  -- Chat data
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',

  -- Related entities
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'active',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON public.chat_conversations(user_id);

-- ============================================================================
-- USER INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'pending',

  invited_by UUID,
  accepted_at TIMESTAMPTZ,

  -- Token for invitation link
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.user_invitations(token);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID,

  role TEXT DEFAULT 'member',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OUTREACH MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,

  subject TEXT,
  message TEXT,
  channel TEXT DEFAULT 'email',

  status TEXT DEFAULT 'draft',
  sent_date TIMESTAMPTZ,

  -- Response tracking
  opened BOOLEAN DEFAULT FALSE,
  opened_date TIMESTAMPTZ,
  replied BOOLEAN DEFAULT FALSE,
  replied_date TIMESTAMPTZ,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INTELLIGENCE PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  type TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,

  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REGENERATION JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.regeneration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,

  type TEXT,
  status TEXT DEFAULT 'pending',

  total_count INTEGER DEFAULT 0,
  current_index INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  errors JSONB DEFAULT '[]',

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHAT PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,

  step TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,

  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  address TEXT,
  notes TEXT,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regeneration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (can be refined per organization later)
CREATE POLICY "Allow authenticated access" ON public.organizations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.candidates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.outreach_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.chat_conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.user_invitations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.teams FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.team_members FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.outreach_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.intelligence_progress FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.regeneration_jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.chat_progress FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.clients FOR ALL TO authenticated USING (true);

-- ============================================================================
-- EXTEND USERS TABLE FOR ISYNCSO
-- ============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
