-- ============================================
-- Read Receipts Migration
-- Track which users have read which messages
-- ============================================

-- ============================================
-- 1. Message reads tracking table
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON public.message_reads(read_at DESC);

-- ============================================
-- 2. RLS Policies
-- ============================================

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Users can see read receipts for messages in their channels
CREATE POLICY "Users can view read receipts for channel messages"
ON public.message_reads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.channel_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = message_reads.message_id
    AND cm.user_id = auth.uid()
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.message_reads FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.channel_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = message_reads.message_id
    AND cm.user_id = auth.uid()
  )
);

-- Users can update their own read receipts
CREATE POLICY "Users can update own read receipts"
ON public.message_reads FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own read receipts
CREATE POLICY "Users can delete own read receipts"
ON public.message_reads FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 3. Function to mark message as read
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_message_read(
  p_message_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_reads (message_id, user_id, read_at)
  VALUES (p_message_id, auth.uid(), NOW())
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET read_at = NOW();
END;
$$;

-- ============================================
-- 4. Function to mark multiple messages as read
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_message_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_reads (message_id, user_id, read_at)
  SELECT unnest(p_message_ids), auth.uid(), NOW()
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET read_at = NOW();
END;
$$;

-- ============================================
-- 5. Function to get read receipts for a message
-- ============================================

CREATE OR REPLACE FUNCTION public.get_message_read_receipts(
  p_message_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.user_id,
    u.full_name AS user_name,
    u.avatar_url AS user_avatar,
    mr.read_at
  FROM public.message_reads mr
  JOIN public.users u ON u.id = mr.user_id
  WHERE mr.message_id = p_message_id
  ORDER BY mr.read_at DESC;
END;
$$;

-- ============================================
-- 6. Function to get read count for messages
-- ============================================

CREATE OR REPLACE FUNCTION public.get_messages_read_counts(
  p_message_ids UUID[]
)
RETURNS TABLE (
  message_id UUID,
  read_count BIGINT,
  readers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.message_id,
    COUNT(mr.user_id) AS read_count,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'user_id', mr.user_id,
        'user_name', u.full_name,
        'user_avatar', u.avatar_url,
        'read_at', mr.read_at
      )
      ORDER BY mr.read_at DESC
    ) AS readers
  FROM public.message_reads mr
  JOIN public.users u ON u.id = mr.user_id
  WHERE mr.message_id = ANY(p_message_ids)
  GROUP BY mr.message_id;
END;
$$;

-- ============================================
-- 7. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.mark_message_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_read_receipts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_messages_read_counts(UUID[]) TO authenticated;

-- ============================================
-- 8. Enable realtime for read receipts
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;

-- ============================================
-- Done!
-- ============================================
SELECT 'Read receipts migration complete!' as status;
