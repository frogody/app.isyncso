-- ============================================================================
-- B2B Chat → Inbox Bridge
-- Syncs b2b_chat_messages ↔ inbox channels + messages bidirectionally.
-- Also fixes column name mismatches (message→content, sender_type→sender).
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Fix column name mismatches between migration and frontend code
-- ═══════════════════════════════════════════════════════════════════════════

-- Rename 'message' → 'content' to match usePortalChat hook
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'b2b_chat_messages'
      AND column_name = 'message'
  ) THEN
    ALTER TABLE public.b2b_chat_messages RENAME COLUMN message TO content;
  END IF;
END $$;

-- Rename 'sender_type' → 'sender' to match usePortalChat hook
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'b2b_chat_messages'
      AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.b2b_chat_messages RENAME COLUMN sender_type TO sender;
  END IF;
END $$;

-- Update the CHECK constraint name for the renamed column
DO $$
BEGIN
  -- Drop old check constraint if it exists
  ALTER TABLE public.b2b_chat_messages DROP CONSTRAINT IF EXISTS b2b_chat_messages_sender_type_check;
  ALTER TABLE public.b2b_chat_messages DROP CONSTRAINT IF EXISTS b2b_chat_messages_sender_check;
  -- Re-add with correct column name
  ALTER TABLE public.b2b_chat_messages ADD CONSTRAINT b2b_chat_messages_sender_check
    CHECK (sender IN ('client', 'admin'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add cross-reference column to prevent sync loops
ALTER TABLE public.b2b_chat_messages
  ADD COLUMN IF NOT EXISTS inbox_message_id UUID;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Function: Find or create an inbox channel for a B2B client
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_or_create_b2b_inbox_channel(
  p_client_id UUID,
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id UUID;
  v_client_name TEXT;
  v_company_name TEXT;
  v_channel_name TEXT;
BEGIN
  -- Check for existing channel linked to this B2B client
  SELECT id INTO v_channel_id
  FROM public.channels
  WHERE linked_entity_type = 'b2b_client'
    AND linked_entity_id = p_client_id::text
  LIMIT 1;

  IF v_channel_id IS NOT NULL THEN
    RETURN v_channel_id;
  END IF;

  -- Get client display name
  SELECT full_name, company_name
  INTO v_client_name, v_company_name
  FROM public.portal_clients
  WHERE id = p_client_id
  LIMIT 1;

  v_channel_name := COALESCE(
    v_company_name,
    v_client_name,
    'B2B Client'
  );

  -- Create new support channel linked to the B2B client
  INSERT INTO public.channels (
    name,
    description,
    type,
    linked_entity_type,
    linked_entity_id,
    last_message_at,
    is_archived
  ) VALUES (
    v_channel_name,
    'B2B wholesale client chat',
    'support',
    'b2b_client',
    p_client_id::text,
    now(),
    false
  )
  RETURNING id INTO v_channel_id;

  -- Insert system message
  INSERT INTO public.messages (
    channel_id,
    sender_name,
    content,
    type
  ) VALUES (
    v_channel_id,
    'System',
    'B2B client chat channel created',
    'system'
  );

  RETURN v_channel_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Trigger: b2b_chat_messages → inbox messages
--    When a client or admin sends in B2B chat, mirror it to inbox.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_b2b_chat_to_inbox()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id UUID;
  v_new_message_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Skip if this message was already synced from inbox (prevents loop)
  IF NEW.inbox_message_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get or create the inbox channel for this client
  v_channel_id := public.get_or_create_b2b_inbox_channel(
    NEW.client_id,
    NEW.organization_id
  );

  -- Determine sender display name
  IF NEW.sender = 'client' THEN
    SELECT COALESCE(full_name, email, 'Client')
    INTO v_sender_name
    FROM public.portal_clients
    WHERE id = NEW.client_id
    LIMIT 1;
  ELSE
    SELECT COALESCE(full_name, email, 'Admin')
    INTO v_sender_name
    FROM public.users
    WHERE id = NEW.sender_id
    LIMIT 1;
  END IF;

  v_sender_name := COALESCE(v_sender_name, 'Unknown');

  -- Insert into inbox messages
  INSERT INTO public.messages (
    channel_id,
    sender_id,
    sender_name,
    content,
    type
  ) VALUES (
    v_channel_id,
    NEW.sender_id,
    v_sender_name,
    NEW.content,
    'b2b_sync'
  )
  RETURNING id INTO v_new_message_id;

  -- Update channel's last_message_at
  UPDATE public.channels
  SET last_message_at = now()
  WHERE id = v_channel_id;

  -- Store cross-reference to prevent loops
  UPDATE public.b2b_chat_messages
  SET inbox_message_id = v_new_message_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_chat_to_inbox ON public.b2b_chat_messages;
CREATE TRIGGER trg_b2b_chat_to_inbox
  AFTER INSERT ON public.b2b_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_b2b_chat_to_inbox();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Trigger: inbox messages → b2b_chat_messages
--    When an admin replies in an inbox channel linked to a B2B client,
--    mirror it back to b2b_chat_messages so the portal client sees it.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_inbox_to_b2b_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_type TEXT;
  v_client_id UUID;
  v_org_id UUID;
BEGIN
  -- Only sync text messages (skip system, b2b_sync, etc.)
  IF NEW.type IS NOT NULL AND NEW.type != 'text' THEN
    RETURN NEW;
  END IF;

  -- Check if this channel is linked to a B2B client
  SELECT linked_entity_type, linked_entity_id::uuid
  INTO v_linked_type, v_client_id
  FROM public.channels
  WHERE id = NEW.channel_id;

  IF v_linked_type IS NULL OR v_linked_type != 'b2b_client' THEN
    RETURN NEW;
  END IF;

  -- Get the organization_id from the portal_clients record
  SELECT organization_id INTO v_org_id
  FROM public.portal_clients
  WHERE id = v_client_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert into b2b_chat_messages as admin message with cross-reference
  INSERT INTO public.b2b_chat_messages (
    organization_id,
    client_id,
    sender,
    sender_id,
    content,
    read,
    inbox_message_id
  ) VALUES (
    v_org_id,
    v_client_id,
    'admin',
    NEW.sender_id,
    NEW.content,
    false,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_to_b2b_chat ON public.messages;
CREATE TRIGGER trg_inbox_to_b2b_chat
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inbox_to_b2b_chat();

COMMIT;
