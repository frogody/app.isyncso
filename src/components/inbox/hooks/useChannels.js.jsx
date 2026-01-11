import { useState, useEffect, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

const DEFAULT_CHANNELS = [
  { name: 'general', description: 'General discussions', type: 'public' },
  { name: 'random', description: 'Random stuff', type: 'public' },
  { name: 'announcements', description: 'Important announcements', type: 'public' }
];

export function useChannels(user) {
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadChannels = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const channelsData = await db.entities.Channel.list('-last_message_at');

      const publicChannels = channelsData.filter(c => c.type !== 'dm' && !c.is_archived);
      const dms = channelsData.filter(c => c.type === 'dm' && !c.is_archived);

      setChannels(publicChannels);
      setDirectMessages(dms);

      // Create default channels if none exist
      if (publicChannels.length === 0) {
        for (const ch of DEFAULT_CHANNELS) {
          await db.entities.Channel.create(ch);
        }

        const newChannels = await db.entities.Channel.list('-created_date');
        const newPublicChannels = newChannels.filter(c => c.type !== 'dm');
        setChannels(newPublicChannels);

        if (newPublicChannels.length > 0) {
          setSelectedChannel(newPublicChannels.find(c => c.name === 'general') || newPublicChannels[0]);
        }
      } else if (!selectedChannel) {
        setSelectedChannel(publicChannels[0]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [user, selectedChannel]);

  useEffect(() => {
    loadChannels();
  }, [user]);

  const createChannel = useCallback(async (channelData) => {
    try {
      const newChannel = await db.entities.Channel.create({
        ...channelData,
        members: channelData.members || [],
        created_by: user?.email
      });

      setChannels(prev => [...prev, newChannel]);
      setSelectedChannel(newChannel);

      // Create system message
      await db.entities.Message.create({
        channel_id: newChannel.id,
        sender_id: user.id,
        sender_name: 'System',
        content: `${user.full_name} created this channel`,
        type: 'system'
      });

      toast.success(`Channel #${channelData.name} created`);
      return newChannel;
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create channel');
      throw error;
    }
  }, [user]);

  const createDM = useCallback(async (targetUser) => {
    // Check for existing DM
    const existingDM = directMessages.find(dm =>
      dm.members?.includes(targetUser.id) && dm.members?.includes(user.id)
    );

    if (existingDM) {
      setSelectedChannel(existingDM);
      return existingDM;
    }

    try {
      const newDM = await db.entities.Channel.create({
        name: targetUser.full_name || targetUser.email,
        type: 'dm',
        members: [user.id, targetUser.id]
      });

      setDirectMessages(prev => [...prev, newDM]);
      setSelectedChannel(newDM);
      toast.success(`Started conversation with ${targetUser.full_name}`);
      return newDM;
    } catch (error) {
      console.error('Failed to create DM:', error);
      toast.error('Failed to start conversation');
      throw error;
    }
  }, [user, directMessages]);

  const updateChannel = useCallback(async (channelId, updates) => {
    try {
      await db.entities.Channel.update(channelId, updates);
      setChannels(prev => prev.map(c =>
        c.id === channelId ? { ...c, ...updates } : c
      ));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(prev => ({ ...prev, ...updates }));
      }
      toast.success('Channel updated');
    } catch (error) {
      console.error('Failed to update channel:', error);
      toast.error('Failed to update channel');
      throw error;
    }
  }, [selectedChannel]);

  const archiveChannel = useCallback(async (channel) => {
    try {
      await db.entities.Channel.update(channel.id, { is_archived: true });
      setChannels(prev => prev.filter(c => c.id !== channel.id));
      if (selectedChannel?.id === channel.id) {
        setSelectedChannel(channels.find(c => c.id !== channel.id) || null);
      }
      toast.success(`Channel #${channel.name} archived`);
    } catch (error) {
      console.error('Failed to archive channel:', error);
      toast.error('Failed to archive channel');
      throw error;
    }
  }, [selectedChannel, channels]);

  const deleteChannel = useCallback(async (channel) => {
    try {
      await db.entities.Channel.delete(channel.id);
      setChannels(prev => prev.filter(c => c.id !== channel.id));
      if (selectedChannel?.id === channel.id) {
        setSelectedChannel(channels.find(c => c.id !== channel.id) || null);
      }
      toast.success(`Channel #${channel.name} deleted`);
    } catch (error) {
      console.error('Failed to delete channel:', error);
      toast.error('Failed to delete channel');
      throw error;
    }
  }, [selectedChannel, channels]);

  return {
    channels,
    directMessages,
    selectedChannel,
    setSelectedChannel,
    loading,
    createChannel,
    createDM,
    updateChannel,
    archiveChannel,
    deleteChannel,
    refreshChannels: loadChannels
  };
}
