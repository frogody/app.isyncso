/**
 * useNotifications - Browser notification hook for inbox
 *
 * Handles notification permissions, sending notifications,
 * and managing notification preferences.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const NOTIFICATION_PERMISSION_KEY = 'inbox_notification_permission';
const NOTIFICATION_SETTINGS_KEY = 'inbox_notification_settings';

const DEFAULT_SETTINGS = {
  enabled: true,
  sound: true,
  mentions: true,
  directMessages: true,
  channels: true,
};

export function useNotifications(userId, currentChannelId) {
  const [permission, setPermission] = useState('default');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const audioRef = useRef(null);

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error('[useNotifications] Failed to load settings:', e);
    }

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('[useNotifications] Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, result);
      return result === 'granted';
    } catch (error) {
      console.error('[useNotifications] Failed to request permission:', error);
      return false;
    }
  }, []);

  // Update notification settings
  const updateSettings = useCallback((newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[useNotifications] Failed to save settings:', e);
    }
  }, [settings]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!settings.sound) return;

    try {
      // Create audio element if not exists
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (e) {
      console.warn('[useNotifications] Failed to play sound:', e);
    }
  }, [settings.sound]);

  // Show browser notification
  const showNotification = useCallback((message, channel) => {
    // Don't show if disabled or user denied permission
    if (!settings.enabled || permission !== 'granted') return;

    // Don't show if document is visible and user is on the same channel
    if (isDocumentVisible && currentChannelId === message.channel_id) return;

    // Don't show own messages
    if (message.sender_id === userId) return;

    // Check settings for message type
    const isDM = channel?.type === 'dm';
    const isMention = message.mentions?.includes(userId);

    if (isDM && !settings.directMessages) return;
    if (!isDM && !settings.channels) return;
    if (isMention && !settings.mentions) return;

    // Build notification content
    const title = isDM
      ? `New message from ${message.sender_name}`
      : `#${channel?.name || 'channel'}`;

    const body = message.type === 'file'
      ? `${message.sender_name} sent a file: ${message.file_name}`
      : message.content?.length > 100
        ? `${message.content.slice(0, 100)}...`
        : message.content;

    const icon = message.sender_avatar || '/icon-192.png';

    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag: `inbox-${message.id}`,
        renotify: true,
        requireInteraction: false,
        silent: !settings.sound,
        data: {
          messageId: message.id,
          channelId: message.channel_id,
        },
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigate to channel/message could be handled via event
        window.dispatchEvent(new CustomEvent('notification-click', {
          detail: {
            messageId: message.id,
            channelId: message.channel_id,
          }
        }));
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Play sound if enabled
      if (settings.sound) {
        playSound();
      }
    } catch (error) {
      console.error('[useNotifications] Failed to show notification:', error);
    }
  }, [settings, permission, isDocumentVisible, currentChannelId, userId, playSound]);

  // Notify for new message (to be called from realtime hook)
  const notifyNewMessage = useCallback((message, channel) => {
    showNotification(message, channel);
  }, [showNotification]);

  // Check if notifications are supported
  const isSupported = 'Notification' in window;

  return {
    permission,
    isSupported,
    settings,
    isDocumentVisible,
    requestPermission,
    updateSettings,
    notifyNewMessage,
    playSound,
  };
}

export default useNotifications;
