// Manages conversation persistence across sessions

import { db } from '@/api/supabaseClient';

class ConversationManager {
  constructor() {
    this.storageKey = 'learn_conversations';
  }

  // Get stored conversation ID for a lesson
  getStoredConversationId(lessonId) {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      
      const conversations = JSON.parse(stored);
      const entry = conversations[lessonId];
      
      // Check if conversation is less than 24 hours old
      if (entry && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
        return entry.conversationId;
      }
      
      return null;
    } catch (e) {
      console.error('[ConversationManager] Error reading storage:', e);
      return null;
    }
  }

  // Store conversation ID for a lesson
  storeConversation(lessonId, conversationId) {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const conversations = stored ? JSON.parse(stored) : {};
      
      conversations[lessonId] = {
        conversationId,
        timestamp: Date.now()
      };
      
      // Keep only last 20 conversations
      const entries = Object.entries(conversations);
      if (entries.length > 20) {
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const trimmed = Object.fromEntries(entries.slice(0, 20));
        localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(conversations));
      }
      
      console.log('[ConversationManager] Stored conversation:', conversationId);
    } catch (e) {
      console.error('[ConversationManager] Error storing:', e);
    }
  }

  // Clear conversation for a lesson (start fresh)
  clearConversation(lessonId) {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;
      
      const conversations = JSON.parse(stored);
      delete conversations[lessonId];
      localStorage.setItem(this.storageKey, JSON.stringify(conversations));
      
      console.log('[ConversationManager] Cleared conversation for lesson:', lessonId);
    } catch (e) {
      console.error('[ConversationManager] Error clearing:', e);
    }
  }

  // Try to resume an existing conversation
  async tryResumeConversation(lessonId) {
    const storedId = this.getStoredConversationId(lessonId);
    if (!storedId) return null;

    try {
      // Try to get the conversation from Base44
      const conversation = await db.agents.getConversation(storedId);
      
      if (conversation && conversation.messages?.length > 0) {
        console.log('[ConversationManager] Resumed conversation with', conversation.messages.length, 'messages');
        return conversation;
      }
    } catch (e) {
      console.log('[ConversationManager] Could not resume, will create new');
      this.clearConversation(lessonId);
    }

    return null;
  }
}

export const conversationManager = new ConversationManager();