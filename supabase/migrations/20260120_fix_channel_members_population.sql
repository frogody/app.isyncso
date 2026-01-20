-- =============================================
-- FIX: Populate channel_members from existing data
-- Created: 2026-01-20
-- Description: Fixes empty channel_members table by populating from channels.user_id and messages
-- =============================================

-- Step 1: Add channel creators as owners
INSERT INTO public.channel_members (channel_id, user_id, role, joined_at)
SELECT
    c.id as channel_id,
    c.user_id as user_id,
    'owner'::channel_role as role,
    COALESCE(c.created_at, NOW()) as joined_at
FROM public.channels c
WHERE c.user_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO UPDATE SET role = 'owner';

-- Step 2: Add users who have sent messages as members (if not already owner)
INSERT INTO public.channel_members (channel_id, user_id, role, joined_at)
SELECT DISTINCT
    m.channel_id,
    m.sender_id as user_id,
    'member'::channel_role as role,
    MIN(m.created_date) as joined_at
FROM public.messages m
WHERE m.sender_id IS NOT NULL
  AND m.channel_id IS NOT NULL
GROUP BY m.channel_id, m.sender_id
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Step 3: Fix check_rate_limit function - muted_users table has no 'muted' column
-- Presence in the table itself indicates the user is muted
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_channel_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_messages_per_minute INTEGER := 30;
    v_messages_per_hour INTEGER := 200;
    v_slowmode_seconds INTEGER := 0;
    v_minute_count INTEGER;
    v_hour_count INTEGER;
    v_last_message TIMESTAMPTZ;
    v_muted_until TIMESTAMPTZ;
BEGIN
    -- Check if user is muted (presence in muted_users table = muted)
    SELECT muted_until INTO v_muted_until
    FROM public.muted_users
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    IF FOUND THEN
        -- Check if mute has expired
        IF v_muted_until IS NOT NULL AND v_muted_until < NOW() THEN
            -- Mute expired, remove it
            DELETE FROM public.muted_users
            WHERE channel_id = p_channel_id AND user_id = p_user_id;
        ELSE
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'muted',
                'muted_until', v_muted_until
            );
        END IF;
    END IF;

    -- Get channel rate limits (or use defaults)
    SELECT
        COALESCE(messages_per_minute, 30),
        COALESCE(messages_per_hour, 200),
        COALESCE(slowmode_seconds, 0)
    INTO v_messages_per_minute, v_messages_per_hour, v_slowmode_seconds
    FROM public.channel_rate_limits
    WHERE channel_id = p_channel_id;

    -- Count messages in last minute
    SELECT COUNT(*), MAX(created_date)
    INTO v_minute_count, v_last_message
    FROM public.messages
    WHERE channel_id = p_channel_id
      AND sender_id = p_user_id
      AND created_date > NOW() - INTERVAL '1 minute';

    -- Check per-minute limit
    IF v_minute_count >= v_messages_per_minute THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'rate_limit',
            'limit_type', 'minute',
            'retry_after', 60 - EXTRACT(EPOCH FROM (NOW() - v_last_message))::INTEGER
        );
    END IF;

    -- Count messages in last hour
    SELECT COUNT(*) INTO v_hour_count
    FROM public.messages
    WHERE channel_id = p_channel_id
      AND sender_id = p_user_id
      AND created_date > NOW() - INTERVAL '1 hour';

    -- Check per-hour limit
    IF v_hour_count >= v_messages_per_hour THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'rate_limit',
            'limit_type', 'hour',
            'retry_after', 3600
        );
    END IF;

    -- Check slowmode
    IF v_slowmode_seconds > 0 AND v_last_message IS NOT NULL THEN
        DECLARE
            v_seconds_since_last INTEGER;
        BEGIN
            v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_message))::INTEGER;
            IF v_seconds_since_last < v_slowmode_seconds THEN
                RETURN jsonb_build_object(
                    'allowed', false,
                    'reason', 'slowmode',
                    'retry_after', v_slowmode_seconds - v_seconds_since_last
                );
            END IF;
        END;
    END IF;

    -- Auto-add user to channel_members if not present (for public channels)
    INSERT INTO public.channel_members (channel_id, user_id, role)
    SELECT p_channel_id, p_user_id, 'member'::channel_role
    WHERE EXISTS (SELECT 1 FROM public.channels WHERE id = p_channel_id AND type = 'public')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'allowed', true,
        'messages_this_minute', v_minute_count,
        'messages_this_hour', v_hour_count,
        'slowmode_seconds', v_slowmode_seconds
    );
END;
$$;

-- Step 4: Fix is_user_muted function
CREATE OR REPLACE FUNCTION public.is_user_muted(
    p_channel_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_muted_until TIMESTAMPTZ;
BEGIN
    SELECT muted_until INTO v_muted_until
    FROM public.muted_users
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check if mute has expired
    IF v_muted_until IS NOT NULL AND v_muted_until < NOW() THEN
        -- Mute expired, clean up and return false
        DELETE FROM public.muted_users
        WHERE channel_id = p_channel_id AND user_id = p_user_id;
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

-- Step 5: Create get_channel_rate_limits function
CREATE OR REPLACE FUNCTION public.get_channel_rate_limits(p_channel_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT jsonb_build_object(
            'messages_per_minute', COALESCE(messages_per_minute, 30),
            'messages_per_hour', COALESCE(messages_per_hour, 200),
            'slowmode_seconds', COALESCE(slowmode_seconds, 0)
        )
        FROM public.channel_rate_limits
        WHERE channel_id = p_channel_id),
        jsonb_build_object(
            'messages_per_minute', 30,
            'messages_per_hour', 200,
            'slowmode_seconds', 0
        )
    );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_muted TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_rate_limits TO authenticated;
