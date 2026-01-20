-- ============================================
-- Unread Tracking Migration
-- Database-backed read status synced across devices
-- ============================================

-- ============================================
-- 1. Create channel_read_status table
-- ============================================

CREATE TABLE IF NOT EXISTS public.channel_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  unread_count INTEGER NOT NULL DEFAULT 0,
  has_mentions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one record per user per channel
  UNIQUE(user_id, channel_id)
);

-- ============================================
-- 2. Indexes for performance
-- ============================================

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_channel_read_status_user
ON public.channel_read_status(user_id);

-- Index for channel lookups
CREATE INDEX IF NOT EXISTS idx_channel_read_status_channel
ON public.channel_read_status(channel_id);

-- Composite index for the most common query
CREATE INDEX IF NOT EXISTS idx_channel_read_status_user_channel
ON public.channel_read_status(user_id, channel_id);

-- Index for finding channels with unread messages
CREATE INDEX IF NOT EXISTS idx_channel_read_status_unread
ON public.channel_read_status(user_id, unread_count)
WHERE unread_count > 0;

-- ============================================
-- 3. Enable RLS
-- ============================================

ALTER TABLE public.channel_read_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read status
CREATE POLICY "Users can view own read status"
ON public.channel_read_status
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own read status
CREATE POLICY "Users can insert own read status"
ON public.channel_read_status
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own read status
CREATE POLICY "Users can update own read status"
ON public.channel_read_status
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own read status
CREATE POLICY "Users can delete own read status"
ON public.channel_read_status
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 4. Helper functions
-- ============================================

-- Function to mark channel as read
CREATE OR REPLACE FUNCTION public.mark_channel_read(
  p_channel_id UUID,
  p_last_message_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.channel_read_status (
    user_id,
    channel_id,
    last_read_at,
    last_read_message_id,
    unread_count,
    has_mentions
  )
  VALUES (
    auth.uid(),
    p_channel_id,
    NOW(),
    p_last_message_id,
    0,
    false
  )
  ON CONFLICT (user_id, channel_id)
  DO UPDATE SET
    last_read_at = NOW(),
    last_read_message_id = COALESCE(p_last_message_id, channel_read_status.last_read_message_id),
    unread_count = 0,
    has_mentions = false,
    updated_at = NOW();
END;
$$;

-- Function to increment unread count for all users in a channel except sender
CREATE OR REPLACE FUNCTION public.increment_unread_counts(
  p_channel_id UUID,
  p_sender_id UUID,
  p_message_content TEXT DEFAULT NULL,
  p_mentions UUID[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_id UUID;
BEGIN
  -- Get channel members (for DMs) or all users who have interacted with channel
  -- For public channels, we only increment for users who have existing read status

  -- Update existing read status records
  UPDATE public.channel_read_status
  SET
    unread_count = unread_count + 1,
    has_mentions = has_mentions OR (p_mentions IS NOT NULL AND user_id = ANY(p_mentions)),
    updated_at = NOW()
  WHERE channel_id = p_channel_id
    AND user_id != p_sender_id;

  -- For DM channels, ensure both members have read status records
  IF EXISTS (SELECT 1 FROM public.channels WHERE id = p_channel_id AND type = 'dm') THEN
    INSERT INTO public.channel_read_status (user_id, channel_id, unread_count, has_mentions)
    SELECT
      unnest(members) AS user_id,
      p_channel_id,
      1,
      p_mentions IS NOT NULL AND unnest(members) = ANY(p_mentions)
    FROM public.channels
    WHERE id = p_channel_id
      AND unnest(members) != p_sender_id
    ON CONFLICT (user_id, channel_id)
    DO UPDATE SET
      unread_count = channel_read_status.unread_count + 1,
      has_mentions = channel_read_status.has_mentions OR EXCLUDED.has_mentions,
      updated_at = NOW();
  END IF;
END;
$$;

-- Function to get unread counts for a user
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  channel_id UUID,
  unread_count INTEGER,
  has_mentions BOOLEAN,
  last_read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    crs.channel_id,
    crs.unread_count,
    crs.has_mentions,
    crs.last_read_at
  FROM public.channel_read_status crs
  WHERE crs.user_id = COALESCE(p_user_id, auth.uid())
    AND crs.unread_count > 0;
END;
$$;

-- Function to get total unread count for a user
CREATE OR REPLACE FUNCTION public.get_total_unread_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0)
  INTO total
  FROM public.channel_read_status
  WHERE user_id = COALESCE(p_user_id, auth.uid());

  RETURN total;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.mark_channel_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_unread_counts(UUID, UUID, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_unread_count(UUID) TO authenticated;

-- ============================================
-- 5. Trigger to auto-increment unread on new message
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_message_unread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for non-thread messages (thread replies don't affect channel unread)
  IF NEW.thread_id IS NULL THEN
    PERFORM public.increment_unread_counts(
      NEW.channel_id,
      NEW.sender_id,
      NEW.content,
      NEW.mentions
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_message_unread ON public.messages;
CREATE TRIGGER trg_new_message_unread
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_message_unread();

-- ============================================
-- 6. Enable realtime for read status
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_read_status;

-- ============================================
-- Done!
-- ============================================
SELECT 'Unread tracking migration complete!' as status;
