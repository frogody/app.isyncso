-- ============================================
-- Inbox Realtime Upgrade Migration
-- Adds realtime support, helper functions, and performance indexes
-- ============================================

-- ============================================
-- 1. Enable Realtime for inbox tables
-- ============================================

-- Enable realtime replication for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime replication for channels table
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;

-- ============================================
-- 2. Helper Functions
-- ============================================

-- Function to increment reply count atomically
CREATE OR REPLACE FUNCTION public.increment_reply_count(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET reply_count = COALESCE(reply_count, 0) + 1
  WHERE id = message_id;
END;
$$;

-- Function to decrement reply count atomically
CREATE OR REPLACE FUNCTION public.decrement_reply_count(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET reply_count = GREATEST(COALESCE(reply_count, 0) - 1, 0)
  WHERE id = message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_reply_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_reply_count(UUID) TO authenticated;

-- ============================================
-- 3. Additional Indexes for Performance
-- ============================================

-- Index for faster message retrieval by channel (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_channel_created
ON public.messages(channel_id, created_date DESC);

-- Index for thread queries
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
ON public.messages(thread_id, created_date ASC)
WHERE thread_id IS NOT NULL;

-- Index for channel ordering by last message
CREATE INDEX IF NOT EXISTS idx_channels_last_message
ON public.channels(last_message_at DESC NULLS LAST)
WHERE is_archived = false;

-- Composite index for user's accessible channels
CREATE INDEX IF NOT EXISTS idx_channels_user_type
ON public.channels(user_id, type)
WHERE is_archived = false;

-- ============================================
-- 4. Trigger to auto-update channel's last_message_at
-- ============================================

-- Function to update channel's last message timestamp
CREATE OR REPLACE FUNCTION public.update_channel_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update for top-level messages (not thread replies)
  IF NEW.thread_id IS NULL THEN
    UPDATE public.channels
    SET last_message_at = NEW.created_date
    WHERE id = NEW.channel_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_update_channel_last_message ON public.messages;
CREATE TRIGGER trg_update_channel_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_channel_last_message();

-- ============================================
-- 5. Trigger to auto-decrement reply count on delete
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_reply_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this was a reply, decrement parent's reply count
  IF OLD.thread_id IS NOT NULL THEN
    PERFORM public.decrement_reply_count(OLD.thread_id);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_reply_delete ON public.messages;
CREATE TRIGGER trg_handle_reply_delete
AFTER DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_reply_delete();

-- ============================================
-- Done!
-- ============================================
SELECT 'Inbox realtime upgrade migration complete!' as status;
