/**
 * usePortalChat - Hook for realtime chat in the wholesale portal.
 *
 * Manages messages state. Supabase realtime subscription on b2b_chat_messages.
 * Methods: sendMessage, loadHistory, markAsRead.
 * Returns { messages, sendMessage, isLoading, isConnected }.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const MESSAGES_LIMIT = 50;

export default function usePortalChat({ clientId, organizationId }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  // -----------------------------------------------------------------------
  // Load message history
  // -----------------------------------------------------------------------
  const loadHistory = useCallback(async () => {
    if (!clientId || !organizationId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('b2b_chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .limit(MESSAGES_LIMIT);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('[usePortalChat] loadHistory error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, organizationId]);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content, sender = 'client') => {
      if (!content.trim() || !clientId || !organizationId) return;

      try {
        const { data, error } = await supabase
          .from('b2b_chat_messages')
          .insert({
            client_id: clientId,
            organization_id: organizationId,
            content: content.trim(),
            sender,
            read: false,
          })
          .select()
          .single();

        if (error) throw error;

        // Optimistic add if realtime hasn't picked it up
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      } catch (err) {
        console.error('[usePortalChat] sendMessage error:', err);
      }
    },
    [clientId, organizationId]
  );

  // -----------------------------------------------------------------------
  // Mark as read
  // -----------------------------------------------------------------------
  const markAsRead = useCallback(async () => {
    if (!clientId || !organizationId) return;

    try {
      await supabase
        .from('b2b_chat_messages')
        .update({ read: true })
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .eq('sender', 'admin')
        .eq('read', false);
    } catch (err) {
      console.error('[usePortalChat] markAsRead error:', err);
    }
  }, [clientId, organizationId]);

  // -----------------------------------------------------------------------
  // Realtime subscription
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!clientId || !organizationId) return;

    loadHistory();

    const channel = supabase
      .channel(`chat:${clientId}:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'b2b_chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clientId, organizationId, loadHistory]);

  return {
    messages,
    sendMessage,
    loadHistory,
    markAsRead,
    isLoading,
    isConnected,
  };
}
