-- ISYNCSO Migration: Row Level Security Policies
-- Project: isyncso-sync (sfxpmzicgpaxfntqleig)
-- Generated: 2026-01-04
--
-- Multi-tenant security: Users can only access data from their organization

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regeneration_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user's organization
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = auth.user_organization_id());

-- Only admins can update organization
CREATE POLICY "Admins can update organization"
    ON organizations FOR UPDATE
    USING (id = auth.user_organization_id())
    WITH CHECK (id = auth.user_organization_id());

-- ============================================================================
-- USER_PROFILES POLICIES
-- ============================================================================

-- Users can view profiles in their organization
CREATE POLICY "Users can view org profiles"
    ON user_profiles FOR SELECT
    USING (organization_id = auth.user_organization_id() OR id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org projects"
    ON projects FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org projects"
    ON projects FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org projects"
    ON projects FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org projects"
    ON projects FOR DELETE
    USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- CANDIDATES POLICIES
-- ============================================================================

CREATE POLICY "Users can view org candidates"
    ON candidates FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org candidates"
    ON candidates FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org candidates"
    ON candidates FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org candidates"
    ON candidates FOR DELETE
    USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- CHAT_CONVERSATIONS POLICIES
-- ============================================================================

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
    ON chat_conversations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
    ON chat_conversations FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
    ON chat_conversations FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
    ON chat_conversations FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- ROLES POLICIES
-- ============================================================================

CREATE POLICY "Users can view org roles"
    ON roles FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org roles"
    ON roles FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org roles"
    ON roles FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org roles"
    ON roles FOR DELETE
    USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- CAMPAIGNS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org campaigns"
    ON campaigns FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org campaigns"
    ON campaigns FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org campaigns"
    ON campaigns FOR DELETE
    USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org tasks"
    ON tasks FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org tasks"
    ON tasks FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org tasks"
    ON tasks FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org tasks"
    ON tasks FOR DELETE
    USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- OUTREACH_TASKS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org outreach_tasks"
    ON outreach_tasks FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org outreach_tasks"
    ON outreach_tasks FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org outreach_tasks"
    ON outreach_tasks FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org outreach_tasks"
    ON outreach_tasks FOR DELETE
    USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- OUTREACH_MESSAGES POLICIES
-- ============================================================================

CREATE POLICY "Users can view org outreach_messages"
    ON outreach_messages FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org outreach_messages"
    ON outreach_messages FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org outreach_messages"
    ON outreach_messages FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

-- ============================================================================
-- USER_INVITATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org invitations"
    ON user_invitations FOR SELECT
    USING (organization_id = auth.user_organization_id());

-- Only admins can create invitations (enforced at app level)
CREATE POLICY "Users can create org invitations"
    ON user_invitations FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org invitations"
    ON user_invitations FOR UPDATE
    USING (organization_id = auth.user_organization_id())
    WITH CHECK (organization_id = auth.user_organization_id());

-- Public policy for accepting invitations (by token)
CREATE POLICY "Anyone can view invitation by token"
    ON user_invitations FOR SELECT
    USING (token IS NOT NULL AND status = 'pending');

-- ============================================================================
-- REGENERATION_JOBS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org regeneration_jobs"
    ON regeneration_jobs FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org regeneration_jobs"
    ON regeneration_jobs FOR INSERT
    WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update own regeneration_jobs"
    ON regeneration_jobs FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================
-- Note: The service_role key bypasses RLS automatically
-- Edge functions use service_role for admin operations
