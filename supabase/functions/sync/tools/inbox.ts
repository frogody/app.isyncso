/**
 * Inbox/Communication Tool Functions for SYNC
 *
 * Actions:
 * - list_conversations
 * - create_conversation
 * - send_message
 * - search_messages
 * - get_unread_count
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// ============================================================================
// Inbox Types
// ============================================================================

interface ConversationData {
  title: string;
  type?: string;
  candidate_id?: string;
  project_id?: string;
}

interface MessageData {
  conversation_id?: string;
  conversation_title?: string;
  content: string;
  role?: 'user' | 'assistant';
}

interface ConversationFilters {
  type?: string;
  status?: string;
  limit?: number;
}

// ============================================================================
// List Conversations
// ============================================================================

export async function listConversations(
  ctx: ActionContext,
  filters: ConversationFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('chat_conversations')
      .select('id, title, messages, created_date, updated_date')
      .order('updated_date', { ascending: false })
      .limit(filters.limit || 20);

    const { data: conversations, error } = await query;

    if (error) {
      return errorResult(`Failed to list conversations: ${error.message}`, error.message);
    }

    if (!conversations || conversations.length === 0) {
      return successResult('No conversations found.', []);
    }

    const list = formatList(conversations, (c) => {
      const msgCount = Array.isArray(c.messages) ? c.messages.length : 0;
      const lastUpdate = formatDate(c.updated_date);
      return `- **${c.title || 'Untitled'}** | ${msgCount} messages | ${lastUpdate}`;
    });

    return successResult(
      `Found ${conversations.length} conversation(s):\n\n${list}`,
      conversations,
      '/inbox'
    );
  } catch (err) {
    return errorResult(`Exception listing conversations: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Conversation
// ============================================================================

export async function createConversation(
  ctx: ActionContext,
  data: ConversationData
): Promise<ActionResult> {
  try {
    const conversationRecord = {
      user_id: ctx.userId || null,
      title: data.title,
      messages: [],
      context: {},
    };

    const { data: conversation, error } = await ctx.supabase
      .from('chat_conversations')
      .insert(conversationRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create conversation: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Conversation created!\n\n**${conversation.title}**`,
      conversation,
      '/inbox'
    );
  } catch (err) {
    return errorResult(`Exception creating conversation: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Send Message
// ============================================================================

export async function sendMessage(
  ctx: ActionContext,
  data: MessageData
): Promise<ActionResult> {
  try {
    let conversationId = data.conversation_id;
    let conversationTitle: string | undefined;

    // Find conversation by title if ID not provided
    if (!conversationId && data.conversation_title) {
      const { data: conversations } = await ctx.supabase
        .from('chat_conversations')
        .select('id, title, messages')
        .ilike('title', `%${data.conversation_title}%`)
        .limit(1);

      if (conversations && conversations.length > 0) {
        conversationId = conversations[0].id;
        conversationTitle = conversations[0].title;
      }
    }

    if (!conversationId) {
      return errorResult('Conversation not found. Please provide a valid ID or title.', 'Not found');
    }

    // Get current messages
    const { data: conversation, error: fetchError } = await ctx.supabase
      .from('chat_conversations')
      .select('title, messages')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      return errorResult('Conversation not found.', 'Not found');
    }

    conversationTitle = conversationTitle || conversation.title;
    const currentMessages = Array.isArray(conversation.messages) ? conversation.messages : [];

    // Add new message
    const newMessage = {
      role: data.role || 'user',
      content: data.content,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentMessages, newMessage];

    // Update conversation
    const { error: updateError } = await ctx.supabase
      .from('chat_conversations')
      .update({
        messages: updatedMessages,
        updated_date: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      return errorResult(`Failed to send message: ${updateError.message}`, updateError.message);
    }

    return successResult(
      `✅ Message sent!\n\n**${conversationTitle}**\n> ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
      { conversationId, message: newMessage },
      '/inbox'
    );
  } catch (err) {
    return errorResult(`Exception sending message: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Search Messages
// ============================================================================

export async function searchMessages(
  ctx: ActionContext,
  data: { query: string; limit?: number }
): Promise<ActionResult> {
  try {
    // Get all conversations and search through their messages
    const { data: conversations, error } = await ctx.supabase
      .from('chat_conversations')
      .select('id, title, messages, updated_date')
      .order('updated_date', { ascending: false })
      .limit(100);

    if (error) {
      return errorResult(`Failed to search messages: ${error.message}`, error.message);
    }

    if (!conversations || conversations.length === 0) {
      return successResult('No messages found.', []);
    }

    const searchTerm = data.query.toLowerCase();
    const results: any[] = [];

    for (const conv of conversations) {
      if (!Array.isArray(conv.messages)) continue;

      for (const msg of conv.messages) {
        if (msg.content && msg.content.toLowerCase().includes(searchTerm)) {
          results.push({
            conversation_id: conv.id,
            conversation_title: conv.title,
            message: msg,
          });

          if (results.length >= (data.limit || 10)) break;
        }
      }

      if (results.length >= (data.limit || 10)) break;
    }

    if (results.length === 0) {
      return successResult(`No messages found matching "${data.query}"`, []);
    }

    const list = formatList(results, (r) => {
      const preview = r.message.content.substring(0, 80);
      return `- **${r.conversation_title}**: "${preview}..."`;
    });

    return successResult(
      `Found ${results.length} message(s) matching "${data.query}":\n\n${list}`,
      results,
      '/inbox'
    );
  } catch (err) {
    return errorResult(`Exception searching messages: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Unread Count
// ============================================================================

export async function getUnreadCount(
  ctx: ActionContext,
  data: {} = {}
): Promise<ActionResult> {
  try {
    // For now, count active conversations as "inbox items"
    // A proper implementation would track read/unread status per message
    const { data: conversations, error, count } = await ctx.supabase
      .from('chat_conversations')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    if (error) {
      return errorResult(`Failed to get unread count: ${error.message}`, error.message);
    }

    const activeCount = count || 0;

    return successResult(
      `You have ${activeCount} active conversation(s) in your inbox.`,
      { active_conversations: activeCount },
      '/inbox'
    );
  } catch (err) {
    return errorResult(`Exception getting unread count: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Inbox Action Router
// ============================================================================

export async function executeInboxAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'list_conversations':
      return listConversations(ctx, data);
    case 'create_conversation':
      return createConversation(ctx, data);
    case 'send_message':
      return sendMessage(ctx, data);
    case 'search_messages':
      return searchMessages(ctx, data);
    case 'get_unread_count':
      return getUnreadCount(ctx, data);
    default:
      return errorResult(`Unknown inbox action: ${action}`, 'Unknown action');
  }
}
