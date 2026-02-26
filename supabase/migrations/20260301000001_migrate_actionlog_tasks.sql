-- Migrate existing ActionLog tasks to tasks table
-- One-time migration: copies action_type='task' records from action_logs to tasks
-- Note: action_logs does not have project_id, company_id, or metadata columns on tasks table

INSERT INTO public.tasks (
  title, description, status, priority, assigned_to,
  due_date, created_date, updated_date, created_by, source
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
  al.due_date,
  al.created_date,
  al.updated_date,
  al.user_id,
  'migrated'
FROM public.action_logs al
WHERE al.action_type = 'task'
ON CONFLICT DO NOTHING;
