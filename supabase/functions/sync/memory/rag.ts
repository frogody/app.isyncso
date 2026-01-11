/**
 * RAG - Vector Search for Relevant Context
 * Implements semantic retrieval of relevant past context
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SyncSession,
  MemoryContext,
  MemorySearchResult,
  ActionTemplateSearchResult,
  DEFAULT_MEMORY_CONFIG,
} from './types.ts';
import { generateEmbedding, embeddingToPostgresVector } from './embeddings.ts';
import { BufferManager } from './buffer.ts';
import { EntityManager } from './entities.ts';

/**
 * RAG Manager Class
 * Coordinates retrieval across memory chunks, entities, and action templates
 */
export class RAGManager {
  private supabase: SupabaseClient;
  private bufferManager: BufferManager;
  private entityManager: EntityManager;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.bufferManager = new BufferManager(supabase);
    this.entityManager = new EntityManager(supabase);
  }

  /**
   * Retrieve relevant memories for current query
   */
  async retrieveRelevantMemories(
    session: SyncSession,
    query: string,
    types?: string[],
    threshold = DEFAULT_MEMORY_CONFIG.ragThreshold,
    limit = DEFAULT_MEMORY_CONFIG.ragLimit
  ): Promise<MemorySearchResult[]> {
    try {
      const embedding = await generateEmbedding(query);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase.rpc('search_sync_memory', {
        query_embedding: embeddingStr,
        match_user_id: session.user_id,
        match_company_id: session.company_id,
        match_types: types || null,
        match_threshold: threshold,
        match_limit: limit,
      });

      if (error) {
        console.error("Memory retrieval failed:", error);
        return [];
      }

      // Update access counts for retrieved chunks
      if (data && data.length > 0) {
        const ids = data.map((chunk: MemorySearchResult) => chunk.id);
        await this.updateAccessCounts(ids);
      }

      return data || [];
    } catch (error) {
      console.error("Failed to retrieve memories:", error);
      return [];
    }
  }

  /**
   * Update access counts for retrieved memory chunks
   */
  private async updateAccessCounts(ids: string[]): Promise<void> {
    try {
      // Using raw SQL for batch update
      for (const id of ids) {
        await this.supabase
          .from('sync_memory_chunks')
          .update({
            access_count: this.supabase.rpc('increment_access_count', { chunk_id: id }),
            last_accessed: new Date().toISOString(),
          })
          .eq('id', id);
      }
    } catch (error) {
      // Non-critical, just log
      console.warn("Failed to update access counts:", error);
    }
  }

  /**
   * Search for similar action templates
   */
  async searchActionTemplates(
    session: SyncSession,
    query: string,
    actionType?: string,
    limit = 3
  ): Promise<ActionTemplateSearchResult[]> {
    try {
      const embedding = await generateEmbedding(query);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase.rpc('search_action_templates', {
        query_embedding: embeddingStr,
        match_user_id: session.user_id,
        match_company_id: session.company_id,
        match_action_type: actionType || null,
        match_limit: limit,
      });

      if (error) {
        console.error("Action template search failed:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Failed to search action templates:", error);
      return [];
    }
  }

  /**
   * Build complete memory context for LLM
   */
  async buildMemoryContext(
    session: SyncSession,
    currentMessage: string
  ): Promise<MemoryContext> {
    // Get buffer messages
    const recentMessages = this.bufferManager.getContextMessages(session);

    // Get conversation summary
    const conversationSummary = session.conversation_summary;

    // Parallel retrieval for efficiency
    const [relevantMemories, relatedEntities, actionTemplates] = await Promise.all([
      this.retrieveRelevantMemories(session, currentMessage),
      this.entityManager.searchEntities(session, currentMessage),
      this.searchActionTemplates(session, currentMessage),
    ]);

    return {
      recentMessages,
      conversationSummary,
      relevantMemories,
      activeEntities: session.active_entities,
      relatedEntities,
      actionTemplates,
    };
  }

  /**
   * Format memory context for injection into system prompt
   */
  formatContextForPrompt(context: MemoryContext): string {
    const parts: string[] = [];

    // Add conversation summary
    if (context.conversationSummary) {
      parts.push(`## Previous Conversation Summary
${context.conversationSummary}`);
    }

    // Add relevant memories
    if (context.relevantMemories.length > 0) {
      parts.push(`## Relevant Past Interactions`);
      for (const mem of context.relevantMemories) {
        const preview = mem.content.length > 200
          ? mem.content.substring(0, 200) + '...'
          : mem.content;
        parts.push(`- [${mem.chunk_type}] ${preview}`);
      }
    }

    // Add active entities
    if (context.activeEntities.clients.length > 0 || context.activeEntities.products.length > 0) {
      parts.push(`## Currently Discussed`);

      if (context.activeEntities.clients.length > 0) {
        parts.push('**Clients:**');
        for (const client of context.activeEntities.clients) {
          const companyInfo = client.company ? ` from ${client.company}` : '';
          parts.push(`- ${client.name}${companyInfo}`);
        }
      }

      if (context.activeEntities.products.length > 0) {
        parts.push('**Products:**');
        for (const product of context.activeEntities.products) {
          parts.push(`- ${product.name}`);
        }
      }
    }

    // Add current intent
    if (context.activeEntities.current_intent) {
      parts.push(`**Current Intent:** ${context.activeEntities.current_intent}`);
    }

    // Add user preferences
    if (Object.keys(context.activeEntities.preferences).length > 0) {
      parts.push(`## User Preferences
${JSON.stringify(context.activeEntities.preferences, null, 2)}`);
    }

    // Add related entities from long-term memory
    if (context.relatedEntities.length > 0) {
      parts.push(`## Related Information from History`);
      for (const entity of context.relatedEntities) {
        parts.push(`- ${entity.entity_type}: ${entity.entity_name} (${entity.interaction_count} interactions)`);
      }
    }

    // Add similar action templates
    if (context.actionTemplates.length > 0) {
      parts.push(`## Similar Successful Actions
Based on similar past requests:`);
      for (const template of context.actionTemplates) {
        parts.push(`- **${template.action_type}**: "${template.example_request}"
  Intent: ${template.intent_description}
  Success rate: ${template.success_count} uses`);
      }
    }

    return parts.length > 0 ? parts.join('\n\n') : '';
  }

  /**
   * Store important conversation turns as memories
   */
  async storeConversationMemory(
    session: SyncSession,
    userMessage: string,
    assistantResponse: string,
    actionExecuted?: { type: string; success: boolean; result?: unknown }
  ): Promise<void> {
    await this.bufferManager.storeConversationMemory(
      session,
      userMessage,
      assistantResponse,
      actionExecuted
    );
  }

  /**
   * Get the buffer manager instance
   */
  getBufferManager(): BufferManager {
    return this.bufferManager;
  }

  /**
   * Get the entity manager instance
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }
}
