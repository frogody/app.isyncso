import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'inbox_last_read';

export function useUnreadTracking(channels, directMessages, selectedChannel, messages) {
  const [unreadCounts, setUnreadCounts] = useState({});
  const lastReadRef = useRef({});

  // Load last read timestamps from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        lastReadRef.current = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load last read data:', error);
    }
  }, []);

  // Calculate unread counts for all channels
  const calculateUnreadCounts = useCallback(async () => {
    const allChannels = [...channels, ...directMessages];
    const counts = {};

    for (const channel of allChannels) {
      const lastRead = lastReadRef.current[channel.id];

      if (lastRead && channel.last_message_at) {
        // If last message is after our last read, there are unread messages
        const lastMessageTime = new Date(channel.last_message_at).getTime();
        const lastReadTime = new Date(lastRead).getTime();

        if (lastMessageTime > lastReadTime) {
          // We don't know the exact count without fetching, so show 1
          // A more sophisticated implementation would store/fetch exact counts
          counts[channel.id] = 1;
        } else {
          counts[channel.id] = 0;
        }
      } else if (!lastRead && channel.last_message_at) {
        // Never read this channel, might have messages
        counts[channel.id] = 1;
      } else {
        counts[channel.id] = 0;
      }
    }

    setUnreadCounts(counts);
  }, [channels, directMessages]);

  // Recalculate when channels change
  useEffect(() => {
    calculateUnreadCounts();
  }, [channels, directMessages, calculateUnreadCounts]);

  // Mark channel as read when selected
  useEffect(() => {
    if (selectedChannel?.id) {
      markAsRead(selectedChannel.id);
    }
  }, [selectedChannel?.id]);

  // Mark a channel as read
  const markAsRead = useCallback((channelId) => {
    const now = new Date().toISOString();
    lastReadRef.current[channelId] = now;

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lastReadRef.current));
    } catch (error) {
      console.error('Failed to save last read data:', error);
    }

    // Update unread count
    setUnreadCounts(prev => ({
      ...prev,
      [channelId]: 0
    }));
  }, []);

  // Increment unread for a channel (when new message arrives in non-active channel)
  const incrementUnread = useCallback((channelId) => {
    if (selectedChannel?.id === channelId) {
      // Don't increment for active channel
      return;
    }

    setUnreadCounts(prev => ({
      ...prev,
      [channelId]: (prev[channelId] || 0) + 1
    }));
  }, [selectedChannel?.id]);

  // Get total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    unreadCounts,
    totalUnread,
    markAsRead,
    incrementUnread,
    refreshUnreadCounts: calculateUnreadCounts
  };
}
