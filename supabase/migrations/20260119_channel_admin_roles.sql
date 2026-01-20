-- =============================================
-- PHASE 3: Channel Admin Roles Migration
-- Created: 2026-01-19
-- Description: Adds channel role management
-- =============================================

-- Create enum for channel roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_role') THEN
        CREATE TYPE channel_role AS ENUM ('owner', 'admin', 'moderator', 'member');
    END IF;
END
$$;

-- Create channel_members table for role management
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role channel_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_by UUID,
    muted BOOLEAN DEFAULT FALSE,
    muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique membership
    UNIQUE(channel_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_role ON public.channel_members(role);

-- Enable RLS
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_members
-- Users can view members of channels they belong to
CREATE POLICY "Users can view channel members" ON public.channel_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
    )
);

-- Users can join public channels, admins can add members
CREATE POLICY "Users can join channels" ON public.channel_members
FOR INSERT TO authenticated
WITH CHECK (
    -- User adding themselves to a public channel
    (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_id AND c.type = 'public'
    )) OR
    -- Admin/owner adding members
    EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
);

-- Only admins/owners can update member roles
CREATE POLICY "Admins can update channel members" ON public.channel_members
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
);

-- Users can leave, admins can remove members
CREATE POLICY "Users can leave or be removed" ON public.channel_members
FOR DELETE TO authenticated
USING (
    -- User leaving
    user_id = auth.uid() OR
    -- Admin/owner removing
    EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin', 'moderator')
        -- Moderators can only remove members, not admins/owners
        AND (
            cm.role IN ('owner', 'admin') OR
            channel_members.role = 'member'
        )
    )
);

-- Function to check if user is channel admin
CREATE OR REPLACE FUNCTION public.is_channel_admin(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin')
    );
$$;

-- Function to check if user is channel moderator or above
CREATE OR REPLACE FUNCTION public.is_channel_moderator(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin', 'moderator')
    );
$$;

-- Function to get user's role in a channel
CREATE OR REPLACE FUNCTION public.get_channel_role(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::TEXT FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
$$;

-- Function to set channel member role (admin only)
CREATE OR REPLACE FUNCTION public.set_channel_member_role(
    p_channel_id UUID,
    p_user_id UUID,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    -- Get caller's role
    v_caller_role := get_channel_role(p_channel_id, auth.uid());

    -- Verify caller is admin or owner
    IF v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;

    -- Owners can only be changed by owners
    v_target_role := get_channel_role(p_channel_id, p_user_id);
    IF v_target_role = 'owner' AND v_caller_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only owners can modify owner roles');
    END IF;

    -- Prevent setting someone as owner (transfer ownership is separate)
    IF p_role = 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Use transfer_channel_ownership instead');
    END IF;

    -- Update the role
    UPDATE public.channel_members
    SET role = p_role::channel_role, updated_at = NOW()
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'role', p_role);
END;
$$;

-- Function to transfer channel ownership
CREATE OR REPLACE FUNCTION public.transfer_channel_ownership(
    p_channel_id UUID,
    p_new_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Only current owner can transfer
    v_caller_role := get_channel_role(p_channel_id, auth.uid());

    IF v_caller_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only owners can transfer ownership');
    END IF;

    -- Verify new owner is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id AND user_id = p_new_owner_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not a channel member');
    END IF;

    -- Transfer ownership
    UPDATE public.channel_members
    SET role = 'admin', updated_at = NOW()
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    UPDATE public.channel_members
    SET role = 'owner', updated_at = NOW()
    WHERE channel_id = p_channel_id AND user_id = p_new_owner_id;

    RETURN jsonb_build_object('success', true, 'new_owner_id', p_new_owner_id);
END;
$$;

-- Function to kick a member from channel
CREATE OR REPLACE FUNCTION public.kick_channel_member(
    p_channel_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    v_caller_role := get_channel_role(p_channel_id, auth.uid());
    v_target_role := get_channel_role(p_channel_id, p_user_id);

    -- Verify permissions
    IF v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;

    -- Can't kick owners
    IF v_target_role = 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot kick channel owner');
    END IF;

    -- Moderators can only kick members
    IF v_caller_role = 'moderator' AND v_target_role != 'member' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Moderators can only kick members');
    END IF;

    -- Delete membership
    DELETE FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get channel members with roles
CREATE OR REPLACE FUNCTION public.get_channel_members_with_roles(p_channel_id UUID)
RETURNS TABLE(
    user_id UUID,
    role TEXT,
    joined_at TIMESTAMPTZ,
    muted BOOLEAN,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        cm.user_id,
        cm.role::TEXT,
        cm.joined_at,
        cm.muted,
        u.full_name,
        u.email,
        u.avatar_url
    FROM public.channel_members cm
    LEFT JOIN public.users u ON cm.user_id = u.id
    WHERE cm.channel_id = p_channel_id
    ORDER BY
        CASE cm.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'moderator' THEN 3
            ELSE 4
        END,
        cm.joined_at;
$$;

-- Function to add member to channel
CREATE OR REPLACE FUNCTION public.add_channel_member(
    p_channel_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_channel_type TEXT;
BEGIN
    -- Get channel type
    SELECT type INTO v_channel_type FROM public.channels WHERE id = p_channel_id;

    -- Get caller's role (if any)
    v_caller_role := get_channel_role(p_channel_id, auth.uid());

    -- Check permissions based on channel type
    IF v_channel_type = 'private' AND v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only admins can add members to private channels');
    END IF;

    -- Insert member
    INSERT INTO public.channel_members (channel_id, user_id, role, invited_by)
    VALUES (p_channel_id, p_user_id, p_role::channel_role, auth.uid())
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is already a member');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Migrate existing channel members to new table
-- Set creator as owner, members array users as members
DO $$
DECLARE
    r RECORD;
    v_member UUID;
BEGIN
    FOR r IN SELECT id, created_by, members FROM public.channels WHERE members IS NOT NULL
    LOOP
        -- Add creator as owner if we can find their ID
        IF r.created_by IS NOT NULL THEN
            DECLARE
                v_creator_id UUID;
            BEGIN
                SELECT id INTO v_creator_id FROM public.users WHERE email = r.created_by LIMIT 1;
                IF v_creator_id IS NOT NULL THEN
                    INSERT INTO public.channel_members (channel_id, user_id, role)
                    VALUES (r.id, v_creator_id, 'owner')
                    ON CONFLICT (channel_id, user_id) DO NOTHING;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                NULL; -- Skip if there's an error
            END;
        END IF;

        -- Add members from array
        IF r.members IS NOT NULL THEN
            FOREACH v_member IN ARRAY r.members
            LOOP
                INSERT INTO public.channel_members (channel_id, user_id, role)
                VALUES (r.id, v_member, 'member')
                ON CONFLICT (channel_id, user_id) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END;
$$;

-- Update channels table to add settings
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::JSONB;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_moderator TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_channel_member_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_channel_ownership TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_channel_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_members_with_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_channel_member TO authenticated;

-- Enable realtime for channel_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;

COMMENT ON TABLE public.channel_members IS 'Channel membership with role management';
COMMENT ON FUNCTION public.is_channel_admin IS 'Check if user is channel admin or owner';
COMMENT ON FUNCTION public.is_channel_moderator IS 'Check if user is channel moderator or above';
