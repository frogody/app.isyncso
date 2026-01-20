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

  // Throttle rapid realtime events to prevent flooding
  const lastEventTimeRef = useRef(0);
  const pendingUpdatesRef = useRef(new Map()); // channel_id -> latest payload
  const throttleTimeoutRef = useRef(null);

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

  // Process batched updates (throttled)
  const processPendingUpdates = useCallback(() => {
    const updates = pendingUpdatesRef.current;
    if (updates.size === 0) return;

    // Apply all pending updates at once
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      updates.forEach((payload, channelId) => {
        if (payload.eventType === 'DELETE') {
          delete newCounts[channelId];
        } else {
          const { unread_count } = payload.new;
          if (unread_count > 0) {
            newCounts[channelId] = unread_count;
          } else {
            delete newCounts[channelId];
          }
        }
      });
      const total = Object.values(newCounts).reduce((sum, count) => sum + count, 0);
      setTotalUnread(total);
      return newCounts;
    });

    setMentionChannels(prev => {
      const newMentions = new Set(prev);
      updates.forEach((payload, channelId) => {
        if (payload.eventType === 'DELETE') {
          newMentions.delete(channelId);
        } else {
          const { has_mentions, unread_count } = payload.new;
          if (has_mentions && unread_count > 0) {
            newMentions.add(channelId);
          } else {
            newMentions.delete(channelId);
          }
        }
      });
      return newMentions;
    });

    // Clear pending updates
    pendingUpdatesRef.current = new Map();
  }, []);

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
          const channelId = payload.new?.channel_id || payload.old?.channel_id;
          if (!channelId) return;

          // Store the update (overwrites previous update for same channel)
          pendingUpdatesRef.current.set(channelId, payload);

          // Throttle: only process every 150ms
          const now = Date.now();
          if (now - lastEventTimeRef.current > 150) {
            // Process immediately if it's been a while
            lastEventTimeRef.current = now;
            processPendingUpdates();
          } else if (!throttleTimeoutRef.current) {
            // Schedule processing for later
            throttleTimeoutRef.current = setTimeout(() => {
              lastEventTimeRef.current = Date.now();
              processPendingUpdates();
              throttleTimeoutRef.current = null;
            }, 150);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
          console.log('[Realtime] Unread subscription:', status);
        }
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [userId, loadUnreadCounts, processPendingUpdates]);

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
