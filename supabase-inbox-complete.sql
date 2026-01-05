-- ============================================
-- Complete Inbox System Fix
-- Proper channel membership and message access
-- ============================================

-- ============================================
-- 1. CHANNELS TABLE - Ensure all columns exist
-- ============================================

-- Add all required columns
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'public';
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS members UUID[] DEFAULT ARRAY[]::UUID[];
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "channels_select" ON public.channels;
DROP POLICY IF EXISTS "channels_insert" ON public.channels;
DROP POLICY IF EXISTS "channels_update" ON public.channels;
DROP POLICY IF EXISTS "channels_delete" ON public.channels;

-- SELECT: Users can view channels they have access to
-- - Public channels (type = 'public' or NULL)
-- - Channels they created (user_id)
-- - Channels where they are a member (members array)
CREATE POLICY "channels_select" ON public.channels
FOR SELECT TO authenticated
USING (
  type = 'public'
  OR type IS NULL
  OR user_id = auth.uid()
  OR auth.uid() = ANY(members)
);

-- INSERT: Authenticated users can create channels
CREATE POLICY "channels_insert" ON public.channels
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: Users can update channels they created or are members of
CREATE POLICY "channels_update" ON public.channels
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR auth.uid() = ANY(members))
WITH CHECK (user_id = auth.uid() OR auth.uid() = ANY(members));

-- DELETE: Only creator can delete
CREATE POLICY "channels_delete" ON public.channels
FOR DELETE TO authenticated
USING (user_id = auth.uid());

GRANT ALL ON public.channels TO authenticated;

-- ============================================
-- 2. MESSAGES TABLE - Ensure all columns exist
-- ============================================

-- Add all required columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_avatar TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thread_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT ARRAY[]::UUID[];
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add created_date column if missing (frontend uses this name)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;

-- SELECT: Users can view messages in channels they have access to
CREATE POLICY "messages_select" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id
    AND (
      c.type = 'public'
      OR c.type IS NULL
      OR c.user_id = auth.uid()
      OR auth.uid() = ANY(c.members)
    )
  )
);

-- INSERT: Users can send messages to channels they have access to
CREATE POLICY "messages_insert" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id
    AND (
      c.type = 'public'
      OR c.type IS NULL
      OR c.user_id = auth.uid()
      OR auth.uid() = ANY(c.members)
    )
  )
);

-- UPDATE: Users can only update their own messages
CREATE POLICY "messages_update" ON public.messages
FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- DELETE: Users can only delete their own messages
CREATE POLICY "messages_delete" ON public.messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid());

GRANT ALL ON public.messages TO authenticated;

-- ============================================
-- 3. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_members ON public.channels USING GIN(members);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);

-- ============================================
-- Done!
-- ============================================
SELECT 'Inbox system configured with proper access control!' as status;
