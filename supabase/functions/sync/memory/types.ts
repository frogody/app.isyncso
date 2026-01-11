/**
 * SYNC Memory System Types
 * Defines all type definitions for the memory subsystem
 */

// ============================================================================
// Chat Message Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentId?: string;
  actionExecuted?: {
    type: string;
    success: boolean;
    result?: unknown;
  };
}

// ============================================================================
// Session Types
// ============================================================================

export interface ActiveEntities {
  clients: EntityReference[];
  products: EntityReference[];
  preferences: Record<string, unknown>;
  current_intent: string | null;
}

export interface EntityReference {
  id: string;
  name: string;
  type: string;
  company?: string;
  last_mentioned: string;
}

export interface SyncSession {
  id: string;
  session_id: string;
  user_id: string | null;
  organization_id: string | null;
  company_id: string;
  messages: ChatMessage[];
  conversation_summary: string | null;
  summary_last_updated: string | null;
  summary_message_count: number;
  active_entities: ActiveEntities;
  context: Record<string, unknown>;
  last_agent: string;
  total_messages: number;
  created_at: string;
  updated_at: string;
  last_activity: string;
}

// ============================================================================
// Memory Chunk Types
// ============================================================================

export type ChunkType =
  | 'conversation'
  | 'summary'
  | 'entity'
  | 'action_success'
  | 'action_template'
  | 'preference';

export interface MemoryChunk {
  id: string;
  session_id?: string;
  user_id?: string;
  company_id?: string;
  chunk_type: ChunkType;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  importance_score: number;
  access_count?: number;
  last_accessed?: string;
  created_at: string;
}

export interface MemoryChunkInsert {
  session_id?: string;
  user_id?: string;
  organization_id?: string;
  company_id?: string;
  chunk_type: ChunkType;
  content: string;
  embedding?: string; // Vector as string for Supabase
  metadata?: Record<string, unknown>;
  importance_score?: number;
}

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType =
  | 'client'
  | 'prospect'
  | 'product'
  | 'supplier'
  | 'preference'
  | 'workflow';

export interface SyncEntity {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  company_id: string | null;
  entity_type: EntityType;
  entity_id: string | null;
  entity_name: string;
  attributes: Record<string, unknown>;
  interaction_count: number;
  last_interaction: string;
  first_seen: string;
  embedding?: number[];
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface SyncEntityInsert {
  user_id?: string;
  organization_id?: string;
  company_id?: string;
  entity_type: EntityType;
  entity_id?: string;
  entity_name: string;
  attributes?: Record<string, unknown>;
  embedding?: string;
  confidence_score?: number;
}

// ============================================================================
// Action Template Types
// ============================================================================

export interface ActionTemplate {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  company_id: string | null;
  action_type: string;
  intent_description: string;
  example_request: string;
  action_data: Record<string, unknown>;
  success_count: number;
  failure_count: number;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface ActionTemplateInsert {
  user_id?: string;
  organization_id?: string;
  company_id?: string;
  action_type: string;
  intent_description: string;
  example_request: string;
  action_data: Record<string, unknown>;
  embedding?: string;
}

// ============================================================================
// Memory Context Types (for building LLM prompts)
// ============================================================================

export interface MemoryContext {
  recentMessages: ChatMessage[];        // Last N messages (buffer)
  conversationSummary: string | null;   // Compressed history
  relevantMemories: MemorySearchResult[];  // RAG results
  activeEntities: ActiveEntities;       // Current conversation entities
  relatedEntities: EntitySearchResult[];   // Semantic entity matches
  actionTemplates: ActionTemplateSearchResult[]; // Similar action patterns
}

export interface MemorySearchResult {
  id: string;
  chunk_type: ChunkType;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface EntitySearchResult {
  id: string;
  entity_type: EntityType;
  entity_name: string;
  entity_id: string | null;
  attributes: Record<string, unknown>;
  interaction_count: number;
  similarity: number;
}

export interface ActionTemplateSearchResult {
  id: string;
  action_type: string;
  intent_description: string;
  example_request: string;
  action_data: Record<string, unknown>;
  success_count: number;
  similarity: number;
}

// ============================================================================
// Entity Extraction Types
// ============================================================================

export interface ExtractedEntities {
  clients: Array<{ name: string; company?: string }>;
  products: Array<{ name: string; quantity?: number }>;
  preferences: Record<string, unknown>;
  intent: string | null;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MemoryConfig {
  bufferSize: number;           // Messages to keep in immediate context
  maxBuffer: number;            // Max before summarization triggers
  embeddingModel: string;       // Together.ai embedding model
  embeddingDimensions: number;  // Vector dimensions (1024 for bge-large)
  ragThreshold: number;         // Minimum similarity for RAG results
  ragLimit: number;             // Max RAG results to return
  summarizationModel: string;   // Model for generating summaries
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  bufferSize: 10,
  maxBuffer: 20,
  embeddingModel: 'BAAI/bge-large-en-v1.5',
  embeddingDimensions: 1024,
  ragThreshold: 0.6,
  ragLimit: 5,
  summarizationModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
};
