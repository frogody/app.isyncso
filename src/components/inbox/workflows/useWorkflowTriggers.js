/**
 * useWorkflowTriggers - Hook for managing cross-module workflow trigger rules.
 *
 * Provides CRUD operations for trigger rules persisted to Supabase
 * (workflow_triggers + workflow_trigger_history tables).
 *
 * Trigger templates provide quick-fill presets for common automations:
 *   - Deal closed -> celebrate + invoice + thank-you
 *   - Meeting ended -> post notes + create tasks
 *   - Invoice overdue -> send reminder + notify
 *   - New prospect matches ICP -> post in #growth-signals
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

// ---------------------------------------------------------------------------
// Constants & Definitions
// ---------------------------------------------------------------------------

export const EVENT_TYPES = [
  { id: 'deal_closed', label: 'Deal Closed', icon: 'HandshakeIcon', module: 'growth' },
  { id: 'meeting_ended', label: 'Meeting Ended', icon: 'CalendarCheck', module: 'calendar' },
  { id: 'invoice_overdue', label: 'Invoice Overdue', icon: 'AlertTriangle', module: 'finance' },
  { id: 'prospect_matches_icp', label: 'Prospect Matches ICP', icon: 'UserCheck', module: 'growth' },
  { id: 'task_completed', label: 'Task Completed', icon: 'CheckSquare', module: 'tasks' },
  { id: 'message_received', label: 'Message Received', icon: 'MessageSquare', module: 'inbox' },
  { id: 'candidate_matched', label: 'Candidate Matched', icon: 'Target', module: 'talent' },
  { id: 'expense_approved', label: 'Expense Approved', icon: 'Receipt', module: 'finance' },
];

export const ACTION_TYPES = [
  { id: 'post_message', label: 'Post Message', icon: 'MessageSquare', color: 'cyan' },
  { id: 'send_email', label: 'Send Email', icon: 'Mail', color: 'blue' },
  { id: 'create_task', label: 'Create Task', icon: 'ListTodo', color: 'amber' },
  { id: 'create_invoice', label: 'Create Invoice', icon: 'FileText', color: 'green' },
  { id: 'notify_channel', label: 'Notify Channel', icon: 'Bell', color: 'purple' },
  { id: 'celebrate', label: 'Celebrate (Confetti)', icon: 'PartyPopper', color: 'pink' },
  { id: 'update_status', label: 'Update Status', icon: 'RefreshCw', color: 'teal' },
  { id: 'webhook', label: 'Webhook', icon: 'Globe', color: 'zinc' },
];

export const TRIGGER_TEMPLATES = [
  {
    id: 'deal_closed_celebrate',
    name: 'Deal Closed Celebration',
    description: 'When a deal is closed, celebrate, create an invoice, and send a thank-you message.',
    eventType: 'deal_closed',
    conditions: [{ field: 'deal_value', operator: 'greater_than', value: 0 }],
    actions: [
      { type: 'celebrate', config: { message: 'Deal closed! Time to celebrate!' } },
      { type: 'create_invoice', config: { auto_fill: true, template: 'default' } },
      { type: 'send_email', config: { template: 'thank_you', to: '{{client_email}}' } },
    ],
  },
  {
    id: 'meeting_ended_notes',
    name: 'Meeting Follow-Up',
    description: 'After a meeting ends, post notes to the channel and create follow-up tasks.',
    eventType: 'meeting_ended',
    conditions: [{ field: 'duration_minutes', operator: 'greater_than', value: 5 }],
    actions: [
      { type: 'post_message', config: { channel: '{{meeting_channel}}', content: 'Meeting notes: {{notes}}' } },
      { type: 'create_task', config: { title: 'Follow up on {{meeting_title}}', assignee: '{{organizer}}' } },
    ],
  },
  {
    id: 'invoice_overdue_reminder',
    name: 'Invoice Overdue Reminder',
    description: 'When an invoice becomes overdue, send a reminder and notify the team.',
    eventType: 'invoice_overdue',
    conditions: [{ field: 'days_overdue', operator: 'greater_than', value: 3 }],
    actions: [
      { type: 'send_email', config: { template: 'payment_reminder', to: '{{client_email}}' } },
      { type: 'notify_channel', config: { channel: '#finance', message: 'Invoice {{invoice_number}} is overdue by {{days_overdue}} days' } },
    ],
  },
  {
    id: 'prospect_icp_match',
    name: 'ICP Match Alert',
    description: 'When a new prospect matches your ideal customer profile, post in #growth-signals.',
    eventType: 'prospect_matches_icp',
    conditions: [{ field: 'match_score', operator: 'greater_than', value: 80 }],
    actions: [
      { type: 'post_message', config: { channel: '#growth-signals', content: 'New ICP match: {{prospect_name}} ({{company}}) - Score: {{match_score}}' } },
      { type: 'create_task', config: { title: 'Reach out to {{prospect_name}}', priority: 'high' } },
    ],
  },
];

const CONDITION_OPERATORS = [
  { id: 'equals', label: 'Equals' },
  { id: 'not_equals', label: 'Not Equals' },
  { id: 'greater_than', label: 'Greater Than' },
  { id: 'less_than', label: 'Less Than' },
  { id: 'contains', label: 'Contains' },
  { id: 'not_contains', label: 'Does Not Contain' },
];

export { CONDITION_OPERATORS };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkflowTriggers(userId, companyId) {
  const [triggers, setTriggers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  // ---- Load from Supabase on mount ----------------------------------------

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      setLoading(true);
      try {
        const [triggersRes, historyRes] = await Promise.all([
          supabase
            .from('workflow_triggers')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('workflow_trigger_history')
            .select('*')
            .order('executed_at', { ascending: false })
            .limit(200),
        ]);

        if (triggersRes.data) {
          setTriggers(triggersRes.data.map(normalizeRow));
        }
        if (historyRes.data) {
          setHistory(historyRes.data.map(normalizeHistoryRow));
        }
      } catch (err) {
        console.error('Failed to load workflow triggers:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ---- Normalize DB rows to component shape --------------------------------

  function normalizeRow(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      eventType: row.event_type,
      conditions: row.conditions || [],
      actions: row.actions || [],
      enabled: row.enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastTriggeredAt: row.last_triggered_at,
      triggerCount: row.trigger_count || 0,
    };
  }

  function normalizeHistoryRow(row) {
    return {
      id: row.id,
      triggerId: row.trigger_id,
      triggerName: row.trigger_name,
      eventType: row.event_type,
      eventData: row.event_data || {},
      actionsExecuted: row.actions_executed || [],
      status: row.status,
      executedAt: row.executed_at,
    };
  }

  // ---- CRUD ---------------------------------------------------------------

  const createTrigger = useCallback(async (config) => {
    const row = {
      company_id: companyId,
      created_by: userId,
      name: config.name || 'Untitled Trigger',
      description: config.description || '',
      event_type: config.eventType,
      conditions: config.conditions || [],
      actions: config.actions || [],
      enabled: true,
    };

    const { data, error } = await supabase
      .from('workflow_triggers')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to create trigger:', error);
      return null;
    }

    const normalized = normalizeRow(data);
    setTriggers((prev) => [normalized, ...prev]);
    return normalized;
  }, [companyId, userId]);

  const updateTrigger = useCallback(async (id, updates) => {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.eventType !== undefined) dbUpdates.event_type = updates.eventType;
    if (updates.conditions !== undefined) dbUpdates.conditions = updates.conditions;
    if (updates.actions !== undefined) dbUpdates.actions = updates.actions;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('workflow_triggers')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Failed to update trigger:', error);
      return;
    }

    setTriggers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, ...updates, updatedAt: dbUpdates.updated_at }
          : t
      )
    );
  }, []);

  const deleteTrigger = useCallback(async (id) => {
    const { error } = await supabase
      .from('workflow_triggers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete trigger:', error);
      return;
    }

    setTriggers((prev) => prev.filter((t) => t.id !== id));
    setHistory((prev) => prev.filter((h) => h.triggerId !== id));
  }, []);

  const toggleTrigger = useCallback(async (id) => {
    const trigger = triggers.find((t) => t.id === id);
    if (!trigger) return;

    const newEnabled = !trigger.enabled;
    const { error } = await supabase
      .from('workflow_triggers')
      .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Failed to toggle trigger:', error);
      return;
    }

    setTriggers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, enabled: newEnabled, updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, [triggers]);

  // ---- Querying -----------------------------------------------------------

  const getTriggersForEvent = useCallback(
    (eventType) => triggers.filter((t) => t.eventType === eventType && t.enabled),
    [triggers]
  );

  const getTriggerHistory = useCallback(
    (triggerId) => history.filter((h) => h.triggerId === triggerId),
    [history]
  );

  // ---- Execution (logs to DB) ---------------------------------------------

  const executeTrigger = useCallback(async (triggerId, eventData = {}) => {
    const trigger = triggers.find((t) => t.id === triggerId);
    if (!trigger || !trigger.enabled) return null;

    const historyRow = {
      trigger_id: triggerId,
      company_id: companyId,
      trigger_name: trigger.name,
      event_type: trigger.eventType,
      event_data: eventData,
      actions_executed: trigger.actions.map((a) => ({
        type: a.type,
        status: 'success',
        executed_at: new Date().toISOString(),
      })),
      status: 'success',
    };

    const { data: historyData, error: historyError } = await supabase
      .from('workflow_trigger_history')
      .insert(historyRow)
      .select()
      .single();

    if (historyError) {
      console.error('Failed to log trigger execution:', historyError);
    } else {
      setHistory((prev) => [normalizeHistoryRow(historyData), ...prev].slice(0, 200));
    }

    // Update trigger stats
    await supabase
      .from('workflow_triggers')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: (trigger.triggerCount || 0) + 1,
      })
      .eq('id', triggerId);

    setTriggers((prev) =>
      prev.map((t) =>
        t.id === triggerId
          ? {
              ...t,
              lastTriggeredAt: new Date().toISOString(),
              triggerCount: (t.triggerCount || 0) + 1,
            }
          : t
      )
    );

    return historyData ? normalizeHistoryRow(historyData) : null;
  }, [triggers, companyId]);

  // ---- Template helpers ---------------------------------------------------

  const createFromTemplate = useCallback(
    (templateId) => {
      const template = TRIGGER_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return null;
      return createTrigger({
        name: template.name,
        description: template.description,
        eventType: template.eventType,
        conditions: [...template.conditions],
        actions: template.actions.map((a) => ({ ...a, config: { ...a.config } })),
      });
    },
    [createTrigger]
  );

  // ---- Computed -----------------------------------------------------------

  const enabledCount = useMemo(() => triggers.filter((t) => t.enabled).length, [triggers]);
  const totalTriggerCount = triggers.length;

  return {
    triggers,
    history,
    loading,
    enabledCount,
    totalTriggerCount,
    // CRUD
    createTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
    // Querying
    getTriggersForEvent,
    getTriggerHistory,
    // Execution
    executeTrigger,
    // Templates
    createFromTemplate,
    templates: TRIGGER_TEMPLATES,
    eventTypes: EVENT_TYPES,
    actionTypes: ACTION_TYPES,
  };
}

export default useWorkflowTriggers;
