/**
 * useTypingIndicator - Real-time typing indicator hook using Supabase Presence
 *
 * Shows who is currently typing in a channel using Supabase Realtime Presence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const TYPING_TIMEOUT = 3000; // Consider user stopped typing after 3 seconds
const TYPING_THROTTLE = 1000; // Only send typing event every 1 second

export function useTypingIndicator(channelId, user) {
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  // Subscribe to typing presence
  useEffect(() => {
    if (!channelId || !user?.id) {
      setTypingUsers([]);
      return;
    }

    // Create presence channel for typing
    const channel = supabase.channel(`typing:${channelId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typingNow = [];

      // Extract users who are currently typing (excluding self)
      Object.entries(state).forEach(([key, presences]) => {
        if (key !== user.id) {
          presences.forEach(presence => {
            if (presence.typing) {
              typingNow.push({
                id: key,
                name: presence.name,
                avatar: presence.avatar,
              });
            }
          });
        }
      });

      setTypingUsers(typingNow);
    });

    // Track when users join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key !== user.id) {
        console.log('[TypingIndicator] User joined:', key);
      }
    });

    // Track when users leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (key !== user.id) {
        console.log('[TypingIndicator] User left:', key);
        setTypingUsers(prev => prev.filter(u => u.id !== key));
      }
    });

    // Subscribe and track initial presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        // Track user as present (but not typing initially)
        await channel.track({
          typing: false,
          name: user.full_name || user.email,
          avatar: user.avatar_url,
          online_at: new Date().toISOString(),
        });
      } else {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [channelId, user?.id, user?.full_name, user?.email, user?.avatar_url]);

  // Set typing state
  const setTyping = useCallback(async (isTyping) => {
    if (!channelRef.current || !user) return;

    try {
      await channelRef.current.track({
        typing: isTyping,
        name: user.full_name || user.email,
        avatar: user.avatar_url,
        online_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[TypingIndicator] Failed to update typing state:', error);
    }
  }, [user]);

  // Start typing (with throttle to prevent too many updates)
  const startTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE) {
      return;
    }
    lastTypingSentRef.current = now;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Auto-clear typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, TYPING_TIMEOUT);
  }, [setTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Format typing users string
  const getTypingText = useCallback(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    }
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers]);

  return {
    typingUsers,
    isConnected,
    startTyping,
    stopTyping,
    getTypingText,
  };
}

export default useTypingIndicator;
