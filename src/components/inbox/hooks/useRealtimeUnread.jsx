/**
 * useRealtimeUnread - Database-backed unread tracking with real-time sync
 *
 * Replaces localStorage-based unread tracking with Supabase-backed solution
 * that syncs across devices in real-time.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useRealtimeUnread(userId) {
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [mentionChannels, setMentionChannels] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  // Load initial unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!userId) {
      setUnreadCounts({});
      setTotalUnread(0);
      setMentionChannels(new Set());
      return;
    }

    try {
      // Get all unread counts for user
      const { data, error } = await supabase
        .from('channel_read_status')
        .select('channel_id, unread_count, has_mentions, last_read_at')
        .eq('user_id', userId);

      if (error) throw error;

      const counts = {};
      const mentions = new Set();
      let total = 0;

      (data || []).forEach(row => {
        if (row.unread_count > 0) {
          counts[row.channel_id] = row.unread_count;
          total += row.unread_count;
          if (row.has_mentions) {
            mentions.add(row.channel_id);
          }
        }
      });

      setUnreadCounts(counts);
      setTotalUnread(total);
      setMentionChannels(mentions);
    } catch (error) {
      console.error('[useRealtimeUnread] Failed to load unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    // Load initial counts
    loadUnreadCounts();

    // Create subscription for read status changes
    const channel = supabase.channel(`unread:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_read_status',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Unread status changed:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { channel_id, unread_count, has_mentions } = payload.new;

            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              if (unread_count > 0) {
                newCounts[channel_id] = unread_count;
              } else {
                delete newCounts[channel_id];
              }
              return newCounts;
            });

            setMentionChannels(prev => {
              const newMentions = new Set(prev);
              if (has_mentions && unread_count > 0) {
                newMentions.add(channel_id);
              } else {
                newMentions.delete(channel_id);
              }
              return newMentions;
            });

            // Recalculate total
            setUnreadCounts(prev => {
              const total = Object.values(prev).reduce((sum, count) => sum + count, 0);
              setTotalUnread(total);
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const { channel_id } = payload.old;

            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              delete newCounts[channel_id];
              return newCounts;
            });

            setMentionChannels(prev => {
              const newMentions = new Set(prev);
              newMentions.delete(channel_id);
              return newMentions;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Unread subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, loadUnreadCounts]);

  // Mark channel as read
  const markChannelRead = useCallback(async (channelId, lastMessageId = null) => {
    if (!userId || !channelId) return;

    try {
      // Call the database function
      const { error } = await supabase.rpc('mark_channel_read', {
        p_channel_id: channelId,
        p_last_message_id: lastMessageId,
      });

      if (error) throw error;

      // Optimistic update
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[channelId];
        return newCounts;
      });

      setMentionChannels(prev => {
        const newMentions = new Set(prev);
        newMentions.delete(channelId);
        return newMentions;
      });

      // Recalculate total
      setTotalUnread(prev => {
        const channelCount = unreadCounts[channelId] || 0;
        return Math.max(0, prev - channelCount);
      });
    } catch (error) {
      console.error('[useRealtimeUnread] Failed to mark channel read:', error);
      // Reload to get correct state
      loadUnreadCounts();
    }
  }, [userId, unreadCounts, loadUnreadCounts]);

  // Initialize read status for a channel (called when user first visits)
  const initializeChannelStatus = useCallback(async (channelId) => {
    if (!userId || !channelId) return;

    try {
      // Check if status exists
      const { data: existing } = await supabase
        .from('channel_read_status')
        .select('id')
        .eq('user_id', userId)
        .eq('channel_id', channelId)
        .single();

      // If no status exists, create one with 0 unread
      if (!existing) {
        await supabase
          .from('channel_read_status')
          .insert({
            user_id: userId,
            channel_id: channelId,
            unread_count: 0,
            has_mentions: false,
          });
      }
    } catch (error) {
      // Ignore "no rows returned" errors
      if (error.code !== 'PGRST116') {
        console.error('[useRealtimeUnread] Failed to initialize channel status:', error);
      }
    }
  }, [userId]);

  // Get unread count for a specific channel
  const getUnreadCount = useCallback((channelId) => {
    return unreadCounts[channelId] || 0;
  }, [unreadCounts]);

  // Check if channel has mentions
  const hasMentions = useCallback((channelId) => {
    return mentionChannels.has(channelId);
  }, [mentionChannels]);

  // Mark all channels as read
  const markAllRead = useCallback(async () => {
    if (!userId) return;

    try {
      await supabase
        .from('channel_read_status')
        .update({
          unread_count: 0,
          has_mentions: false,
          last_read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .gt('unread_count', 0);

      // Optimistic update
      setUnreadCounts({});
      setMentionChannels(new Set());
      setTotalUnread(0);
    } catch (error) {
      console.error('[useRealtimeUnread] Failed to mark all read:', error);
      loadUnreadCounts();
    }
  }, [userId, loadUnreadCounts]);

  return {
    unreadCounts,
    totalUnread,
    mentionChannels,
    loading,
    isConnected,
    markChannelRead,
    markAllRead,
    getUnreadCount,
    hasMentions,
    initializeChannelStatus,
    refreshUnread: loadUnreadCounts,
  };
}

export default useRealtimeUnread;
