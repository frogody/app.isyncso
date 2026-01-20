/**
 * useRealtimeChannels - Real-time channel subscription hook
 *
 * Provides real-time updates for channels list including new channels,
 * updates (name, description, last_message_at), and deletions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useRealtimeChannels(userId) {
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  // Load initial channels
  const loadChannels = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const publicChannels = (data || []).filter(c => c.type !== 'dm');
      const dms = (data || []).filter(c => c.type === 'dm');

      setChannels(publicChannels);
      setDirectMessages(dms);
    } catch (error) {
      console.error('[useRealtimeChannels] Failed to load channels:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!userId) return;

    // Load initial channels
    loadChannels();

    // Create subscription channel for all channel changes
    const channel = supabase.channel('channels:all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channels',
        },
        (payload) => {
          console.log('[Realtime] New channel:', payload.new);
          const newChannel = payload.new;

          if (newChannel.is_archived) return;

          if (newChannel.type === 'dm') {
            // Check if user is a member of this DM
            if (newChannel.members?.includes(userId) || newChannel.user_id === userId) {
              setDirectMessages(prev => {
                if (prev.some(c => c.id === newChannel.id)) return prev;
                return [newChannel, ...prev];
              });
            }
          } else {
            // Public or private channel
            setChannels(prev => {
              if (prev.some(c => c.id === newChannel.id)) return prev;
              return [newChannel, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
        },
        (payload) => {
          console.log('[Realtime] Channel updated:', payload.new);
          const updatedChannel = payload.new;

          // Handle archiving
          if (updatedChannel.is_archived) {
            setChannels(prev => prev.filter(c => c.id !== updatedChannel.id));
            setDirectMessages(prev => prev.filter(c => c.id !== updatedChannel.id));
            return;
          }

          if (updatedChannel.type === 'dm') {
            setDirectMessages(prev =>
              prev.map(c => c.id === updatedChannel.id ? updatedChannel : c)
            );
          } else {
            setChannels(prev =>
              prev.map(c => c.id === updatedChannel.id ? updatedChannel : c)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'channels',
        },
        (payload) => {
          console.log('[Realtime] Channel deleted:', payload.old);
          setChannels(prev => prev.filter(c => c.id !== payload.old.id));
          setDirectMessages(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Channels subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up channels subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, loadChannels]);

  // Create channel
  const createChannel = useCallback(async (channelData) => {
    if (!userId) throw new Error('Not authenticated');

    try {
      // Include creator in members for private channels
      const members = channelData.type === 'private'
        ? [...new Set([userId, ...(channelData.members || [])])]
        : [];

      const { data: newChannel, error } = await supabase
        .from('channels')
        .insert({
          name: channelData.name,
          description: channelData.description,
          type: channelData.type || 'public',
          user_id: userId,
          members,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create system message
      await supabase.from('messages').insert({
        channel_id: newChannel.id,
        sender_id: userId,
        sender_name: 'System',
        content: `Channel created`,
        type: 'system',
        topic: 'system', // Required NOT NULL field
        extension: 'none', // Required NOT NULL field
      });

      toast.success(`Channel #${channelData.name} created`);
      return newChannel;
    } catch (error) {
      console.error('[useRealtimeChannels] Failed to create channel:', error);
      toast.error('Failed to create channel');
      throw error;
    }
  }, [userId]);

  // Create DM
  const createDM = useCallback(async (targetUser) => {
    if (!userId) throw new Error('Not authenticated');

    // Check for existing DM
    const existingDM = directMessages.find(dm =>
      dm.members?.includes(targetUser.id) && dm.members?.includes(userId)
    );
    if (existingDM) return existingDM;

    try {
      const { data: newDM, error } = await supabase
        .from('channels')
        .insert({
          name: targetUser.full_name || targetUser.email,
          type: 'dm',
          user_id: userId,
          members: [userId, targetUser.id],
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Started conversation with ${targetUser.full_name}`);
      return newDM;
    } catch (error) {
      console.error('[useRealtimeChannels] Failed to create DM:', error);
      toast.error('Failed to start conversation');
      throw error;
    }
  }, [userId, directMessages]);

  // Update channel
  const updateChannel = useCallback(async (channelId, updates) => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .update(updates)
        .eq('id', channelId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Channel updated');
      return data;
    } catch (error) {
      console.error('[useRealtimeChannels] Failed to update channel:', error);
      toast.error('Failed to update channel');
      throw error;
    }
  }, []);

  // Archive channel
  const archiveChannel = useCallback(async (channelId) => {
    try {
      await updateChannel(channelId, { is_archived: true });
      toast.success('Channel archived');
    } catch (error) {
      toast.error('Failed to archive channel');
    }
  }, [updateChannel]);

  // Delete channel
  const deleteChannel = useCallback(async (channelId) => {
    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
      toast.success('Channel deleted');
    } catch (error) {
      console.error('[useRealtimeChannels] Failed to delete channel:', error);
      toast.error('Failed to delete channel');
      throw error;
    }
  }, []);

  return {
    channels,
    directMessages,
    loading,
    isConnected,
    createChannel,
    createDM,
    updateChannel,
    archiveChannel,
    deleteChannel,
    refreshChannels: loadChannels,
  };
}

export default useRealtimeChannels;
