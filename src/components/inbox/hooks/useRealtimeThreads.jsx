/**
 * useRealtimeThreads - Real-time thread replies subscription hook
 *
 * Provides real-time updates for thread replies when viewing a thread.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useRealtimeThreads(parentMessageId, userId) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  // Load initial replies
  const loadReplies = useCallback(async () => {
    if (!parentMessageId) {
      setReplies([]);
      return [];
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', parentMessageId)
        .order('created_date', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
      return data || [];
    } catch (error) {
      console.error('[useRealtimeThreads] Failed to load replies:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [parentMessageId]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!parentMessageId) {
      setReplies([]);
      return;
    }

    // Load initial replies
    loadReplies();

    // Create subscription for thread replies
    const channel = supabase.channel(`thread:${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${parentMessageId}`,
        },
        (payload) => {
          setReplies(prev => {
            if (prev.some(r => r.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${parentMessageId}`,
        },
        (payload) => {
          setReplies(prev =>
            prev.map(r => r.id === payload.new.id ? payload.new : r)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${parentMessageId}`,
        },
        (payload) => {
          setReplies(prev => prev.filter(r => r.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [parentMessageId, loadReplies]);

  // Send reply
  const sendReply = useCallback(async (content, senderData) => {
    if (!parentMessageId || !userId) return null;

    try {
      const { data: newReply, error } = await supabase
        .from('messages')
        .insert({
          channel_id: senderData.channelId,
          sender_id: userId,
          sender_name: senderData.sender_name,
          sender_avatar: senderData.sender_avatar,
          content,
          type: 'text',
          thread_id: parentMessageId,
          mentions: senderData.mentions || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Update parent message reply count
      const { error: updateError } = await supabase
        .rpc('increment_reply_count', { message_id: parentMessageId });

      if (updateError) {
        // Fallback: manual update
        const currentParent = await supabase
          .from('messages')
          .select('reply_count')
          .eq('id', parentMessageId)
          .single();

        await supabase
          .from('messages')
          .update({ reply_count: (currentParent.data?.reply_count || 0) + 1 })
          .eq('id', parentMessageId);
      }

      return newReply;
    } catch (error) {
      console.error('[useRealtimeThreads] Failed to send reply:', error);
      toast.error('Failed to send reply');
      throw error;
    }
  }, [parentMessageId, userId]);

  return {
    replies,
    loading,
    isConnected,
    sendReply,
    refreshReplies: loadReplies,
  };
}

export default useRealtimeThreads;
