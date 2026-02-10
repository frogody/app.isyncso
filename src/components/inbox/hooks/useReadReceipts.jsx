/**
 * useReadReceipts - Real-time read receipts for messages
 *
 * Tracks which users have read messages and provides functions to mark messages as read.
 * Uses Supabase Realtime for instant updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useReadReceipts(channelId, user, messages = []) {
  const [readReceipts, setReadReceipts] = useState({});
  const [loading, setLoading] = useState(false);
  const channelRef = useRef(null);
  const messagesRef = useRef(messages);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch initial read receipts for visible messages
  useEffect(() => {
    if (!channelId || !user?.id || messages.length === 0) {
      return;
    }

    const messageIds = messages.map(m => m.id).filter(Boolean);
    if (messageIds.length === 0) return;

    const fetchReadReceipts = async () => {
      setLoading(true);
      try {
        // Fetch read receipts for all visible messages
        const { data, error } = await supabase
          .from('message_reads')
          .select(`
            message_id,
            user_id,
            read_at,
            users:user_id (
              full_name,
              avatar_url
            )
          `)
          .in('message_id', messageIds);

        if (error) {
          console.error('[ReadReceipts] Failed to fetch:', error);
          return;
        }

        // Group by message_id
        const receiptsMap = {};
        data?.forEach(receipt => {
          if (!receiptsMap[receipt.message_id]) {
            receiptsMap[receipt.message_id] = [];
          }
          receiptsMap[receipt.message_id].push({
            user_id: receipt.user_id,
            user_name: receipt.users?.full_name,
            user_avatar: receipt.users?.avatar_url,
            read_at: receipt.read_at,
          });
        });

        setReadReceipts(receiptsMap);
      } catch (error) {
        console.error('[ReadReceipts] Error:', error);
      }
      setLoading(false);
    };

    fetchReadReceipts();
  }, [channelId, user?.id, messages.length]);

  // Subscribe to realtime read receipt updates
  useEffect(() => {
    if (!channelId || !user?.id) return;

    const channel = supabase
      .channel(`read_receipts:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        async (payload) => {
          const { message_id, user_id, read_at } = payload.new;

          // Only process if this message is in our visible list (read from ref)
          const currentMessageIds = messagesRef.current.map(m => m.id).filter(Boolean);
          if (!currentMessageIds.includes(message_id)) return;

          // Fetch user details
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', user_id)
            .single();

          setReadReceipts(prev => {
            const existing = prev[message_id] || [];
            // Check if already exists
            if (existing.some(r => r.user_id === user_id)) {
              return prev;
            }
            return {
              ...prev,
              [message_id]: [
                ...existing,
                {
                  user_id,
                  user_name: userData?.full_name,
                  user_avatar: userData?.avatar_url,
                  read_at,
                },
              ],
            };
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, user?.id]);

  // Mark a single message as read
  const markAsRead = useCallback(async (messageId) => {
    if (!user?.id || !messageId) return;

    try {
      await supabase.rpc('mark_message_read', { p_message_id: messageId });
    } catch (error) {
      console.error('[ReadReceipts] Failed to mark as read:', error);
    }
  }, [user?.id]);

  // Mark multiple messages as read
  const markMultipleAsRead = useCallback(async (messageIds) => {
    if (!user?.id || !messageIds?.length) return;

    try {
      await supabase.rpc('mark_messages_read', { p_message_ids: messageIds });
    } catch (error) {
      console.error('[ReadReceipts] Failed to mark multiple as read:', error);
    }
  }, [user?.id]);

  // Get read receipts for a specific message (excluding current user)
  const getMessageReaders = useCallback((messageId) => {
    const readers = readReceipts[messageId] || [];
    return readers.filter(r => r.user_id !== user?.id);
  }, [readReceipts, user?.id]);

  // Check if message has been read by anyone (excluding sender)
  const isReadByOthers = useCallback((messageId, senderId) => {
    const readers = readReceipts[messageId] || [];
    return readers.some(r => r.user_id !== senderId);
  }, [readReceipts]);

  // Get read status text (e.g., "Read by 3 people")
  const getReadStatusText = useCallback((messageId, senderId) => {
    const readers = (readReceipts[messageId] || []).filter(r => r.user_id !== senderId);
    if (readers.length === 0) return null;
    if (readers.length === 1) return `Read by ${readers[0].user_name || 'someone'}`;
    if (readers.length === 2) return `Read by ${readers[0].user_name} and ${readers[1].user_name}`;
    return `Read by ${readers[0].user_name} and ${readers.length - 1} others`;
  }, [readReceipts]);

  return {
    readReceipts,
    loading,
    markAsRead,
    markMultipleAsRead,
    getMessageReaders,
    isReadByOthers,
    getReadStatusText,
  };
}

export default useReadReceipts;
