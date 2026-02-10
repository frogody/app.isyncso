/**
 * useRealtimeMessages - Real-time message subscription hook with pagination
 *
 * Replaces polling with Supabase Realtime for instant message updates.
 * Handles INSERT, UPDATE, DELETE events on messages table.
 * Supports cursor-based pagination for loading older messages.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

const PAGE_SIZE = 50;
const INITIAL_PAGE_SIZE = 50;

// Helper to check if a string is a valid UUID
const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useRealtimeMessages(channelId, userId, options = {}) {
  // Skip all database calls for special channels (non-UUID ids like 'mentions', 'saved')
  const isSpecialChannel = channelId && !isValidUUID(channelId);
  const { onNewMessage } = options;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef(null);
  const channelRef = useRef(null);
  const oldestMessageRef = useRef(null);

  // Load initial messages (newest messages first, then reverse for display)
  const loadMessages = useCallback(async (limit = INITIAL_PAGE_SIZE) => {
    if (!channelId || isSpecialChannel) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .is('thread_id', null) // Only top-level messages
        .order('created_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Reverse to show oldest first, newest at bottom
      const sortedMessages = (data || []).reverse();
      setMessages(sortedMessages);

      // Track oldest message for pagination
      if (sortedMessages.length > 0) {
        oldestMessageRef.current = sortedMessages[0].created_date;
      }

      // Check if there might be more messages
      setHasMore(data?.length === limit);
    } catch (error) {
      console.error('[useRealtimeMessages] Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!channelId || isSpecialChannel || loadingMore || !hasMore || !oldestMessageRef.current) {
      return;
    }

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .is('thread_id', null)
        .lt('created_date', oldestMessageRef.current) // Messages older than current oldest
        .order('created_date', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      if (data && data.length > 0) {
        // Reverse to maintain chronological order
        const olderMessages = data.reverse();

        // Update oldest reference
        oldestMessageRef.current = olderMessages[0].created_date;

        // Prepend to existing messages
        setMessages(prev => [...olderMessages, ...prev]);

        // Check if there might be more
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('[useRealtimeMessages] Failed to load older messages:', error);
      toast.error('Failed to load older messages');
    } finally {
      setLoadingMore(false);
    }
  }, [channelId, loadingMore, hasMore]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!channelId || isSpecialChannel) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    // Reset state for new channel
    oldestMessageRef.current = null;
    setHasMore(true);

    // Load initial messages
    loadMessages();

    // Create subscription channel
    const channel = supabase.channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // New message received via realtime
          const newMessage = payload.new;

          // Only add top-level messages (not thread replies)
          if (!newMessage.thread_id) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            // Notify about new message (for notifications)
            if (onNewMessage && newMessage.sender_id !== userId) {
              onNewMessage(newMessage);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages(prev =>
            prev.map(m => m.id === payload.new.id ? payload.new : m)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');

        if (status === 'CHANNEL_ERROR') {
          toast.error('Connection lost. Reconnecting...');
        }
      });

    channelRef.current = channel;
    subscriptionRef.current = channel;

    // Cleanup on unmount or channel change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (messageData) => {
    if (!channelId || !userId) return null;

    try {
      // Build attachments array if file data is provided
      const attachments = [];
      if (messageData.file_url) {
        attachments.push({
          url: messageData.file_url,
          name: messageData.file_name || 'file',
          type: messageData.type || 'file',
        });
      }

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: userId,
          sender_name: messageData.sender_name,
          sender_avatar: messageData.sender_avatar,
          content: messageData.content,
          type: messageData.type || 'text',
          thread_id: messageData.thread_id || null,
          mentions: messageData.mentions || [],
          attachments: attachments.length > 0 ? attachments : [],
        })
        .select()
        .single();

      if (error) throw error;

      // Update channel's last_message_at (trigger will also do this)
      await supabase
        .from('channels')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', channelId);

      return newMessage;
    } catch (error) {
      console.error('[useRealtimeMessages] Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  }, [channelId, userId]);

  // Update message (edit, pin, react)
  const updateMessage = useCallback(async (messageId, updates) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[useRealtimeMessages] Failed to update message:', error);
      throw error;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[useRealtimeMessages] Failed to delete message:', error);
      throw error;
    }
  }, []);

  // React to message
  const reactToMessage = useCallback(async (messageId, emoji, currentUserId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = { ...(message.reactions || {}) };
    const users = reactions[emoji] || [];

    if (users.includes(currentUserId)) {
      reactions[emoji] = users.filter(id => id !== currentUserId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, currentUserId];
    }

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, reactions } : m
    ));

    try {
      await updateMessage(messageId, { reactions });
    } catch (error) {
      // Revert on error
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: message.reactions } : m
      ));
    }
  }, [messages, updateMessage]);

  // Pin/unpin message
  const pinMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const newPinnedState = !message.is_pinned;

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, is_pinned: newPinnedState } : m
    ));

    try {
      await updateMessage(messageId, { is_pinned: newPinnedState });
      toast.success(newPinnedState ? 'Message pinned' : 'Message unpinned');
    } catch (error) {
      // Revert on error
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_pinned: message.is_pinned } : m
      ));
      toast.error('Failed to update message');
    }
  }, [messages, updateMessage]);

  // Edit message
  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      await updateMessage(messageId, { content: newContent, is_edited: true });
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to edit message');
      throw error;
    }
  }, [updateMessage]);

  return {
    messages,
    setMessages,
    loading,
    loadingMore,
    hasMore,
    isConnected,
    sendMessage,
    updateMessage,
    deleteMessage,
    reactToMessage,
    pinMessage,
    editMessage,
    loadOlderMessages,
    refreshMessages: loadMessages,
    pinnedMessages: messages.filter(m => m.is_pinned),
  };
}

export default useRealtimeMessages;
