/**
 * SYNC Workflow System - Type Definitions
 * Implements sophisticated multi-agent workflows with parallel, sequential,
 * conditional, and iterative patterns.
 */

// Agent definition
export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  capabilities: string[];
}

// Workflow types
export type WorkflowType = 'sequential' | 'parallel' | 'conditional' | 'iterative' | 'hybrid';

// Message format
export interface WorkflowMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Agent response
export interface AgentResponse {
  agentId: string;
  agentName: string;
  content: string;
  reasoning?: string;
  confidence?: number;
  executionTimeMs: number;
  tokensUsed?: number;
}

// Parallel workflow result
export interface ParallelResult {
  responses: AgentResponse[];
  aggregatedResponse: string;
  totalExecutionTimeMs: number;
}

// Sequential workflow result
export interface SequentialResult {
  steps: AgentResponse[];
  finalResponse: string;
  totalExecutionTimeMs: number;
}

// Conditional routing result
export interface RoutingDecision {
  selectedAgent: string;
  reasoning: string;
  confidence: number;
  alternativeAgents?: string[];
}

// Iterative workflow result
export interface IterativeResult {
  iterations: number;
  finalResponse: string;
  evaluations: EvaluationResult[];
  totalExecutionTimeMs: number;
}

// Evaluation result for iterative workflows
export interface EvaluationResult {
  iteration: number;
  status: 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL';
  feedback: string;
  score: number;
}

// Workflow configuration
export interface WorkflowConfig {
  type: WorkflowType;
  agents: string[]; // Agent IDs to use
  maxIterations?: number;
  qualityThreshold?: number;
  timeoutMs?: number;
  aggregatorModel?: string;
  evaluatorModel?: string;
}

// Workflow execution context
export interface WorkflowContext {
  sessionId: string;
  userId?: string;
  companyId?: string;
  conversationHistory: WorkflowMessage[];
  entities: Record<string, any>;
  memories: string[];
  actionTemplates: any[];
}

// Workflow execution result
export interface WorkflowResult {
  type: WorkflowType;
  response: string;
  agentsUsed: string[];
  executionTimeMs: number;
  metadata: {
    iterations?: number;
    parallelResponses?: number;
    routingDecision?: RoutingDecision;
    evaluations?: EvaluationResult[];
  };
}

// Intent classification
export interface IntentClassification {
  primaryIntent: string;
  confidence: number;
  secondaryIntents: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedWorkflow: WorkflowType;
  suggestedAgents: string[];
}

// Action execution request
export interface ActionRequest {
  actionType: string;
  parameters: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
}

// Workflow event for logging/monitoring
export interface WorkflowEvent {
  timestamp: number;
  eventType: 'start' | 'agent_call' | 'agent_response' | 'evaluation' | 'routing' | 'complete' | 'error';
  details: Record<string, any>;
}
