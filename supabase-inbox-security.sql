-- ============================================
-- CRITICAL: Inbox Security Fix
-- Fixes data leakage in channels and messages
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CHANNELS TABLE - Fix RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can insert channels" ON public.channels;
DROP POLICY IF EXISTS "Users can update channels" ON public.channels;
DROP POLICY IF EXISTS "Users can delete channels" ON public.channels;
DROP POLICY IF EXISTS "Authenticated users can view public channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view DMs they are part of" ON public.channels;

-- Enable RLS if not already
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Users can view:
-- 1. Public channels (type = 'public' or type is null)
-- 2. Channels they created
-- 3. DMs where they are a member
-- 4. Private channels where they are a member
CREATE POLICY "Users can view accessible channels"
ON public.channels FOR SELECT
TO authenticated
USING (
  -- Public channels
  (type = 'public' OR type IS NULL)
  OR
  -- User created the channel
  (created_by = auth.email())
  OR
  -- User is a member (for DMs and private channels)
  (auth.uid()::text = ANY(members))
  OR
  -- Check members array contains user id as string
  (members @> ARRAY[auth.uid()::text])
);

-- Users can create channels
CREATE POLICY "Users can create channels"
ON public.channels FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update channels they created or are members of
CREATE POLICY "Users can update own channels"
ON public.channels FOR UPDATE
TO authenticated
USING (
  created_by = auth.email()
  OR auth.uid()::text = ANY(members)
)
WITH CHECK (
  created_by = auth.email()
  OR auth.uid()::text = ANY(members)
);

-- Users can delete channels they created
CREATE POLICY "Users can delete own channels"
ON public.channels FOR DELETE
TO authenticated
USING (created_by = auth.email());

GRANT ALL ON public.channels TO authenticated;

-- ============================================
-- 2. MESSAGES TABLE - Fix RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;

-- Enable RLS if not already
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only view messages in channels they have access to
CREATE POLICY "Users can view messages in accessible channels"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id
    AND (
      -- Public channels
      (c.type = 'public' OR c.type IS NULL)
      OR
      -- User created the channel
      (c.created_by = auth.email())
      OR
      -- User is a member
      (auth.uid()::text = ANY(c.members))
    )
  )
);

-- Users can insert messages in channels they have access to
CREATE POLICY "Users can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id
    AND (
      (c.type = 'public' OR c.type IS NULL)
      OR (c.created_by = auth.email())
      OR (auth.uid()::text = ANY(c.members))
    )
  )
);

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

GRANT ALL ON public.messages TO authenticated;

-- ============================================
-- 3. Add user_id column if missing (for proper filtering)
-- ============================================

-- Add user_id to channels if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.channels ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Add user_id to messages if not exists (use sender_id instead)
-- Messages already have sender_id which serves this purpose

-- ============================================
-- Done!
-- ============================================
SELECT 'Inbox security policies applied!' as status;
