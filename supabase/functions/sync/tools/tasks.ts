/**
 * Tasks Tool Functions for SYNC
 *
 * Actions:
 * - create_task
 * - update_task
 * - assign_task
 * - list_tasks
 * - complete_task
 * - delete_task
 * - get_my_tasks
 * - get_overdue_tasks
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// Task statuses and priorities
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ============================================================================
// Task Types
// ============================================================================

interface TaskData {
  title: string;
  description?: string;
  type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  project_id?: string;
  candidate_id?: string;
  campaign_id?: string;
  // v2 fields
  checklist?: Array<{ id: string; title: string; done: boolean }>;
  labels?: string[];
  source?: string;
  source_ref_id?: string;
  is_draft?: boolean;
  estimated_minutes?: number;
  company_id?: string;
  created_by?: string;
}

interface TaskFilters {
  status?: string;
  priority?: string;
  assigned_to?: string;
  project_id?: string;
  type?: string;
  overdue?: boolean;
  limit?: number;
  // v2 filters
  is_draft?: boolean;
  source?: string;
  labels?: string[];
  company_id?: string;
}

// ============================================================================
// Create Task
// ============================================================================

export async function createTask(
  ctx: ActionContext,
  data: TaskData
): Promise<ActionResult> {
  try {
    const taskRecord = {
      organization_id: null,
      title: data.title,
      description: data.description || null,
      type: data.type || 'follow_up',
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      assigned_to: data.assigned_to || ctx.userId || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      project_id: data.project_id || null,
      candidate_id: data.candidate_id || null,
      campaign_id: data.campaign_id || null,
      checklist: data.checklist || [],
      labels: data.labels || [],
      source: data.source || 'sync_agent',
      source_ref_id: data.source_ref_id || null,
      is_draft: data.is_draft || false,
      estimated_minutes: data.estimated_minutes || null,
      company_id: data.company_id || null,
      created_by: data.created_by || ctx.userId || null,
    };

    const { data: task, error } = await ctx.supabase
      .from('tasks')
      .insert(taskRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create task: ${error.message}`, error.message);
    }

    const dueInfo = task.due_date ? `\n- Due: ${formatDate(task.due_date)}` : '';
    return successResult(
      `✅ Task created!\n\n**${task.title}**\n- Priority: ${task.priority}\n- Status: ${task.status}${dueInfo}`,
      task,
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception creating task: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update Task
// ============================================================================

export async function updateTask(
  ctx: ActionContext,
  data: { id?: string; title?: string; updates: Partial<TaskData> }
): Promise<ActionResult> {
  try {
    let taskId = data.id;
    let taskTitle: string | undefined;

    if (!taskId && data.title) {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${data.title}%`)
        .limit(1);

      if (tasks && tasks.length > 0) {
        taskId = tasks[0].id;
        taskTitle = tasks[0].title;
      }
    }

    if (!taskId) {
      return errorResult('Task not found. Please provide a valid ID or title.', 'Not found');
    }

    const updateFields: Record<string, any> = { updated_date: new Date().toISOString() };

    if (data.updates.title) updateFields.title = data.updates.title;
    if (data.updates.description !== undefined) updateFields.description = data.updates.description;
    if (data.updates.type) updateFields.type = data.updates.type;
    if (data.updates.status && TASK_STATUSES.includes(data.updates.status)) {
      updateFields.status = data.updates.status;
      if (data.updates.status === 'completed') {
        updateFields.completed_at = new Date().toISOString();
      }
    }
    if (data.updates.priority && TASK_PRIORITIES.includes(data.updates.priority)) {
      updateFields.priority = data.updates.priority;
    }
    if (data.updates.assigned_to) updateFields.assigned_to = data.updates.assigned_to;
    if (data.updates.due_date) updateFields.due_date = new Date(data.updates.due_date).toISOString();
    if (data.updates.checklist !== undefined) updateFields.checklist = data.updates.checklist;
    if (data.updates.labels !== undefined) updateFields.labels = data.updates.labels;
    if (data.updates.estimated_minutes !== undefined) updateFields.estimated_minutes = data.updates.estimated_minutes;
    if (data.updates.is_draft !== undefined) updateFields.is_draft = data.updates.is_draft;
    if (data.updates.source !== undefined) updateFields.source = data.updates.source;

    const { data: updated, error } = await ctx.supabase
      .from('tasks')
      .update(updateFields)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to update task: ${error.message}`, error.message);
    }

    const changes = Object.keys(updateFields).filter(k => k !== 'updated_date' && k !== 'completed_at');
    return successResult(
      `✅ Task updated!\n\n**${taskTitle || updated.title}**\nUpdated: ${changes.join(', ')}`,
      updated,
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception updating task: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Assign Task
// ============================================================================

export async function assignTask(
  ctx: ActionContext,
  data: { id?: string; title?: string; assigned_to: string; assigned_name?: string }
): Promise<ActionResult> {
  try {
    let taskId = data.id;
    let taskTitle: string | undefined;

    if (!taskId && data.title) {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${data.title}%`)
        .limit(1);

      if (tasks && tasks.length > 0) {
        taskId = tasks[0].id;
        taskTitle = tasks[0].title;
      }
    }

    if (!taskId) {
      return errorResult('Task not found.', 'Not found');
    }

    // If assigned_name is provided, try to find user by name
    let assigneeId = data.assigned_to;
    let assigneeName = data.assigned_name || 'Unknown';

    if (data.assigned_name && !data.assigned_to) {
      // Try to find user by name
      const { data: users } = await ctx.supabase
        .from('users')
        .select('id, full_name')
        .ilike('full_name', `%${data.assigned_name}%`)
        .limit(1);

      if (users && users.length > 0) {
        assigneeId = users[0].id;
        assigneeName = users[0].full_name;
      } else {
        return errorResult(`User "${data.assigned_name}" not found.`, 'User not found');
      }
    }

    const { data: updated, error } = await ctx.supabase
      .from('tasks')
      .update({
        assigned_to: assigneeId,
        updated_date: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to assign task: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Task assigned!\n\n**${taskTitle || updated.title}**\nAssigned to: ${assigneeName}`,
      updated,
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception assigning task: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Tasks
// ============================================================================

export async function listTasks(
  ctx: ActionContext,
  filters: TaskFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('tasks')
      .select('id, title, description, type, status, priority, assigned_to, due_date, created_date, checklist, labels, source, is_draft, estimated_minutes')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.overdue) {
      query = query
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .lt('due_date', new Date().toISOString());
    }
    if (filters.is_draft !== undefined) {
      query = query.eq('is_draft', filters.is_draft);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.labels && filters.labels.length > 0) {
      query = query.overlaps('labels', filters.labels);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return errorResult(`Failed to list tasks: ${error.message}`, error.message);
    }

    if (!tasks || tasks.length === 0) {
      return successResult('No tasks found matching your criteria.', []);
    }

    const priorityEmoji: Record<string, string> = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };

    const list = formatList(tasks, (t) => {
      const emoji = priorityEmoji[t.priority] || '⚪';
      const due = t.due_date ? ` | Due: ${formatDate(t.due_date)}` : '';
      const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' ? ' ⚠️' : '';
      return `- ${emoji} **${t.title}** | ${t.status}${due}${overdue}`;
    });

    return successResult(
      `Found ${tasks.length} task(s):\n\n${list}`,
      tasks,
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception listing tasks: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Complete Task
// ============================================================================

export async function completeTask(
  ctx: ActionContext,
  data: { id?: string; title?: string }
): Promise<ActionResult> {
  try {
    let taskId = data.id;
    let taskTitle: string | undefined;

    if (!taskId && data.title) {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${data.title}%`)
        .neq('status', 'completed')
        .limit(1);

      if (tasks && tasks.length > 0) {
        taskId = tasks[0].id;
        taskTitle = tasks[0].title;
      }
    }

    if (!taskId) {
      return errorResult('Task not found or already completed.', 'Not found');
    }

    const { data: updated, error } = await ctx.supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to complete task: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Task completed!\n\n**${taskTitle || updated.title}**\nCompleted at: ${formatDate(updated.completed_at)}`,
      updated,
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception completing task: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Delete Task
// ============================================================================

export async function deleteTask(
  ctx: ActionContext,
  data: { id?: string; title?: string }
): Promise<ActionResult> {
  try {
    let taskId = data.id;
    let taskTitle: string | undefined;

    if (!taskId && data.title) {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${data.title}%`)
        .limit(1);

      if (tasks && tasks.length > 0) {
        taskId = tasks[0].id;
        taskTitle = tasks[0].title;
      }
    }

    if (!taskId) {
      return errorResult('Task not found.', 'Not found');
    }

    const { error } = await ctx.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      return errorResult(`Failed to delete task: ${error.message}`, error.message);
    }

    return successResult(
      `🗑️ Task deleted: **${taskTitle || 'Unknown'}**`,
      { id: taskId, deleted: true },
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception deleting task: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get My Tasks
// ============================================================================

export async function getMyTasks(
  ctx: ActionContext,
  data: { status?: string; limit?: number } = {}
): Promise<ActionResult> {
  if (!ctx.userId) {
    return errorResult('User ID not available. Cannot retrieve your tasks.', 'No user context');
  }

  return listTasks(ctx, {
    assigned_to: ctx.userId,
    status: data.status,
    limit: data.limit,
  });
}

// ============================================================================
// Get Overdue Tasks
// ============================================================================

export async function getOverdueTasks(
  ctx: ActionContext,
  data: { limit?: number } = {}
): Promise<ActionResult> {
  try {
    const { data: tasks, error } = await ctx.supabase
      .from('tasks')
      .select('id, title, description, type, status, priority, assigned_to, due_date')
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .not('due_date', 'is', null)
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(data.limit || 20);

    if (error) {
      return errorResult(`Failed to get overdue tasks: ${error.message}`, error.message);
    }

    if (!tasks || tasks.length === 0) {
      return successResult('✅ No overdue tasks! Great job keeping up.', []);
    }

    const priorityEmoji: Record<string, string> = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };

    const list = formatList(tasks, (t) => {
      const emoji = priorityEmoji[t.priority] || '⚪';
      const daysOverdue = Math.floor((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24));
      return `- ${emoji} **${t.title}** | ${daysOverdue} day(s) overdue | ${t.status}`;
    });

    return successResult(
      `⚠️ Found ${tasks.length} overdue task(s):\n\n${list}`,
      tasks,
      '/tasks'
    );
  } catch (err) {
    return errorResult(`Exception getting overdue tasks: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Triage Tasks (list draft tasks for review)
// ============================================================================

export async function triageTasks(
  ctx: ActionContext,
  data: { limit?: number } = {}
): Promise<ActionResult> {
  if (!ctx.userId) {
    return errorResult('User ID not available.', 'No user context');
  }

  return listTasks(ctx, {
    assigned_to: ctx.userId,
    is_draft: true,
    limit: data.limit || 20,
  });
}

// ============================================================================
// Tasks Action Router
// ============================================================================

export async function executeTasksAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'create_task':
      return createTask(ctx, data);
    case 'update_task':
      return updateTask(ctx, data);
    case 'assign_task':
      return assignTask(ctx, data);
    case 'list_tasks':
      return listTasks(ctx, data);
    case 'complete_task':
      return completeTask(ctx, data);
    case 'delete_task':
      return deleteTask(ctx, data);
    case 'get_my_tasks':
      return getMyTasks(ctx, data);
    case 'get_overdue_tasks':
      return getOverdueTasks(ctx, data);
    case 'triage_tasks':
      return triageTasks(ctx, data);
    default:
      return errorResult(`Unknown tasks action: ${action}`, 'Unknown action');
  }
}
