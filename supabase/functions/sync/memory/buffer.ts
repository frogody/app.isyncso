/**
 * Buffer Memory with Summarization
 * Implements sliding window + compressed history
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SyncSession,
  ChatMessage,
  MemoryChunkInsert,
  DEFAULT_MEMORY_CONFIG,
} from './types.ts';
import { generateEmbedding, embeddingToPostgresVector } from './embeddings.ts';

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

/**
 * Buffer Manager Class
 * Handles message buffering and summarization
 */
export class BufferManager {
  private supabase: SupabaseClient;
  private bufferSize: number;
  private maxBuffer: number;

  constructor(
    supabase: SupabaseClient,
    bufferSize = DEFAULT_MEMORY_CONFIG.bufferSize,
    maxBuffer = DEFAULT_MEMORY_CONFIG.maxBuffer
  ) {
    this.supabase = supabase;
    this.bufferSize = bufferSize;
    this.maxBuffer = maxBuffer;
  }

  /**
   * Get messages for LLM context (buffer)
   */
  getContextMessages(session: SyncSession): ChatMessage[] {
    return session.messages.slice(-this.bufferSize);
  }

  /**
   * Check if summarization is needed
   */
  shouldSummarize(session: SyncSession): boolean {
    return session.messages.length > this.maxBuffer;
  }

  /**
   * Summarize older messages and update session
   */
  async summarizeOlderMessages(session: SyncSession): Promise<SyncSession> {
    if (!this.shouldSummarize(session)) {
      return session;
    }

    // Get messages to summarize (all except last bufferSize)
    const toSummarize = session.messages.slice(0, -this.bufferSize);
    const toKeep = session.messages.slice(-this.bufferSize);

    if (toSummarize.length === 0) {
      return session;
    }

    // Generate summary using LLM
    const summary = await this.generateSummary(toSummarize);

    if (summary) {
      // Combine with existing summary
      const fullSummary = session.conversation_summary
        ? `${session.conversation_summary}\n\n[Later:]\n${summary}`
        : summary;

      // Store summary as memory chunk with embedding
      await this.storeMemoryChunk(session, {
        chunk_type: 'summary',
        content: summary,
        metadata: {
          message_count: toSummarize.length,
          summarized_at: new Date().toISOString(),
          messages_range: {
            first: toSummarize[0]?.timestamp,
            last: toSummarize[toSummarize.length - 1]?.timestamp,
          },
        },
        importance_score: 0.8,
      });

      // Update session
      session.conversation_summary = fullSummary;
      session.summary_last_updated = new Date().toISOString();
      session.summary_message_count += toSummarize.length;
    }

    // Trim messages regardless of summary success
    session.messages = toKeep;

    return session;
  }

  /**
   * Generate summary using LLM
   */
  private async generateSummary(messages: ChatMessage[]): Promise<string | null> {
    if (!TOGETHER_API_KEY) {
      console.error("TOGETHER_API_KEY not configured for summarization");
      return null;
    }

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `Summarize this conversation concisely, preserving key information:
- Client names and companies mentioned
- Products discussed with quantities and prices
- Decisions made and actions taken
- User preferences learned
- Any commitments or follow-up items

Conversation:
${conversationText}

Provide a concise summary (max 300 words):`;

    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEFAULT_MEMORY_CONFIG.summarizationModel,
          messages: [{ role: 'user', content: summaryPrompt }],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Summary generation failed:", error);
        return null;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error("Failed to generate summary:", error);
      return null;
    }
  }

  /**
   * Store a memory chunk with embedding
   */
  async storeMemoryChunk(
    session: SyncSession,
    chunk: Omit<MemoryChunkInsert, 'session_id' | 'user_id' | 'organization_id' | 'company_id' | 'embedding'>
  ): Promise<string | null> {
    try {
      // Generate embedding for the content
      const embedding = await generateEmbedding(chunk.content);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase
        .from('sync_memory_chunks')
        .insert({
          session_id: session.session_id,
          user_id: session.user_id,
          organization_id: session.organization_id,
          company_id: session.company_id,
          chunk_type: chunk.chunk_type,
          content: chunk.content,
          embedding: embeddingStr,
          metadata: chunk.metadata || {},
          importance_score: chunk.importance_score || 0.5,
        })
        .select('id')
        .single();

      if (error) {
        console.error("Failed to store memory chunk:", error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error("Error storing memory chunk:", error);
      return null;
    }
  }

  /**
   * Store a conversation turn as memory
   */
  async storeConversationMemory(
    session: SyncSession,
    userMessage: string,
    assistantResponse: string,
    actionExecuted?: { type: string; success: boolean; result?: unknown }
  ): Promise<void> {
    // Determine importance based on action execution
    let importance = 0.5;
    let chunkType: 'conversation' | 'action_success' = 'conversation';

    if (actionExecuted?.success) {
      importance = 0.8;
      chunkType = 'action_success';
    }

    const content = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
    const metadata: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
    };

    if (actionExecuted) {
      metadata.action = actionExecuted.type;
      metadata.success = actionExecuted.success;
      if (actionExecuted.result) {
        metadata.result = actionExecuted.result;
      }
    }

    await this.storeMemoryChunk(session, {
      chunk_type: chunkType,
      content,
      metadata,
      importance_score: importance,
    });
  }

  /**
   * Get conversation context with summary injected
   */
  getEnhancedContext(session: SyncSession): string {
    if (!session.conversation_summary) {
      return '';
    }

    return `## Previous Conversation Summary
${session.conversation_summary}`;
  }

  /**
   * Format messages for API call
   */
  formatMessagesForAPI(
    session: SyncSession
  ): Array<{ role: string; content: string }> {
    return this.getContextMessages(session).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }
}
