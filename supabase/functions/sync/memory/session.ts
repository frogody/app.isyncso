/**
 * Session Persistence Layer
 * Manages persistent storage of SYNC chat sessions
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SyncSession,
  ChatMessage,
  ActiveEntities,
  DEFAULT_MEMORY_CONFIG,
} from './types.ts';

/**
 * Session Manager Class
 * Handles session CRUD operations with database persistence
 */
export class SessionManager {
  private supabase: SupabaseClient;
  private cache: Map<string, SyncSession> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Generate a new session ID
   */
  private generateSessionId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get or create a session
   * Loads from database if exists, creates new otherwise
   */
  async getOrCreateSession(
    sessionId: string | undefined,
    userId: string | undefined,
    companyId: string
  ): Promise<SyncSession> {
    // Generate new ID if not provided
    const id = sessionId || this.generateSessionId();

    // Check cache first (in-memory for current invocation)
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Try to load from database
    const { data: existing, error: fetchError } = await this.supabase
      .from('sync_sessions')
      .select('*')
      .eq('session_id', id)
      .single();

    if (existing && !fetchError) {
      const session = this.parseSession(existing);
      this.cache.set(id, session);
      return session;
    }

    // Create new session
    const newSession: Partial<SyncSession> = {
      session_id: id,
      user_id: userId || null,
      company_id: companyId,
      messages: [],
      conversation_summary: null,
      summary_last_updated: null,
      summary_message_count: 0,
      active_entities: {
        clients: [],
        products: [],
        preferences: {},
        current_intent: null,
      },
      context: {},
      last_agent: 'sync',
      total_messages: 0,
    };

    const { data: created, error: createError } = await this.supabase
      .from('sync_sessions')
      .insert(newSession)
      .select()
      .single();

    if (createError) {
      console.error("Failed to create session:", createError);
      // Return ephemeral session if DB fails
      return this.createEphemeralSession(id, userId, companyId);
    }

    const session = this.parseSession(created);
    this.cache.set(id, session);
    return session;
  }

  /**
   * Create an ephemeral session (fallback when DB is unavailable)
   */
  private createEphemeralSession(
    sessionId: string,
    userId: string | undefined,
    companyId: string
  ): SyncSession {
    return {
      id: crypto.randomUUID(),
      session_id: sessionId,
      user_id: userId || null,
      organization_id: null,
      company_id: companyId,
      messages: [],
      conversation_summary: null,
      summary_last_updated: null,
      summary_message_count: 0,
      active_entities: {
        clients: [],
        products: [],
        preferences: {},
        current_intent: null,
      },
      context: {},
      last_agent: 'sync',
      total_messages: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };
  }

  /**
   * Update session in database
   */
  async updateSession(session: SyncSession): Promise<void> {
    const { error } = await this.supabase
      .from('sync_sessions')
      .update({
        messages: session.messages,
        conversation_summary: session.conversation_summary,
        summary_last_updated: session.summary_last_updated,
        summary_message_count: session.summary_message_count,
        active_entities: session.active_entities,
        context: session.context,
        last_agent: session.last_agent,
        total_messages: session.total_messages,
        updated_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      })
      .eq('session_id', session.session_id);

    if (error) {
      console.error("Failed to update session:", error);
    }

    // Update cache
    this.cache.set(session.session_id, session);
  }

  /**
   * Add a message to the session
   */
  async addMessage(session: SyncSession, message: ChatMessage): Promise<SyncSession> {
    session.messages.push(message);
    session.total_messages++;

    // Update cache immediately
    this.cache.set(session.session_id, session);

    return session;
  }

  /**
   * Get buffer messages for LLM context
   */
  getBufferMessages(session: SyncSession): ChatMessage[] {
    return session.messages.slice(-DEFAULT_MEMORY_CONFIG.bufferSize);
  }

  /**
   * Check if summarization is needed
   */
  shouldSummarize(session: SyncSession): boolean {
    return session.messages.length > DEFAULT_MEMORY_CONFIG.maxBuffer;
  }

  /**
   * Trim messages after summarization
   */
  trimMessages(session: SyncSession, keepCount: number = DEFAULT_MEMORY_CONFIG.bufferSize): ChatMessage[] {
    const toRemove = session.messages.slice(0, -keepCount);
    session.messages = session.messages.slice(-keepCount);
    return toRemove;
  }

  /**
   * Update conversation summary
   */
  updateSummary(session: SyncSession, summary: string, messagesSummarized: number): void {
    // Combine with existing summary if present
    if (session.conversation_summary) {
      session.conversation_summary = `${session.conversation_summary}\n\n[Later:]\n${summary}`;
    } else {
      session.conversation_summary = summary;
    }

    session.summary_last_updated = new Date().toISOString();
    session.summary_message_count += messagesSummarized;
  }

  /**
   * Update active entities
   */
  updateActiveEntities(session: SyncSession, entities: Partial<ActiveEntities>): void {
    if (entities.clients) {
      session.active_entities.clients = entities.clients;
    }
    if (entities.products) {
      session.active_entities.products = entities.products;
    }
    if (entities.preferences) {
      session.active_entities.preferences = {
        ...session.active_entities.preferences,
        ...entities.preferences,
      };
    }
    if (entities.current_intent !== undefined) {
      session.active_entities.current_intent = entities.current_intent;
    }
  }

  /**
   * Parse database row to SyncSession
   */
  private parseSession(data: Record<string, unknown>): SyncSession {
    return {
      id: data.id as string,
      session_id: data.session_id as string,
      user_id: data.user_id as string | null,
      organization_id: data.organization_id as string | null,
      company_id: data.company_id as string,
      messages: (data.messages as ChatMessage[]) || [],
      conversation_summary: data.conversation_summary as string | null,
      summary_last_updated: data.summary_last_updated as string | null,
      summary_message_count: (data.summary_message_count as number) || 0,
      active_entities: (data.active_entities as ActiveEntities) || {
        clients: [],
        products: [],
        preferences: {},
        current_intent: null,
      },
      context: (data.context as Record<string, unknown>) || {},
      last_agent: (data.last_agent as string) || 'sync',
      total_messages: (data.total_messages as number) || 0,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      last_activity: data.last_activity as string,
    };
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('sync_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error("Failed to delete session:", error);
      return false;
    }

    this.cache.delete(sessionId);
    return true;
  }

  /**
   * Get recent sessions for a user
   */
  async getRecentSessions(userId: string, limit = 10): Promise<SyncSession[]> {
    const { data, error } = await this.supabase
      .from('sync_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to get recent sessions:", error);
      return [];
    }

    return (data || []).map(row => this.parseSession(row));
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
