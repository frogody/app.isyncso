-- =============================================
-- Rate Limiting & Moderation System
-- =============================================

-- Create moderation action types enum
DO $$ BEGIN
    CREATE TYPE moderation_action AS ENUM ('warn', 'mute', 'kick', 'ban', 'delete_message');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create moderation_logs table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    action moderation_action NOT NULL,
    reason TEXT,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create muted_users table for channel-specific mutes
CREATE TABLE IF NOT EXISTS public.muted_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    muted_by UUID NOT NULL,
    reason TEXT,
    muted_until TIMESTAMPTZ, -- NULL means permanent until unmuted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create message_rate_limits table for tracking message frequency
CREATE TABLE IF NOT EXISTS public.message_rate_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    message_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create channel rate limit settings
CREATE TABLE IF NOT EXISTS public.channel_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE UNIQUE,
    messages_per_minute INT NOT NULL DEFAULT 30,
    messages_per_hour INT NOT NULL DEFAULT 200,
    slowmode_seconds INT DEFAULT NULL, -- NULL means no slowmode
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_logs_channel ON public.moderation_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_target ON public.moderation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON public.moderation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muted_users_channel ON public.muted_users(channel_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_user ON public.muted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_until ON public.muted_users(muted_until) WHERE muted_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_tracking_channel_user ON public.message_rate_tracking(channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rate_tracking_window ON public.message_rate_tracking(window_start);

-- RLS Policies
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_rate_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_rate_limits ENABLE ROW LEVEL SECURITY;

-- Moderation logs - moderators can view, only system can insert
DROP POLICY IF EXISTS "Moderators can view moderation logs" ON public.moderation_logs;
CREATE POLICY "Moderators can view moderation logs"
    ON public.moderation_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members
            WHERE channel_id = moderation_logs.channel_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'moderator')
        )
    );

-- Muted users - everyone can view mute status (needed for UI)
DROP POLICY IF EXISTS "Members can view muted users" ON public.muted_users;
CREATE POLICY "Members can view muted users"
    ON public.muted_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members
            WHERE channel_id = muted_users.channel_id
            AND user_id = auth.uid()
        )
    );

-- Rate tracking - users can view their own tracking
DROP POLICY IF EXISTS "Users can view own rate tracking" ON public.message_rate_tracking;
CREATE POLICY "Users can view own rate tracking"
    ON public.message_rate_tracking FOR SELECT
    USING (user_id = auth.uid());

-- Channel rate limits - members can view
DROP POLICY IF EXISTS "Members can view channel rate limits" ON public.channel_rate_limits;
CREATE POLICY "Members can view channel rate limits"
    ON public.channel_rate_limits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members
            WHERE channel_id = channel_rate_limits.channel_id
            AND user_id = auth.uid()
        )
    );

-- Admins can update rate limits
DROP POLICY IF EXISTS "Admins can update channel rate limits" ON public.channel_rate_limits;
CREATE POLICY "Admins can update channel rate limits"
    ON public.channel_rate_limits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members
            WHERE channel_id = channel_rate_limits.channel_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- =============================================
-- Helper Functions
-- =============================================

-- Check if user is muted in channel
CREATE OR REPLACE FUNCTION is_user_muted(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.muted_users
        WHERE channel_id = p_channel_id
        AND user_id = p_user_id
        AND (muted_until IS NULL OR muted_until > NOW())
    );
END;
$$;

-- Check rate limit before sending message
CREATE OR REPLACE FUNCTION check_rate_limit(p_channel_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rate_limit RECORD;
    v_tracking RECORD;
    v_messages_this_minute INT;
    v_messages_this_hour INT;
    v_last_message_time TIMESTAMPTZ;
    v_slowmode_remaining INT;
BEGIN
    -- Check if user is muted first
    IF is_user_muted(p_channel_id, p_user_id) THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'muted',
            'message', 'You are muted in this channel'
        );
    END IF;

    -- Get channel rate limit settings (or defaults)
    SELECT
        COALESCE(crl.messages_per_minute, 30) as messages_per_minute,
        COALESCE(crl.messages_per_hour, 200) as messages_per_hour,
        crl.slowmode_seconds
    INTO v_rate_limit
    FROM public.channel_rate_limits crl
    WHERE crl.channel_id = p_channel_id;

    -- If no settings exist, use defaults
    IF v_rate_limit IS NULL THEN
        v_rate_limit := ROW(30, 200, NULL);
    END IF;

    -- Count messages in last minute
    SELECT COUNT(*)
    INTO v_messages_this_minute
    FROM public.messages
    WHERE channel_id = p_channel_id
    AND sender_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';

    -- Count messages in last hour
    SELECT COUNT(*)
    INTO v_messages_this_hour
    FROM public.messages
    WHERE channel_id = p_channel_id
    AND sender_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';

    -- Check per-minute limit
    IF v_messages_this_minute >= v_rate_limit.messages_per_minute THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'rate_limit_minute',
            'message', 'Too many messages. Please wait a moment.',
            'retry_after', 60
        );
    END IF;

    -- Check per-hour limit
    IF v_messages_this_hour >= v_rate_limit.messages_per_hour THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'rate_limit_hour',
            'message', 'Hourly message limit reached. Please try again later.',
            'retry_after', 3600
        );
    END IF;

    -- Check slowmode
    IF v_rate_limit.slowmode_seconds IS NOT NULL THEN
        SELECT MAX(created_at)
        INTO v_last_message_time
        FROM public.messages
        WHERE channel_id = p_channel_id
        AND sender_id = p_user_id;

        IF v_last_message_time IS NOT NULL THEN
            v_slowmode_remaining := EXTRACT(EPOCH FROM (v_last_message_time + (v_rate_limit.slowmode_seconds || ' seconds')::INTERVAL - NOW()))::INT;

            IF v_slowmode_remaining > 0 THEN
                RETURN jsonb_build_object(
                    'allowed', false,
                    'reason', 'slowmode',
                    'message', 'Slowmode is enabled. Please wait ' || v_slowmode_remaining || ' seconds.',
                    'retry_after', v_slowmode_remaining
                );
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Mute a user in channel
CREATE OR REPLACE FUNCTION mute_channel_user(
    p_channel_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_duration_minutes INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
    v_muted_until TIMESTAMPTZ;
BEGIN
    -- Check caller permission
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- Check target role
    SELECT role INTO v_target_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    -- Can't mute admins/owners unless you're owner
    IF v_target_role IN ('owner', 'admin') AND v_caller_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot mute admins');
    END IF;

    IF v_target_role = 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot mute channel owner');
    END IF;

    -- Calculate muted_until if duration specified
    IF p_duration_minutes IS NOT NULL THEN
        v_muted_until := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
    END IF;

    -- Insert or update mute
    INSERT INTO public.muted_users (channel_id, user_id, muted_by, reason, muted_until)
    VALUES (p_channel_id, p_user_id, auth.uid(), p_reason, v_muted_until)
    ON CONFLICT (channel_id, user_id) DO UPDATE SET
        muted_by = auth.uid(),
        reason = p_reason,
        muted_until = v_muted_until,
        created_at = NOW();

    -- Log the action
    INSERT INTO public.moderation_logs (channel_id, moderator_id, target_user_id, action, reason, metadata)
    VALUES (p_channel_id, auth.uid(), p_user_id, 'mute', p_reason,
        jsonb_build_object('duration_minutes', p_duration_minutes, 'muted_until', v_muted_until));

    RETURN jsonb_build_object('success', true, 'muted_until', v_muted_until);
END;
$$;

-- Unmute a user in channel
CREATE OR REPLACE FUNCTION unmute_channel_user(p_channel_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Check caller permission
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- Remove mute
    DELETE FROM public.muted_users
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Delete message as moderator
CREATE OR REPLACE FUNCTION delete_message_as_moderator(p_message_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message RECORD;
    v_caller_role TEXT;
BEGIN
    -- Get message info
    SELECT id, channel_id, sender_id, content
    INTO v_message
    FROM public.messages
    WHERE id = p_message_id;

    IF v_message IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found');
    END IF;

    -- Check caller permission
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = v_message.channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- Log the action before deleting
    INSERT INTO public.moderation_logs (channel_id, moderator_id, target_user_id, action, reason, message_id, metadata)
    VALUES (v_message.channel_id, auth.uid(), v_message.sender_id, 'delete_message', p_reason, p_message_id,
        jsonb_build_object('original_content', LEFT(v_message.content, 500)));

    -- Soft delete - update message content
    UPDATE public.messages
    SET content = '[Message deleted by moderator]',
        metadata = COALESCE(metadata, '{}') || jsonb_build_object(
            'deleted_by', auth.uid(),
            'deleted_at', NOW(),
            'deletion_reason', p_reason
        )
    WHERE id = p_message_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Warn a user
CREATE OR REPLACE FUNCTION warn_channel_user(p_channel_id UUID, p_user_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_warning_count INT;
BEGIN
    -- Check caller permission
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- Log the warning
    INSERT INTO public.moderation_logs (channel_id, moderator_id, target_user_id, action, reason)
    VALUES (p_channel_id, auth.uid(), p_user_id, 'warn', p_reason);

    -- Count total warnings
    SELECT COUNT(*) INTO v_warning_count
    FROM public.moderation_logs
    WHERE channel_id = p_channel_id
    AND target_user_id = p_user_id
    AND action = 'warn';

    RETURN jsonb_build_object('success', true, 'warning_count', v_warning_count);
END;
$$;

-- Get moderation history for a user in channel
CREATE OR REPLACE FUNCTION get_user_moderation_history(p_channel_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_history JSONB;
BEGIN
    -- Check caller permission
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ml.id,
            'action', ml.action,
            'reason', ml.reason,
            'moderator_id', ml.moderator_id,
            'created_at', ml.created_at,
            'metadata', ml.metadata
        ) ORDER BY ml.created_at DESC
    )
    INTO v_history
    FROM public.moderation_logs ml
    WHERE ml.channel_id = p_channel_id
    AND ml.target_user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'history', COALESCE(v_history, '[]'::jsonb));
END;
$$;

-- Update channel rate limit settings
CREATE OR REPLACE FUNCTION update_channel_rate_limits(
    p_channel_id UUID,
    p_messages_per_minute INT DEFAULT NULL,
    p_messages_per_hour INT DEFAULT NULL,
    p_slowmode_seconds INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Check caller permission
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only admins can update rate limits');
    END IF;

    -- Insert or update rate limits
    INSERT INTO public.channel_rate_limits (channel_id, messages_per_minute, messages_per_hour, slowmode_seconds)
    VALUES (
        p_channel_id,
        COALESCE(p_messages_per_minute, 30),
        COALESCE(p_messages_per_hour, 200),
        p_slowmode_seconds
    )
    ON CONFLICT (channel_id) DO UPDATE SET
        messages_per_minute = COALESCE(p_messages_per_minute, channel_rate_limits.messages_per_minute),
        messages_per_hour = COALESCE(p_messages_per_hour, channel_rate_limits.messages_per_hour),
        slowmode_seconds = p_slowmode_seconds,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Get channel rate limit settings
CREATE OR REPLACE FUNCTION get_channel_rate_limits(p_channel_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings RECORD;
BEGIN
    SELECT
        COALESCE(crl.messages_per_minute, 30) as messages_per_minute,
        COALESCE(crl.messages_per_hour, 200) as messages_per_hour,
        crl.slowmode_seconds
    INTO v_settings
    FROM public.channel_rate_limits crl
    WHERE crl.channel_id = p_channel_id;

    IF v_settings IS NULL THEN
        RETURN jsonb_build_object(
            'messages_per_minute', 30,
            'messages_per_hour', 200,
            'slowmode_seconds', null
        );
    END IF;

    RETURN jsonb_build_object(
        'messages_per_minute', v_settings.messages_per_minute,
        'messages_per_hour', v_settings.messages_per_hour,
        'slowmode_seconds', v_settings.slowmode_seconds
    );
END;
$$;

-- Get muted users in channel
CREATE OR REPLACE FUNCTION get_muted_users(p_channel_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_muted JSONB;
BEGIN
    -- Check caller permission (moderators and above)
    SELECT role INTO v_caller_role
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', mu.user_id,
            'muted_by', mu.muted_by,
            'reason', mu.reason,
            'muted_until', mu.muted_until,
            'created_at', mu.created_at
        )
    )
    INTO v_muted
    FROM public.muted_users mu
    WHERE mu.channel_id = p_channel_id
    AND (mu.muted_until IS NULL OR mu.muted_until > NOW());

    RETURN jsonb_build_object('success', true, 'muted_users', COALESCE(v_muted, '[]'::jsonb));
END;
$$;

-- Clean up expired mutes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_mutes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM public.muted_users
    WHERE muted_until IS NOT NULL AND muted_until < NOW();

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;
