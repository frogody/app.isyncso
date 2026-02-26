-- Migrate existing ActionLog tasks to tasks table
-- One-time migration: copies action_type='task' records from action_logs to tasks

INSERT INTO public.tasks (
  title, description, status, priority, assigned_to, project_id,
  due_date, metadata, created_date, updated_date, company_id, created_by, source
)
SELECT
  COALESCE(al.title, al.action_description, 'Untitled Task'),
  COALESCE(al.description, al.notes),
  CASE al.status
    WHEN 'success' THEN 'completed'
    WHEN 'pending' THEN 'pending'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'review' THEN 'in_progress'
    ELSE 'pending'
  END,
  COALESCE(al.priority, 'medium'),
  al.user_id,
  al.project_id,
  al.due_date,
  COALESCE(al.metadata, '{}'),
  al.created_date,
  al.updated_date,
  al.company_id,
  al.user_id,
  'migrated'
FROM public.action_logs al
WHERE al.action_type = 'task'
ON CONFLICT DO NOTHING;
