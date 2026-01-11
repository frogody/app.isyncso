/**
 * SYNC Memory System
 * Exports all memory management modules
 */

// Types
export * from './types.ts';

// Embedding utilities
export {
  generateEmbedding,
  generateEmbeddings,
  generateEmbeddingWithRetry,
  embeddingToPostgresVector,
  postgresVectorToEmbedding,
  cosineSimilarity,
} from './embeddings.ts';

// Session management
export { SessionManager } from './session.ts';

// Buffer memory
export { BufferManager } from './buffer.ts';

// Entity memory
export { EntityManager } from './entities.ts';

// RAG retrieval
export { RAGManager } from './rag.ts';

// Action templates
export { ActionTemplateManager } from './actions.ts';

// ============================================================================
// Convenience Factory
// ============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SessionManager } from './session.ts';
import { BufferManager } from './buffer.ts';
import { EntityManager } from './entities.ts';
import { RAGManager } from './rag.ts';
import { ActionTemplateManager } from './actions.ts';

export interface MemorySystem {
  session: SessionManager;
  buffer: BufferManager;
  entity: EntityManager;
  rag: RAGManager;
  actions: ActionTemplateManager;
}

let memorySystemInstance: MemorySystem | null = null;

/**
 * Get or create the memory system instance
 * Uses singleton pattern for efficiency
 */
export function getMemorySystem(supabase: SupabaseClient): MemorySystem {
  if (!memorySystemInstance) {
    memorySystemInstance = {
      session: new SessionManager(supabase),
      buffer: new BufferManager(supabase),
      entity: new EntityManager(supabase),
      rag: new RAGManager(supabase),
      actions: new ActionTemplateManager(supabase),
    };
  }
  return memorySystemInstance;
}

/**
 * Clear the memory system instance
 * Useful for testing or when supabase client changes
 */
export function clearMemorySystem(): void {
  memorySystemInstance = null;
}
