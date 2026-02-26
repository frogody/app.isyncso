import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Core tasks hook — CRUD, filtering, real-time subscriptions, optimistic updates
 */
export function useTasks(options = {}) {
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  const {
    filters = {},
    enableRealtime = true,
  } = options;

  // Build and execute query
  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      let query = supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_date', { ascending: false });

      // Apply filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      if (filters.project_id) query = query.eq('project_id', filters.project_id);
      if (filters.company_id) query = query.eq('company_id', filters.company_id);
      if (filters.created_by) query = query.eq('created_by', filters.created_by);
      if (filters.source) query = query.eq('source', filters.source);

      // Draft filter — default to hiding drafts
      if (filters.is_draft === true) {
        query = query.eq('is_draft', true);
      } else if (filters.is_draft !== undefined) {
        query = query.or('is_draft.is.null,is_draft.eq.false');
      } else {
        query = query.or('is_draft.is.null,is_draft.eq.false');
      }

      // Labels filter
      if (filters.labels && filters.labels.length > 0) {
        query = query.overlaps('labels', filters.labels);
      }

      // Search
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Due date range
      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }
      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }

      // Overdue filter
      if (filters.overdue) {
        query = query
          .not('status', 'in', '("completed","cancelled")')
          .not('due_date', 'is', null)
          .lt('due_date', new Date().toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTasks(data?.map(t => ({ ...t, id: String(t.id) })) || []);
    } catch (err) {
      console.error('[useTasks] fetch error:', err);
      setError(err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [fetchTasks, user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || !enableRealtime) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === 'INSERT') {
          setTasks(prev => {
            const exists = prev.some(t => String(t.id) === String(newRecord.id));
            if (exists) return prev;
            return [{ ...newRecord, id: String(newRecord.id) }, ...prev];
          });
        } else if (eventType === 'UPDATE') {
          setTasks(prev =>
            prev.map(t =>
              String(t.id) === String(newRecord.id)
                ? { ...newRecord, id: String(newRecord.id) }
                : t
            )
          );
        } else if (eventType === 'DELETE') {
          setTasks(prev =>
            prev.filter(t => String(t.id) !== String(oldRecord.id))
          );
        }
      })
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, enableRealtime]);

  // Create task
  const createTask = useCallback(async (taskData) => {
    if (!user?.id) return null;

    try {
      const record = {
        title: taskData.title,
        description: taskData.description || null,
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        assigned_to: taskData.assigned_to || user.id,
        project_id: taskData.project_id || null,
        due_date: taskData.due_date || null,
        checklist: taskData.checklist || [],
        labels: taskData.labels || [],
        sort_order: taskData.sort_order || 0,
        source: taskData.source || 'manual',
        source_ref_id: taskData.source_ref_id || null,
        estimated_minutes: taskData.estimated_minutes || null,
        is_draft: taskData.is_draft || false,
        created_by: user.id,
        company_id: user.company_id || null,
        organization_id: user.organization_id || null,
        type: taskData.type || 'follow_up',
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(record)
        .select()
        .single();

      if (error) throw error;

      const newTask = { ...data, id: String(data.id) };

      // Optimistic add (realtime will also fire but we check for duplicates)
      setTasks(prev => [newTask, ...prev]);

      return newTask;
    } catch (err) {
      console.error('[useTasks] create error:', err);
      toast.error('Failed to create task');
      return null;
    }
  }, [user?.id, user?.company_id]);

  // Update task
  const updateTask = useCallback(async (id, updates) => {
    try {
      // Optimistic update
      setTasks(prev =>
        prev.map(t => (String(t.id) === String(id) ? { ...t, ...updates } : t))
      );

      const updateData = { ...updates, updated_date: new Date().toISOString() };

      // Auto-set completed_at
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Revert on error
        fetchTasks();
        throw error;
      }

      return { ...data, id: String(data.id) };
    } catch (err) {
      console.error('[useTasks] update error:', err);
      toast.error('Failed to update task');
      return null;
    }
  }, [fetchTasks]);

  // Delete task
  const deleteTask = useCallback(async (id) => {
    try {
      // Optimistic remove
      setTasks(prev => prev.filter(t => String(t.id) !== String(id)));

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        fetchTasks();
        throw error;
      }

      return true;
    } catch (err) {
      console.error('[useTasks] delete error:', err);
      toast.error('Failed to delete task');
      return false;
    }
  }, [fetchTasks]);

  // Reorder task (update sort_order)
  const reorderTask = useCallback(async (id, newSortOrder) => {
    try {
      setTasks(prev =>
        prev.map(t => (String(t.id) === String(id) ? { ...t, sort_order: newSortOrder } : t))
      );

      const { error } = await supabase
        .from('tasks')
        .update({ sort_order: newSortOrder, updated_date: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('[useTasks] reorder error:', err);
    }
  }, []);

  // Bulk update (for multi-select operations)
  const bulkUpdate = useCallback(async (ids, updates) => {
    try {
      // Optimistic
      setTasks(prev =>
        prev.map(t => (ids.includes(String(t.id)) ? { ...t, ...updates } : t))
      );

      const updateData = { ...updates, updated_date: new Date().toISOString() };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .in('id', ids);

      if (error) {
        fetchTasks();
        throw error;
      }

      toast.success(`Updated ${ids.length} tasks`);
      return true;
    } catch (err) {
      console.error('[useTasks] bulk update error:', err);
      toast.error('Failed to update tasks');
      return false;
    }
  }, [fetchTasks]);

  // Confirm draft (remove is_draft flag)
  const confirmDraft = useCallback(async (id) => {
    return updateTask(id, { is_draft: false });
  }, [updateTask]);

  // Bulk confirm drafts
  const bulkConfirmDrafts = useCallback(async (ids) => {
    return bulkUpdate(ids, { is_draft: false });
  }, [bulkUpdate]);

  // Get draft tasks
  const getDraftTasks = useCallback(() => {
    return tasks.filter(t => t.is_draft);
  }, [tasks]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t =>
      t.due_date && new Date(t.due_date) < new Date() &&
      t.status !== 'completed' && t.status !== 'cancelled'
    ).length,
    highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
  }), [tasks]);

  return {
    tasks,
    loading,
    error,
    stats,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
    bulkUpdate,
    confirmDraft,
    bulkConfirmDrafts,
    getDraftTasks,
  };
}

/**
 * Convenience: tasks where assigned_to = current user
 */
export function useMyTasks(extraFilters = {}) {
  const { user } = useUser();
  return useTasks({
    filters: { assigned_to: user?.id, ...extraFilters },
  });
}

/**
 * Convenience: tasks for a specific project
 */
export function useProjectTasks(projectId, extraFilters = {}) {
  return useTasks({
    filters: { project_id: projectId, ...extraFilters },
  });
}

export { TASK_STATUSES, TASK_PRIORITIES };
export default useTasks;
