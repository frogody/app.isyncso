/**
 * Workflow Triggers - Barrel exports
 *
 * Cross-module automation system for the Communication Hub inbox.
 * Allows configuring event-driven trigger rules that fire actions
 * across modules (post messages, create tasks, send emails, etc.).
 */

export { default as WorkflowTriggerManager } from './WorkflowTriggerManager';
export { default as TriggerCard } from './TriggerCard';
export { default as TriggerEditor } from './TriggerEditor';
export { default as WorkflowLog } from './WorkflowLog';
export {
  default as useWorkflowTriggers,
  EVENT_TYPES,
  ACTION_TYPES,
  TRIGGER_TEMPLATES,
  CONDITION_OPERATORS,
} from './useWorkflowTriggers';
