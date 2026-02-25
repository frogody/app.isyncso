-- Add missing profile columns to users table
-- These are used by Settings.jsx profile form but were missing from the schema

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personal_tech_stack JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personal_knowledge_files JSONB DEFAULT '[]'::jsonb;
