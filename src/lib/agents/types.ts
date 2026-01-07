/**
 * Agent System Types
 * Core type definitions for the iSyncSO agent architecture
 */

import type Together from 'together-ai';

// ============================================================================
// Agent Identity & Configuration
// ============================================================================

export type AgentId =
  | 'learn'
  | 'growth'
  | 'sentinel'
  | 'finance'
  | 'raise'
  | 'create'
  | 'sync';

export type AgentStatus = 'active' | 'inactive' | 'coming_soon' | 'error';

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  capabilities: string[];
  tools?: AgentTool[];
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ============================================================================
// Tool Types
// ============================================================================

export interface AgentTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolParameter;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface ToolRegistry {
  [toolName: string]: ToolHandler;
}

// ============================================================================
// Context & State
// ============================================================================

export interface AgentContext {
  userId?: string;
  companyId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationState {
  messages: AgentMessage[];
  context: AgentContext;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Response Types
// ============================================================================

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface StreamingChunk {
  content?: string;
  toolCalls?: Partial<ToolCall>[];
  done: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export type AgentEventType =
  | 'message:start'
  | 'message:chunk'
  | 'message:end'
  | 'tool:start'
  | 'tool:end'
  | 'error';

export interface AgentEvent {
  type: AgentEventType;
  agentId: AgentId;
  timestamp: Date;
  data?: unknown;
}

export type AgentEventHandler = (event: AgentEvent) => void;

// ============================================================================
// Client Types
// ============================================================================

export interface TogetherClientConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export type TogetherClient = Together;

// ============================================================================
// Registry Types
// ============================================================================

export interface AgentRegistryEntry {
  config: AgentConfig;
  status: AgentStatus;
  instance?: BaseAgentInterface;
}

export interface BaseAgentInterface {
  readonly id: AgentId;
  readonly config: AgentConfig;

  chat(messages: AgentMessage[], context?: AgentContext): Promise<AgentResponse>;
  chatStream(messages: AgentMessage[], context?: AgentContext): AsyncGenerator<StreamingChunk>;

  registerTool(name: string, handler: ToolHandler): void;
  executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}
