-- Tasks V2: Extend tasks table for Linear-inspired task management
-- Adds columns for creator tracking, tenant scoping, subtasks, labels, ordering, source tracking, and draft support

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref_id UUID,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_company ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks(sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(source);
CREATE INDEX IF NOT EXISTS idx_tasks_is_draft ON public.tasks(is_draft) WHERE is_draft = true;

-- GIN index for label searches
CREATE INDEX IF NOT EXISTS idx_tasks_labels ON public.tasks USING gin(labels);
-- GIN index for checklist JSONB
CREATE INDEX IF NOT EXISTS idx_tasks_checklist ON public.tasks USING gin(checklist);
