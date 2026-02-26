-- Add chat history column for the AI Store Builder
-- Persists the conversation between the user and the AI coding agent
-- so that context is preserved across page reloads.
ALTER TABLE public.portal_settings
ADD COLUMN IF NOT EXISTS store_builder_chat_history JSONB DEFAULT '[]'::jsonb;
