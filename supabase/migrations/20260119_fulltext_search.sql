-- ============================================
-- Full-Text Search Migration
-- PostgreSQL tsvector/tsquery based search for messages
-- ============================================

-- ============================================
-- 1. Add tsvector column to messages
-- ============================================

-- Add search vector column
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_messages_search_vector
ON public.messages USING GIN(search_vector);

-- ============================================
-- 2. Function to update search vector
-- ============================================

CREATE OR REPLACE FUNCTION public.messages_search_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.sender_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS trg_messages_search_update ON public.messages;
CREATE TRIGGER trg_messages_search_update
BEFORE INSERT OR UPDATE OF content, sender_name ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.messages_search_trigger();

-- ============================================
-- 3. Update existing messages with search vector
-- ============================================

UPDATE public.messages
SET search_vector =
  setweight(to_tsvector('english', COALESCE(sender_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'A')
WHERE search_vector IS NULL;

-- ============================================
-- 4. Search function
-- ============================================

CREATE OR REPLACE FUNCTION public.search_messages(
  p_query TEXT,
  p_channel_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  type TEXT,
  created_date TIMESTAMPTZ,
  is_pinned BOOLEAN,
  reply_count INTEGER,
  thread_id UUID,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_query tsquery;
BEGIN
  -- Convert search string to tsquery with prefix matching
  search_query := plainto_tsquery('english', p_query);

  -- Also try websearch_to_tsquery for better handling of search operators
  IF search_query IS NULL OR search_query::text = '' THEN
    search_query := websearch_to_tsquery('english', p_query);
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.channel_id,
    m.sender_id,
    m.sender_name,
    m.sender_avatar,
    m.content,
    m.type,
    m.created_date,
    m.is_pinned,
    m.reply_count,
    m.thread_id,
    ts_rank(m.search_vector, search_query) AS rank
  FROM public.messages m
  WHERE
    -- Full-text search
    m.search_vector @@ search_query
    -- Optional channel filter
    AND (p_channel_id IS NULL OR m.channel_id = p_channel_id)
  ORDER BY rank DESC, m.created_date DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- 5. Search with highlights function
-- ============================================

CREATE OR REPLACE FUNCTION public.search_messages_with_highlights(
  p_query TEXT,
  p_channel_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  content_highlighted TEXT,
  type TEXT,
  created_date TIMESTAMPTZ,
  is_pinned BOOLEAN,
  reply_count INTEGER,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_query tsquery;
BEGIN
  search_query := plainto_tsquery('english', p_query);

  IF search_query IS NULL OR search_query::text = '' THEN
    search_query := websearch_to_tsquery('english', p_query);
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.channel_id,
    m.sender_id,
    m.sender_name,
    m.sender_avatar,
    m.content,
    ts_headline('english', m.content, search_query,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS content_highlighted,
    m.type,
    m.created_date,
    m.is_pinned,
    m.reply_count,
    ts_rank(m.search_vector, search_query) AS rank
  FROM public.messages m
  WHERE
    m.search_vector @@ search_query
    AND (p_channel_id IS NULL OR m.channel_id = p_channel_id)
  ORDER BY rank DESC, m.created_date DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.search_messages(TEXT, UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_messages_with_highlights(TEXT, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================
-- Done!
-- ============================================
SELECT 'Full-text search migration complete!' as status;
