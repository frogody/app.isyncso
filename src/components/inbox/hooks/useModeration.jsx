/**
 * useModeration - Hook for channel moderation and rate limiting
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useModeration(channelId, userId) {
  const [rateLimits, setRateLimits] = useState(null);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load channel rate limits
  const loadRateLimits = useCallback(async () => {
    if (!channelId) return;

    try {
      const { data, error } = await supabase.rpc('get_channel_rate_limits', {
        p_channel_id: channelId
      });

      if (error) throw error;
      setRateLimits(data);
    } catch (error) {
      console.error('[Moderation] Failed to load rate limits:', error);
      // Default limits
      setRateLimits({
        messages_per_minute: 30,
        messages_per_hour: 200,
        slowmode_seconds: null
      });
    }
  }, [channelId]);

  // Check if current user is muted
  const checkMuteStatus = useCallback(async () => {
    if (!channelId || !userId) return;

    try {
      const { data, error } = await supabase.rpc('is_user_muted', {
        p_channel_id: channelId,
        p_user_id: userId
      });

      if (error) throw error;
      setIsMuted(data);
    } catch (error) {
      console.error('[Moderation] Failed to check mute status:', error);
      setIsMuted(false);
    }
  }, [channelId, userId]);

  // Load muted users (for moderators)
  const loadMutedUsers = useCallback(async () => {
    if (!channelId) return;

    try {
      const { data, error } = await supabase.rpc('get_muted_users', {
        p_channel_id: channelId
      });

      if (error) throw error;
      if (data.success) {
        setMutedUsers(data.muted_users || []);
      }
    } catch (error) {
      console.error('[Moderation] Failed to load muted users:', error);
    }
  }, [channelId]);

  // Check rate limit before sending message
  const checkRateLimit = useCallback(async () => {
    if (!channelId || !userId) {
      return { allowed: true };
    }

    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_channel_id: channelId,
        p_user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[Moderation] Failed to check rate limit:', error);
      // Allow on error to not block messaging
      return { allowed: true };
    }
  }, [channelId, userId]);

  // Mute a user
  const muteUser = useCallback(async (targetUserId, reason = null, durationMinutes = null) => {
    if (!channelId) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('mute_channel_user', {
        p_channel_id: channelId,
        p_user_id: targetUserId,
        p_reason: reason,
        p_duration_minutes: durationMinutes
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to mute user');
        return false;
      }

      const duration = durationMinutes ? `for ${durationMinutes} minutes` : 'indefinitely';
      toast.success(`User muted ${duration}`);
      await loadMutedUsers();
      return true;
    } catch (error) {
      console.error('[Moderation] Failed to mute user:', error);
      toast.error('Failed to mute user');
      return false;
    } finally {
      setLoading(false);
    }
  }, [channelId, loadMutedUsers]);

  // Unmute a user
  const unmuteUser = useCallback(async (targetUserId) => {
    if (!channelId) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('unmute_channel_user', {
        p_channel_id: channelId,
        p_user_id: targetUserId
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to unmute user');
        return false;
      }

      toast.success('User unmuted');
      await loadMutedUsers();
      return true;
    } catch (error) {
      console.error('[Moderation] Failed to unmute user:', error);
      toast.error('Failed to unmute user');
      return false;
    } finally {
      setLoading(false);
    }
  }, [channelId, loadMutedUsers]);

  // Warn a user
  const warnUser = useCallback(async (targetUserId, reason) => {
    if (!channelId || !reason) {
      toast.error('Please provide a reason for the warning');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('warn_channel_user', {
        p_channel_id: channelId,
        p_user_id: targetUserId,
        p_reason: reason
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to warn user');
        return false;
      }

      toast.success(`Warning issued (${data.warning_count} total warnings)`);
      return true;
    } catch (error) {
      console.error('[Moderation] Failed to warn user:', error);
      toast.error('Failed to warn user');
      return false;
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Delete message as moderator
  const deleteMessage = useCallback(async (messageId, reason = null) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_message_as_moderator', {
        p_message_id: messageId,
        p_reason: reason
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to delete message');
        return false;
      }

      toast.success('Message deleted');
      return true;
    } catch (error) {
      console.error('[Moderation] Failed to delete message:', error);
      toast.error('Failed to delete message');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update channel rate limits
  const updateRateLimits = useCallback(async (settings) => {
    if (!channelId) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_channel_rate_limits', {
        p_channel_id: channelId,
        p_messages_per_minute: settings.messagesPerMinute,
        p_messages_per_hour: settings.messagesPerHour,
        p_slowmode_seconds: settings.slowmodeSeconds
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to update rate limits');
        return false;
      }

      toast.success('Rate limits updated');
      await loadRateLimits();
      return true;
    } catch (error) {
      console.error('[Moderation] Failed to update rate limits:', error);
      toast.error('Failed to update rate limits');
      return false;
    } finally {
      setLoading(false);
    }
  }, [channelId, loadRateLimits]);

  // Get moderation history for a user
  const getModerationHistory = useCallback(async (targetUserId) => {
    if (!channelId) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_moderation_history', {
        p_channel_id: channelId,
        p_user_id: targetUserId
      });

      if (error) throw error;
      return data.success ? data.history : [];
    } catch (error) {
      console.error('[Moderation] Failed to get moderation history:', error);
      return [];
    }
  }, [channelId]);

  // Load initial data
  useEffect(() => {
    loadRateLimits();
    checkMuteStatus();
  }, [loadRateLimits, checkMuteStatus]);

  // Subscribe to mute changes
  useEffect(() => {
    if (!channelId || !userId) return;

    const subscription = supabase
      .channel(`muted_users:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'muted_users',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          checkMuteStatus();
          loadMutedUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, userId, checkMuteStatus, loadMutedUsers]);

  return {
    // State
    rateLimits,
    mutedUsers,
    isMuted,
    loading,

    // Actions
    checkRateLimit,
    muteUser,
    unmuteUser,
    warnUser,
    deleteMessage,
    updateRateLimits,
    getModerationHistory,
    loadMutedUsers,

    // Helpers
    isSlowmodeEnabled: rateLimits?.slowmode_seconds > 0,
    slowmodeSeconds: rateLimits?.slowmode_seconds || 0,
  };
}
