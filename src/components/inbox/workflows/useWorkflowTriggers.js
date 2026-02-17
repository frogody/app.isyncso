/**
 * useWorkflowTriggers - Hook for managing cross-module workflow trigger rules.
 *
 * Provides CRUD operations for trigger rules stored in local state with
 * optional Supabase persistence. Each trigger has an event type, conditions,
 * actions, and an execution history log.
 *
 * Trigger templates provide quick-fill presets for common automations:
 *   - Deal closed -> celebrate + invoice + thank-you
 *   - Meeting ended -> post notes + create tasks
 *   - Invoice overdue -> send reminder + notify
 *   - New prospect matches ICP -> post in #growth-signals
 */

import { useState, useCallback, useMemo, useRef } from 'react';

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
// ID generator
// ---------------------------------------------------------------------------

let idCounter = 0;
function generateId() {
  idCounter += 1;
  return `wt_${Date.now()}_${idCounter}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkflowTriggers() {
  const [triggers, setTriggers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef(history);
  historyRef.current = history;

  // ---- CRUD ---------------------------------------------------------------

  const createTrigger = useCallback((config) => {
    const newTrigger = {
      id: generateId(),
      name: config.name || 'Untitled Trigger',
      description: config.description || '',
      eventType: config.eventType,
      conditions: config.conditions || [],
      actions: config.actions || [],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTriggeredAt: null,
      triggerCount: 0,
    };
    setTriggers((prev) => [newTrigger, ...prev]);
    return newTrigger;
  }, []);

  const updateTrigger = useCallback((id, updates) => {
    setTriggers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  const deleteTrigger = useCallback((id) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
    setHistory((prev) => prev.filter((h) => h.triggerId !== id));
  }, []);

  const toggleTrigger = useCallback((id) => {
    setTriggers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, enabled: !t.enabled, updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  // ---- Querying -----------------------------------------------------------

  const getTriggersForEvent = useCallback(
    (eventType) => {
      return triggers.filter((t) => t.eventType === eventType && t.enabled);
    },
    [triggers]
  );

  const getTriggerHistory = useCallback(
    (triggerId) => {
      return historyRef.current.filter((h) => h.triggerId === triggerId);
    },
    []
  );

  // ---- Execution (simulation) ---------------------------------------------

  const executeTrigger = useCallback((triggerId, eventData = {}) => {
    const trigger = triggers.find((t) => t.id === triggerId);
    if (!trigger || !trigger.enabled) return null;

    const entry = {
      id: generateId(),
      triggerId,
      triggerName: trigger.name,
      eventType: trigger.eventType,
      eventData,
      actionsExecuted: trigger.actions.map((a) => ({
        type: a.type,
        status: 'success',
        executedAt: new Date().toISOString(),
      })),
      status: 'success',
      executedAt: new Date().toISOString(),
    };

    setHistory((prev) => [entry, ...prev].slice(0, 200));

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

    return entry;
  }, [triggers]);

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
