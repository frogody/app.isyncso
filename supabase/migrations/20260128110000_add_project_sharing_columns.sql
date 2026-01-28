-- Migration: Add missing columns to projects table for sharing and enhanced features
-- Date: 2026-01-28
-- Description: Adds share_settings, attachments, client_updates, page_content, team_members, tags, milestones, start_date, spent

-- Add share_settings column for public sharing configuration
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{
  "is_public": false,
  "share_link": "",
  "allow_comments": true,
  "show_budget": false,
  "show_tasks": true,
  "show_milestones": true,
  "show_timeline": true,
  "password_protected": false,
  "password": ""
}'::jsonb;

-- Add attachments column for project files
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add client_updates column for client-facing updates/notes
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_updates JSONB DEFAULT '[]'::jsonb;

-- Add page_content column for custom page content blocks
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS page_content JSONB DEFAULT '[]'::jsonb;

-- Add team_members column for assigned team members
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb;

-- Add tags column for project categorization
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add milestones column for project milestones
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;

-- Add start_date column for project start date
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add spent column for tracking actual spending against budget
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS spent NUMERIC DEFAULT 0;

-- Create indexes for commonly queried JSONB fields
CREATE INDEX IF NOT EXISTS idx_projects_share_settings_public
ON public.projects ((share_settings->>'is_public'));

CREATE INDEX IF NOT EXISTS idx_projects_tags
ON public.projects USING gin(tags);

-- Add comments for documentation
COMMENT ON COLUMN public.projects.share_settings IS 'JSONB configuration for public sharing: is_public, share_link, allow_comments, show_budget, show_tasks, show_milestones, show_timeline, password_protected, password';
COMMENT ON COLUMN public.projects.attachments IS 'JSONB array of file attachments with name, url, type, size, uploaded_at';
COMMENT ON COLUMN public.projects.client_updates IS 'JSONB array of client-facing updates with content, created_at, is_public';
COMMENT ON COLUMN public.projects.page_content IS 'JSONB array of custom page content blocks for client portal';
COMMENT ON COLUMN public.projects.team_members IS 'JSONB array of team member assignments with user_id, role, assigned_at';
COMMENT ON COLUMN public.projects.tags IS 'Array of text tags for project categorization';
COMMENT ON COLUMN public.projects.milestones IS 'JSONB array of milestones with title, due_date, completed, description';
COMMENT ON COLUMN public.projects.start_date IS 'Project start date';
COMMENT ON COLUMN public.projects.spent IS 'Actual amount spent on the project';
