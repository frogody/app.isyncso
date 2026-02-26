/**
 * TriggerEditor - Create/edit form for a workflow trigger rule.
 *
 * Three-step form:
 *   Step 1: Select event type (deal_closed, meeting_ended, etc.)
 *   Step 2: Set conditions (field, operator, value)
 *   Step 3: Configure actions (post message, create task, send email, etc.)
 *
 * Supports template presets to quick-fill all fields.
 * Modal dialog with glass morphism styling and Framer Motion transitions.
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, ChevronRight, ChevronLeft, X, Plus, Trash2, Check,
  MessageSquare, Mail, ListTodo, FileText, Bell, PartyPopper,
  RefreshCw, Globe, Sparkles, AlertTriangle, CalendarCheck,
  UserCheck, CheckSquare, Target, Receipt, ArrowRight
} from 'lucide-react';
import {
  EVENT_TYPES,
  ACTION_TYPES,
  TRIGGER_TEMPLATES,
  CONDITION_OPERATORS,
} from './useWorkflowTriggers';

// Icon lookup for event types
const EVENT_ICON_MAP = {
  deal_closed: Sparkles,
  meeting_ended: CalendarCheck,
  invoice_overdue: AlertTriangle,
  prospect_matches_icp: UserCheck,
  task_completed: CheckSquare,
  message_received: MessageSquare,
  candidate_matched: Target,
  expense_approved: Receipt,
};

// Icon lookup for action types
const ACTION_ICON_MAP = {
  post_message: MessageSquare,
  send_email: Mail,
  create_task: ListTodo,
  create_invoice: FileText,
  notify_channel: Bell,
  celebrate: PartyPopper,
  update_status: RefreshCw,
  webhook: Globe,
};

const STEPS = ['Event', 'Conditions', 'Actions'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StepIndicator = memo(function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-1 px-6 pt-4 pb-2">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                i <= currentStep
                  ? 'bg-cyan-500 text-white'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {i < currentStep ? (
                <Check className="w-3 h-3" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[11px] font-medium transition-colors ${
                i <= currentStep ? 'text-zinc-200' : 'text-zinc-600'
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="w-3 h-3 text-zinc-700 mx-1" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Step 1: Event Type Selection
// ---------------------------------------------------------------------------

const EventStep = memo(function EventStep({ selectedEvent, onSelect }) {
  return (
    <div className="px-6 py-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Select Event</h3>
        <p className="text-[11px] text-zinc-500">Choose the event that triggers this workflow.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {EVENT_TYPES.map((evt) => {
          const Icon = EVENT_ICON_MAP[evt.id] || Zap;
          const isSelected = selectedEvent === evt.id;
          return (
            <button
              key={evt.id}
              onClick={() => onSelect(evt.id)}
              className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all duration-150 text-left ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium block">{evt.label}</span>
                <span className="text-[10px] text-zinc-600">{evt.module}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick templates */}
      <div className="pt-2 border-t border-zinc-800/40">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 font-semibold">
          Quick Templates
        </p>
        <div className="space-y-1.5">
          {TRIGGER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl.eventType, tpl)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-zinc-800/30 border border-zinc-800/30 hover:border-cyan-500/20 hover:bg-zinc-800/50 transition-all text-left group"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500/60 group-hover:text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-zinc-300 block truncate">
                  {tpl.name}
                </span>
                <span className="text-[10px] text-zinc-600 block truncate">
                  {tpl.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Step 2: Conditions
// ---------------------------------------------------------------------------

const ConditionsStep = memo(function ConditionsStep({ conditions, onChange }) {
  const addCondition = useCallback(() => {
    onChange([...conditions, { field: '', operator: 'equals', value: '' }]);
  }, [conditions, onChange]);

  const removeCondition = useCallback(
    (index) => {
      onChange(conditions.filter((_, i) => i !== index));
    },
    [conditions, onChange]
  );

  const updateCondition = useCallback(
    (index, key, value) => {
      const updated = conditions.map((c, i) =>
        i === index ? { ...c, [key]: value } : c
      );
      onChange(updated);
    },
    [conditions, onChange]
  );

  return (
    <div className="px-6 py-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Set Conditions</h3>
        <p className="text-[11px] text-zinc-500">
          Add optional conditions to filter when this trigger fires. Leave empty to trigger on every event.
        </p>
      </div>

      <div className="space-y-2">
        {conditions.map((cond, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Field"
              value={cond.field}
              onChange={(e) => updateCondition(i, 'field', e.target.value)}
              className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
            />
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(i, 'operator', e.target.value)}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none"
            >
              {CONDITION_OPERATORS.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Value"
              value={cond.value}
              onChange={(e) => updateCondition(i, 'value', e.target.value)}
              className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
            />
            <button
              onClick={() => removeCondition(i)}
              className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>

      <button
        onClick={addCondition}
        className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors py-1"
      >
        <Plus className="w-3 h-3" />
        Add Condition
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Step 3: Actions
// ---------------------------------------------------------------------------

const ActionsStep = memo(function ActionsStep({ actions, onChange }) {
  const addAction = useCallback(() => {
    onChange([...actions, { type: 'post_message', config: {} }]);
  }, [actions, onChange]);

  const removeAction = useCallback(
    (index) => {
      onChange(actions.filter((_, i) => i !== index));
    },
    [actions, onChange]
  );

  const updateActionType = useCallback(
    (index, type) => {
      const updated = actions.map((a, i) =>
        i === index ? { ...a, type } : a
      );
      onChange(updated);
    },
    [actions, onChange]
  );

  const updateActionConfig = useCallback(
    (index, key, value) => {
      const updated = actions.map((a, i) =>
        i === index ? { ...a, config: { ...a.config, [key]: value } } : a
      );
      onChange(updated);
    },
    [actions, onChange]
  );

  return (
    <div className="px-6 py-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Configure Actions</h3>
        <p className="text-[11px] text-zinc-500">
          Define what happens when this trigger fires. Actions run in order.
        </p>
      </div>

      <div className="space-y-3">
        {actions.map((action, i) => {
          const Icon = ACTION_ICON_MAP[action.type] || Zap;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-800/60 flex items-center justify-center text-cyan-400">
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    Action {i + 1}
                  </span>
                </div>
                <button
                  onClick={() => removeAction(i)}
                  className="p-1 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action type selector */}
              <select
                value={action.type}
                onChange={(e) => updateActionType(i, e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none"
              >
                {ACTION_TYPES.map((at) => (
                  <option key={at.id} value={at.id}>
                    {at.label}
                  </option>
                ))}
              </select>

              {/* Dynamic config fields based on action type */}
              {(action.type === 'post_message' || action.type === 'notify_channel') && (
                <>
                  <input
                    type="text"
                    placeholder="Channel (e.g. #general)"
                    value={action.config?.channel || ''}
                    onChange={(e) => updateActionConfig(i, 'channel', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                  />
                  <textarea
                    placeholder="Message content (use {{variables}})"
                    value={action.config?.message || action.config?.content || ''}
                    onChange={(e) => updateActionConfig(i, 'content', e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 resize-none"
                  />
                </>
              )}

              {action.type === 'send_email' && (
                <>
                  <input
                    type="text"
                    placeholder="To (e.g. {{client_email}})"
                    value={action.config?.to || ''}
                    onChange={(e) => updateActionConfig(i, 'to', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                  />
                  <input
                    type="text"
                    placeholder="Template (e.g. thank_you)"
                    value={action.config?.template || ''}
                    onChange={(e) => updateActionConfig(i, 'template', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                  />
                </>
              )}

              {action.type === 'create_task' && (
                <>
                  <input
                    type="text"
                    placeholder="Task title (use {{variables}})"
                    value={action.config?.title || ''}
                    onChange={(e) => updateActionConfig(i, 'title', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                  />
                  <input
                    type="text"
                    placeholder="Assignee (e.g. {{organizer}})"
                    value={action.config?.assignee || ''}
                    onChange={(e) => updateActionConfig(i, 'assignee', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                  />
                </>
              )}

              {action.type === 'webhook' && (
                <input
                  type="text"
                  placeholder="Webhook URL"
                  value={action.config?.url || ''}
                  onChange={(e) => updateActionConfig(i, 'url', e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={addAction}
        className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors py-1"
      >
        <Plus className="w-3 h-3" />
        Add Action
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TriggerEditor({ trigger, onSave, onClose }) {
  const isEditing = !!trigger?.id;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(trigger?.name || '');
  const [description, setDescription] = useState(trigger?.description || '');
  const [eventType, setEventType] = useState(trigger?.eventType || '');
  const [conditions, setConditions] = useState(trigger?.conditions || []);
  const [actions, setActions] = useState(trigger?.actions || []);

  const handleEventSelect = useCallback((evtId, template) => {
    setEventType(evtId);
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setConditions([...template.conditions]);
      setActions(template.actions.map((a) => ({ ...a, config: { ...a.config } })));
    }
  }, []);

  const canProceed = useMemo(() => {
    if (step === 0) return !!eventType;
    if (step === 1) return true; // conditions are optional
    if (step === 2) return actions.length > 0;
    return false;
  }, [step, eventType, actions]);

  const handleSave = useCallback(() => {
    onSave?.({
      ...(trigger || {}),
      name: name || `${eventType?.replace(/_/g, ' ')} trigger`,
      description,
      eventType,
      conditions,
      actions,
    });
  }, [trigger, name, description, eventType, conditions, actions, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950/95 border border-zinc-800/60 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">
                {isEditing ? 'Edit Trigger' : 'Create Trigger'}
              </h2>
              <p className="text-[10px] text-zinc-500">
                {isEditing ? 'Update your automation rule' : 'Set up a new automation rule'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} steps={STEPS} />

        {/* Name / description (always visible) */}
        <div className="px-6 pt-2 space-y-2">
          <input
            type="text"
            placeholder="Trigger name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
          />
          <input
            type="text"
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-event"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <EventStep selectedEvent={eventType} onSelect={handleEventSelect} />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="step-conditions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <ConditionsStep conditions={conditions} onChange={setConditions} />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step-actions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <ActionsStep actions={actions} onChange={setActions} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/40">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-800/50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {step > 0 ? 'Back' : 'Cancel'}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className={`flex items-center gap-1.5 text-xs py-1.5 px-4 rounded-lg transition-colors ${
                canProceed
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canProceed}
              className={`flex items-center gap-1.5 text-xs py-1.5 px-4 rounded-lg transition-colors ${
                canProceed
                  ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                  : 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {isEditing ? 'Update Trigger' : 'Create Trigger'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
