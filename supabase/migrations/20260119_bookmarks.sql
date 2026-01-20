-- ============================================
-- Bookmarks Migration
-- Save/bookmark messages for later reference
-- ============================================

-- ============================================
-- 1. Bookmarks table
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.message_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_message_id ON public.message_bookmarks(message_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.message_bookmarks(created_at DESC);

-- ============================================
-- 2. RLS Policies
-- ============================================

ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON public.message_bookmarks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own bookmarks
CREATE POLICY "Users can create own bookmarks"
ON public.message_bookmarks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own bookmarks
CREATE POLICY "Users can update own bookmarks"
ON public.message_bookmarks FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON public.message_bookmarks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 3. Forwarded messages tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  forwarded_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  forwarded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  forwarded_to_channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forwards_original_message ON public.message_forwards(original_message_id);
CREATE INDEX IF NOT EXISTS idx_forwards_forwarded_by ON public.message_forwards(forwarded_by);

-- RLS for forwards
ALTER TABLE public.message_forwards ENABLE ROW LEVEL SECURITY;

-- Users can see forwards they created or received
CREATE POLICY "Users can view related forwards"
ON public.message_forwards FOR SELECT
TO authenticated
USING (
  forwarded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = forwarded_to_channel_id
    AND (auth.uid() = ANY(c.members) OR auth.uid() = ANY(c.participants))
  )
);

-- Users can create forwards
CREATE POLICY "Users can create forwards"
ON public.message_forwards FOR INSERT
TO authenticated
WITH CHECK (forwarded_by = auth.uid());

-- ============================================
-- 4. Add is_forwarded flag to messages
-- ============================================

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT;

-- ============================================
-- 5. Helper functions
-- ============================================

-- Toggle bookmark
CREATE OR REPLACE FUNCTION public.toggle_bookmark(
  p_message_id UUID,
  p_note TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.message_bookmarks
    WHERE user_id = auth.uid() AND message_id = p_message_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove bookmark
    DELETE FROM public.message_bookmarks
    WHERE user_id = auth.uid() AND message_id = p_message_id;
    RETURN FALSE;
  ELSE
    -- Add bookmark
    INSERT INTO public.message_bookmarks (user_id, message_id, note, tags)
    VALUES (auth.uid(), p_message_id, p_note, p_tags);
    RETURN TRUE;
  END IF;
END;
$$;

-- Get user bookmarks with message details
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  bookmark_id UUID,
  message_id UUID,
  channel_id UUID,
  channel_name TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  message_type TEXT,
  file_url TEXT,
  file_name TEXT,
  created_date TIMESTAMPTZ,
  note TEXT,
  tags TEXT[],
  bookmarked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS bookmark_id,
    m.id AS message_id,
    m.channel_id,
    c.name AS channel_name,
    m.sender_name,
    m.sender_avatar,
    m.content,
    m.type AS message_type,
    m.file_url,
    m.file_name,
    m.created_date,
    b.note,
    b.tags,
    b.created_at AS bookmarked_at
  FROM public.message_bookmarks b
  JOIN public.messages m ON m.id = b.message_id
  LEFT JOIN public.channels c ON c.id = m.channel_id
  WHERE b.user_id = auth.uid()
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.toggle_bookmark(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(INTEGER, INTEGER) TO authenticated;

-- ============================================
-- Done!
-- ============================================
SELECT 'Bookmarks and forwarding migration complete!' as status;
