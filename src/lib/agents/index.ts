/**
 * Agent System
 * Core agent infrastructure for iSyncSO
 */

// Types
export * from './types';

// Base Agent
export { BaseAgent } from './base-agent';

// Registry
export { AgentRegistry, AgentRegistryClass } from './registry';

// SYNC Orchestrator
export {
  SyncOrchestrator,
  getSyncOrchestrator,
  resetSyncOrchestrator,
  type WorkflowStep,
  type WorkflowResult,
  type OrchestratorConfig,
  type DelegationResult,
  type ConversationMemory,
} from './sync-orchestrator';

// Agent Builder (Dynamic Agent Creation)
export {
  AgentBuilder,
  getAgentBuilder,
  quickBuildAgent,
  generateAgentSpec,
  generateAgentCode,
  type AgentSpec,
  type ToolSpec,
  type ParameterSpec,
  type AgentBuilderOptions,
  type GeneratedAgent,
  type BuilderContext,
} from './agent-builder';

// Specialized Agents
export * from './agents';

// Re-export registration helper at top level for convenience
export { registerAllAgents } from './agents';
