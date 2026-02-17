import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Lock, Users, Pin, Search, Info,
  Loader2, MessageSquare, Inbox as InboxIcon, Keyboard,
  RefreshCw, AtSign, Bookmark, Wifi, WifiOff, Bell, BellOff,
  Menu, ArrowLeft, Video, UserPlus, BarChart3, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { db, supabase } from '@/api/supabaseClient';
import {
  TabBar,
  CalendarSidebarContent,
  CallsSidebarContent,
  PhoneSidebarContent,
  CalendarMainContent,
  CallsMainContent,
  PhoneMainContent,
} from '@/components/inbox/InboxHub';
import { useUser } from '@/components/context/UserContext';
import { usePermissions } from '@/components/context/PermissionContext';
import {
  detectAgentMentions,
  extractAgentPrompt,
  invokeAgentForChat,
  AVAILABLE_AGENTS
} from '@/components/inbox/AgentMentionHandler';
import { useRealtimeMessages } from '@/components/inbox/hooks/useRealtimeMessages';
import { useRealtimeChannels } from '@/components/inbox/hooks/useRealtimeChannels';
import { useRealtimeThreads } from '@/components/inbox/hooks/useRealtimeThreads';
import { useRealtimeUnread } from '@/components/inbox/hooks/useRealtimeUnread';
import { useNotifications } from '@/components/inbox/hooks/useNotifications';
import { useTypingIndicator } from '@/components/inbox/hooks/useTypingIndicator';
import { useReadReceipts } from '@/components/inbox/hooks/useReadReceipts';
import { useBookmarks } from '@/components/inbox/hooks/useBookmarks';
import { useModeration } from '@/components/inbox/hooks/useModeration';

// Components
import ChannelSidebar from '@/components/inbox/ChannelSidebar';
import MessageList from '@/components/inbox/MessageList';
import MessageInput from '@/components/inbox/MessageInput';
import ThreadPanel from '@/components/inbox/ThreadPanel';
import CreateChannelModal from '@/components/inbox/CreateChannelModal';
import NewDMModal from '@/components/inbox/NewDMModal';
import MembersPanel from '@/components/inbox/MembersPanel';
import PinnedMessagesPanel from '@/components/inbox/PinnedMessagesPanel';
import SearchPanel from '@/components/inbox/SearchPanel';
import ChannelDetailsPanel from '@/components/inbox/ChannelDetailsPanel';
import WorkspaceSettingsModal from '@/components/inbox/WorkspaceSettingsModal';
import KeyboardShortcutsModal from '@/components/inbox/KeyboardShortcutsModal';
import DeleteChannelDialog from '@/components/inbox/DeleteChannelDialog';
import ForwardMessageModal from '@/components/inbox/ForwardMessageModal';
import BookmarksPanel from '@/components/inbox/BookmarksPanel';
import ChannelSettingsPanel from '@/components/inbox/ChannelSettingsPanel';

// Feature components (wired from built subsystems)
import UniversalSearch from '@/components/inbox/search/UniversalSearch';
import { SyncBriefing } from '@/components/inbox/briefing';
import { GuestInviteModal } from '@/components/inbox/guests';
import { CreatePollModal } from '@/components/inbox/messages';
import SmartReply from '@/components/inbox/smart/SmartReply';
import { useVideoCall } from '@/components/inbox/video';
import { VideoCallRoom, CallBanner } from '@/components/inbox/video';

export default function InboxPage() {
  const { user } = useUser();
  const { isAdmin } = usePermissions();

  // ========================================
  // COMMUNICATION HUB TAB STATE
  // ========================================
  const [activeHubTab, setActiveHubTab] = useState('chat');

  // ========================================
  // REALTIME HOOKS (replacing polling)
  // ========================================

  // Realtime channels subscription
  const {
    channels: realtimeChannels,
    directMessages: realtimeDMs,
    supportChannels: realtimeSupportChannels,
    loading: channelsLoading,
    isConnected: channelsConnected,
    createChannel: rtCreateChannel,
    createDM: rtCreateDM,
    updateChannel: rtUpdateChannel,
    archiveChannel: rtArchiveChannel,
    deleteChannel: rtDeleteChannel,
  } = useRealtimeChannels(user?.id);

  // Selected channel state
  const [selectedChannel, setSelectedChannel] = useState(null);

  // Browser notifications
  const {
    permission: notificationPermission,
    isSupported: notificationsSupported,
    settings: notificationSettings,
    requestPermission: requestNotificationPermission,
    notifyNewMessage,
  } = useNotifications(user?.id, selectedChannel?.id);

  // Callback for new message notifications
  const handleNewMessageNotification = useCallback((message) => {
    // Find channel info for the notification (use raw hook data, not resolved names)
    const allChannels = [...realtimeChannels, ...realtimeDMs, ...realtimeSupportChannels];
    const channel = allChannels.find(c => c.id === message.channel_id);
    notifyNewMessage(message, channel);
  }, [realtimeChannels, realtimeDMs, realtimeSupportChannels, notifyNewMessage]);

  // Realtime messages subscription (changes when selectedChannel changes)
  const {
    messages: realtimeMessages,
    setMessages,
    loading: messagesLoading,
    loadingMore: messagesLoadingMore,
    hasMore: hasMoreMessages,
    isConnected: messagesConnected,
    sendMessage: rtSendMessage,
    reactToMessage: rtReactToMessage,
    editMessage: rtEditMessage,
    deleteMessage: rtDeleteMessage,
    pinMessage: rtPinMessage,
    loadOlderMessages,
    pinnedMessages,
  } = useRealtimeMessages(selectedChannel?.id, user?.id, {
    onNewMessage: handleNewMessageNotification,
  });

  // Thread state
  const [activeThread, setActiveThread] = useState(null);

  // Realtime thread subscription
  const {
    replies: threadMessages,
    loading: threadLoading,
    sendReply: rtSendReply,
  } = useRealtimeThreads(activeThread?.id, user?.id);

  // Typing indicator for current channel
  const {
    typingUsers,
    startTyping,
    stopTyping,
    getTypingText,
  } = useTypingIndicator(selectedChannel?.id, user);

  // Read receipts for messages
  const {
    markAsRead,
    markMultipleAsRead,
    getMessageReaders,
    getReadStatusText,
  } = useReadReceipts(selectedChannel?.id, user, realtimeMessages);

  // Bookmarks
  const {
    bookmarks,
    toggleBookmark,
    isBookmarked,
    removeBookmark,
    loading: bookmarksLoading,
  } = useBookmarks(user?.id);

  // Moderation (rate limiting, mutes)
  const {
    isMuted,
    rateLimits,
    checkRateLimit,
    slowmodeSeconds,
    deleteMessage: deleteMessageAsModerator,
  } = useModeration(selectedChannel?.id, user?.id);

  // Forward message modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  // Team members (still loaded once)
  const [teamMembers, setTeamMembers] = useState([]);

  // Resolve DM display names to show the OTHER person's name (not your own)
  const resolvedDMs = useMemo(() => {
    if (!user?.id) return realtimeDMs;
    return realtimeDMs.map(dm => {
      const otherMemberId = dm.members?.find(id => id !== user.id);
      if (!otherMemberId) return dm;
      const otherMember = teamMembers.find(m => m.id === otherMemberId);
      if (!otherMember) return dm;
      return { ...dm, name: otherMember.full_name || otherMember.email || dm.name };
    });
  }, [realtimeDMs, user?.id, teamMembers]);

  // Display name for selected channel (for DMs, show the other person's name)
  const selectedChannelDisplayName = useMemo(() => {
    if (!selectedChannel) return '';
    if (selectedChannel.type !== 'dm') return selectedChannel.name;
    const otherMemberId = selectedChannel.members?.find(id => id !== user?.id);
    const otherMember = teamMembers.find(m => m.id === otherMemberId);
    return otherMember?.full_name || otherMember?.email || selectedChannel.name;
  }, [selectedChannel, user?.id, teamMembers]);

  // Database-backed unread tracking (syncs across devices)
  const {
    unreadCounts,
    totalUnread,
    hasMentions,
    markChannelRead,
    initializeChannelStatus,
    isConnected: unreadConnected,
  } = useRealtimeUnread(user?.id);

  // UI State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Channel settings panel state
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);
  const [settingsChannel, setSettingsChannel] = useState(null);

  // Feature modal states
  const [showUniversalSearch, setShowUniversalSearch] = useState(false);
  const [showGuestInvite, setShowGuestInvite] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  // Video call hook
  const videoCall = useVideoCall(user?.id, user?.company_id);

  // Mobile UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Connection status - for special channels (mentions, saved, threads), don't require message subscription
  const isSpecialChannel = selectedChannel?.type === 'special';
  const isConnected = isSpecialChannel
    ? (channelsConnected && unreadConnected)
    : (channelsConnected && messagesConnected && unreadConnected);

  // Refs for anime.js animations

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }
      if (cmdKey && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        setShowUniversalSearch(true);
      }
      if (cmdKey && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        setShowCreateChannel(true);
      }
      if (cmdKey && e.shiftKey && e.key === 'k') {
        e.preventDefault();
        setShowNewDM(true);
      }
      if (e.key === 'Escape') {
        setActivePanel(null);
        setShowKeyboardShortcuts(false);
        setShowUniversalSearch(false);
        setActiveThread(null);
        setMobileMenuOpen(false);
        setChannelSettingsOpen(false);
        setSettingsChannel(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load team members once (realtime handles channels/messages)
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!user) return;
      try {
        const usersResponse = await db.functions.invoke('getTeamMembers');
        const team = (usersResponse?.data?.users || []).filter(u => u.id !== user?.id);
        setTeamMembers(team);
      } catch (e) {
        console.warn('getTeamMembers not available:', e.message);
      }
    };
    loadTeamMembers();
  }, [user]);

  // Load DM partner profiles that aren't in teamMembers (cross-org users)
  useEffect(() => {
    if (!user?.id || realtimeDMs.length === 0) return;
    const missingIds = realtimeDMs
      .map(dm => dm.members?.find(id => id !== user.id))
      .filter(id => id && !teamMembers.some(m => m.id === id));
    if (missingIds.length === 0) return;
    const uniqueIds = [...new Set(missingIds)];
    supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', uniqueIds)
      .then(({ data }) => {
        if (data?.length) {
          setTeamMembers(prev => [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]);
        }
      });
  }, [user?.id, realtimeDMs, teamMembers.length]);

  // Auto-select first channel when channels load
  useEffect(() => {
    if (!selectedChannel && realtimeChannels.length > 0) {
      const general = realtimeChannels.find(c => c.name === 'general');
      setSelectedChannel(general || realtimeChannels[0]);
    }
  }, [realtimeChannels, selectedChannel]);

  // Create default channels if none exist
  useEffect(() => {
    const createDefaultChannels = async () => {
      if (!channelsLoading && realtimeChannels.length === 0 && user) {
        const defaultChannels = [
          { name: 'general', description: 'General discussions', type: 'public' },
          { name: 'random', description: 'Random stuff', type: 'public' },
          { name: 'announcements', description: 'Important announcements', type: 'public' }
        ];
        for (const ch of defaultChannels) {
          await rtCreateChannel(ch);
        }
      }
    };
    createDefaultChannels();
  }, [channelsLoading, realtimeChannels.length, user, rtCreateChannel]);

  // Auto-create support channel for each user (once)
  const supportChannelCreatedRef = useRef(false);
  useEffect(() => {
    const ensureSupportChannel = async () => {
      if (channelsLoading || !user || supportChannelCreatedRef.current) return;
      if (realtimeSupportChannels.some(c => c.user_id === user.id)) return;
      supportChannelCreatedRef.current = true;
      try {
        await supabase.from('channels').insert({
          name: `Support - ${user.full_name || user.email}`,
          type: 'support',
          user_id: user.id,
          members: [user.id],
          last_message_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to create support channel:', e);
      }
    };
    ensureSupportChannel();
  }, [channelsLoading, user, realtimeSupportChannels]);

  // For admins: load ALL support channels (not just their own)
  const [allSupportChannels, setAllSupportChannels] = useState([]);
  useEffect(() => {
    if (!isAdmin || !user) return;
    const loadAllSupport = async () => {
      try {
        const { data } = await supabase
          .from('channels')
          .select('*')
          .eq('type', 'support')
          .eq('is_archived', false)
          .order('last_message_at', { ascending: false, nullsFirst: false });
        setAllSupportChannels(data || []);
      } catch (e) {
        console.warn('Failed to load support channels:', e);
      }
    };
    loadAllSupport();

    // Subscribe to support channel changes for admins
    const sub = supabase.channel('admin:support-channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, (payload) => {
        const ch = payload.new;
        if (payload.eventType === 'DELETE') {
          setAllSupportChannels(prev => prev.filter(c => c.id !== payload.old.id));
          return;
        }
        if (ch?.type !== 'support') return;
        if (ch.is_archived) {
          setAllSupportChannels(prev => prev.filter(c => c.id !== ch.id));
          return;
        }
        setAllSupportChannels(prev => {
          const exists = prev.some(c => c.id === ch.id);
          if (exists) return prev.map(c => c.id === ch.id ? ch : c);
          return [ch, ...prev];
        });
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [isAdmin, user]);

  // Merge support channels: admins see all, regular users see their own
  const supportChannels = useMemo(() => {
    if (isAdmin) return allSupportChannels;
    return realtimeSupportChannels;
  }, [isAdmin, allSupportChannels, realtimeSupportChannels]);

  // Resolve support channel names for admins (show the user's name, not "Support - X")
  const resolvedSupportChannels = useMemo(() => {
    return supportChannels.map(ch => {
      // For the current user's own support channel, show "My Support"
      if (ch.user_id === user?.id) return { ...ch, name: 'My Support' };
      // For admin viewing other users' channels, use the stored name
      return ch;
    });
  }, [supportChannels, user?.id]);

  // Track which channels we've marked as read to avoid re-calling
  const markedReadRef = useRef(new Set());

  // Mark channel as read when selected (only once per channel selection)
  useEffect(() => {
    if (selectedChannel?.id && selectedChannel.type !== 'special') {
      // Avoid marking the same channel repeatedly
      if (markedReadRef.current.has(selectedChannel.id)) return;
      markedReadRef.current.add(selectedChannel.id);

      // Initialize read status for this channel (creates record if none exists)
      initializeChannelStatus(selectedChannel.id);
      // Mark as read using database-backed function
      markChannelRead(selectedChannel.id, null);
    }
  }, [selectedChannel?.id, selectedChannel?.type, markChannelRead, initializeChannelStatus]);

  // Clear tracked read status when channel changes (allow marking read again if user comes back)
  useEffect(() => {
    // Reset tracked channels except current one
    markedReadRef.current = new Set(selectedChannel?.id ? [selectedChannel.id] : []);
  }, [selectedChannel?.id]);

  // Mark visible messages as read for read receipts (debounced, only on channel change)
  const lastMarkedMessagesRef = useRef(new Set());
  useEffect(() => {
    if (!selectedChannel?.id || selectedChannel.type === 'special' || !user?.id) return;
    if (realtimeMessages.length === 0) return;

    // Get message IDs that aren't from the current user and haven't been marked yet
    const otherUserMessageIds = realtimeMessages
      .filter(m => m.sender_id !== user.id && !lastMarkedMessagesRef.current.has(m.id))
      .map(m => m.id);

    if (otherUserMessageIds.length > 0) {
      // Add to tracked set before calling to avoid duplicate calls
      otherUserMessageIds.forEach(id => lastMarkedMessagesRef.current.add(id));
      markMultipleAsRead(otherUserMessageIds);
    }
  }, [selectedChannel?.id, selectedChannel?.type, user?.id, realtimeMessages.length, markMultipleAsRead]);

  // Load inline thread replies (uses realtime hook for side panel)
  const loadInlineReplies = useCallback(async (parentMessageId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', parentMessageId)
        .order('created_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to load inline replies:', error);
      return [];
    }
  }, []);

  // Extract mentions from content (moved before sendInlineReply to fix initialization order)
  const extractMentions = useCallback((content) => {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUser = teamMembers.find(u =>
        u.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) mentions.push(mentionedUser.id);
    }
    return mentions;
  }, [teamMembers]);

  // Send inline reply (uses realtime - returns the new reply)
  const sendInlineReply = useCallback(async (parentMessageId, content) => {
    if (!selectedChannel || !user) return null;

    try {
      const newReply = await rtSendReply(content, {
        channelId: selectedChannel.id,
        sender_name: user.full_name || user.email,
        sender_avatar: user.avatar_url,
        mentions: extractMentions(content)
      });
      return newReply;
    } catch (error) {
      console.error('Failed to send inline reply:', error);
      throw error;
    }
  }, [selectedChannel, user, extractMentions, rtSendReply]);

  // Handle agent mention
  const handleAgentMention = useCallback(async (agentType, content, replyToMessageId) => {
    const agent = AVAILABLE_AGENTS[agentType];
    if (!agent || !selectedChannel || !user) return;

    const prompt = extractAgentPrompt(content, agentType);

    const typingMessage = {
      id: `typing_${agentType}_${Date.now()}`,
      channel_id: selectedChannel.id,
      sender_id: `agent_${agentType}`,
      sender_name: `${user.full_name}'s ${agent.displayName}`,
      content: '...',
      type: 'agent',
      agent_type: agentType,
      agent_owner_id: user.id,
      agent_owner_name: user.full_name,
      created_date: new Date().toISOString(),
      isTyping: true
    };

    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await invokeAgentForChat(agentType, prompt, user, {
        channelId: selectedChannel.id,
        channelName: selectedChannel.name
      });

      setMessages(prev => prev.filter(m => m.id !== typingMessage.id));

      const agentMessage = await db.entities.Message.create({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        sender_name: `${user.full_name}'s ${agent.displayName}`,
        sender_avatar: user.avatar_url,
        content: response.content,
        type: 'agent',
        agent_type: agentType,
        agent_owner_id: user.id,
        agent_owner_name: user.full_name,
        reply_to_message_id: replyToMessageId
      });

      setMessages(prev => [...prev, agentMessage]);

    } catch (error) {
      console.error('Agent invocation failed:', error);

      setMessages(prev => prev.filter(m => m.id !== typingMessage.id));

      const errorMessage = await db.entities.Message.create({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        sender_name: `${user.full_name}'s ${agent.displayName}`,
        content: `Sorry, I couldn't process that request. Please try again.`,
        type: 'agent',
        agent_type: agentType,
        agent_owner_id: user.id,
        agent_owner_name: user.full_name
      });

      setMessages(prev => [...prev, errorMessage]);
    }
  }, [selectedChannel, user]);

  // Send message (uses realtime hook)
  const handleSendMessage = useCallback(async (messageData) => {
    if (!selectedChannel || !user) return;

    try {
      // Use realtime hook to send message
      const newMessage = await rtSendMessage({
        content: messageData.content,
        type: messageData.type || 'text',
        file_url: messageData.file_url,
        file_name: messageData.file_name,
        thread_id: messageData.thread_id || null,
        mentions: extractMentions(messageData.content),
        sender_name: user.full_name || user.email,
        sender_avatar: user.avatar_url,
      });

      // Check for agent mentions
      const agentMentions = detectAgentMentions(messageData.content);
      if (agentMentions.length > 0) {
        for (const mention of agentMentions) {
          handleAgentMention(mention.agentType, messageData.content, newMessage.id);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  }, [selectedChannel, user, extractMentions, handleAgentMention, rtSendMessage]);

  // React to message (uses realtime hook)
  const handleReact = useCallback(async (messageId, emoji) => {
    if (!user) return;
    await rtReactToMessage(messageId, emoji, user.id);
  }, [user, rtReactToMessage]);

  // Edit message (uses realtime hook)
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    try {
      await rtEditMessage(messageId, newContent);
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  }, [rtEditMessage]);

  // Delete message (uses realtime hook)
  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      await rtDeleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  }, [rtDeleteMessage]);

  // Pin message (uses realtime hook)
  const handlePinMessage = useCallback(async (messageId) => {
    await rtPinMessage(messageId);
  }, [rtPinMessage]);

  // Open thread (realtime subscription activates when activeThread changes)
  const handleOpenThread = useCallback((message) => {
    setActiveThread(message);
  }, []);

  // Create channel (uses realtime hook)
  const handleCreateChannel = useCallback(async (channelData) => {
    if (!user) {
      toast.error('You must be logged in to create a channel');
      return;
    }

    try {
      const newChannel = await rtCreateChannel(channelData);
      setSelectedChannel(newChannel);
      return newChannel;
    } catch (error) {
      console.error('[Inbox] Failed to create channel:', error);
      throw error;
    }
  }, [user, rtCreateChannel]);

  // Create DM (uses realtime hook)
  const handleCreateDM = useCallback(async (targetUser) => {
    const existingDM = resolvedDMs.find(dm =>
      dm.members?.includes(targetUser.id) && dm.members?.includes(user?.id)
    );

    if (existingDM) {
      setSelectedChannel(existingDM);
      return;
    }

    try {
      const newDM = await rtCreateDM(targetUser);
      setSelectedChannel(newDM);
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  }, [user, resolvedDMs, rtCreateDM]);

  // Archive channel (uses realtime hook)
  const handleArchiveChannel = useCallback(async (channel) => {
    try {
      await rtArchiveChannel(channel.id);
      if (selectedChannel?.id === channel.id) {
        setSelectedChannel(realtimeChannels.find(c => c.id !== channel.id) || null);
      }
    } catch (error) {
      console.error('Failed to archive channel:', error);
    }
  }, [selectedChannel, realtimeChannels, rtArchiveChannel]);

  // Delete channel (with dialog)
  const handleDeleteChannelClick = useCallback((channel) => {
    setChannelToDelete(channel);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!channelToDelete) return;

    setIsDeleting(true);
    try {
      await rtDeleteChannel(channelToDelete.id);
      if (selectedChannel?.id === channelToDelete.id) {
        setSelectedChannel(realtimeChannels.find(c => c.id !== channelToDelete.id) || null);
      }
      setActivePanel(null);
      toast.success(`Channel #${channelToDelete.name} deleted`);
    } catch (error) {
      console.error('Failed to delete channel:', error);
      toast.error('Failed to delete channel');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setChannelToDelete(null);
    }
  }, [channelToDelete, selectedChannel, realtimeChannels, rtDeleteChannel]);

  // Update channel (uses realtime hook)
  const handleUpdateChannel = useCallback(async (updates) => {
    if (!selectedChannel) return;
    try {
      await rtUpdateChannel(selectedChannel.id, updates);
      setSelectedChannel(prev => ({ ...prev, ...updates }));
      toast.success('Channel updated');
    } catch (error) {
      console.error('Failed to update channel:', error);
      toast.error('Failed to update channel');
    }
  }, [selectedChannel, rtUpdateChannel]);

  // Open channel settings panel
  const handleOpenChannelSettings = useCallback((channel) => {
    setSettingsChannel(channel);
    setChannelSettingsOpen(true);
  }, []);

  // Helpers
  const getChannelMembers = useCallback(() => {
    if (!selectedChannel) return [];
    if (selectedChannel.type === 'dm') {
      return teamMembers.filter(m => selectedChannel.members?.includes(m.id));
    }
    return [user, ...teamMembers].filter(Boolean);
  }, [selectedChannel, teamMembers, user]);

  // pinnedMessages is provided by the realtime hook now

  const togglePanel = useCallback((panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  // Handle channel selection (closes mobile menu on mobile)
  const handleSelectChannel = useCallback((channel) => {
    setSelectedChannel(channel);
    setMobileMenuOpen(false);
  }, []);

  // Handle poll submission
  const handlePollSubmit = useCallback(async (pollData) => {
    if (!selectedChannel || !user) return;
    try {
      await rtSendMessage({
        content: `📊 **Poll: ${pollData.question}**`,
        type: 'text',
        sender_name: user.full_name || user.email,
        sender_avatar: user.avatar_url,
        mentions: [],
        metadata: {
          message_format: 'poll',
          poll: {
            question: pollData.question,
            options: pollData.options.filter(o => o.trim()).map((text, i) => ({ id: String(i), text, votes: [] })),
            multi_select: pollData.multiSelect,
            expires_at: pollData.deadline || null,
          }
        }
      });
      setShowCreatePoll(false);
      toast.success('Poll created');
    } catch (error) {
      console.error('Failed to create poll:', error);
      toast.error('Failed to create poll');
    }
  }, [selectedChannel, user, rtSendMessage]);

  // Start video call for current channel
  const handleStartCall = useCallback(async () => {
    if (!selectedChannel || !user) return;
    try {
      await videoCall.createCall({
        title: `Call in ${selectedChannel.name || 'DM'}`,
        channelId: selectedChannel.id,
      });
      toast.success('Call started');
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call');
    }
  }, [selectedChannel, user, videoCall]);

  // Get last message from another user (for SmartReply)
  const lastOtherMessage = useMemo(() => {
    if (!user?.id || !realtimeMessages.length) return null;
    for (let i = realtimeMessages.length - 1; i >= 0; i--) {
      if (realtimeMessages[i].sender_id !== user.id) return realtimeMessages[i];
    }
    return null;
  }, [realtimeMessages, user?.id]);

  const headerActions = useMemo(() => [
    { icon: Video, action: handleStartCall, title: 'Start Call' },
    { icon: Users, panel: 'members', title: 'Members' },
    { icon: Pin, panel: 'pinned', title: 'Pinned Messages', highlight: pinnedMessages.length > 0 },
    { icon: Bookmark, panel: 'bookmarks', title: 'Saved Items' },
    { icon: Search, panel: 'search', title: 'Search' },
    { icon: UserPlus, action: () => setShowGuestInvite(true), title: 'Invite Guest' },
    { icon: Info, panel: 'details', title: 'Channel Details' },
  ], [pinnedMessages.length, handleStartCall]);

  // Loading state
  if (channelsLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden relative">
      {/* Communication Hub View Switcher - full width at top */}
      <div className="shrink-0 px-3 sm:px-4 pt-3 pb-2 bg-black border-b border-zinc-800/40">
        <TabBar
          activeTab={activeHubTab}
          onTabChange={(tab) => {
            setActiveHubTab(tab);
            if (tab !== 'chat') setMobileMenuOpen(false);
          }}
        />
      </div>

      {/* Content area: sidebar + main */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Communication Hub Sidebar - Desktop always visible, mobile as drawer */}
        <div
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
            transform transition-transform duration-300 ease-out
            flex flex-col
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ top: mobileMenuOpen ? 0 : undefined }}
        >
          {/* Sidebar content switches based on tab */}
          {activeHubTab === 'chat' ? (
            <ChannelSidebar
            channels={realtimeChannels}
            directMessages={resolvedDMs}
            supportChannels={resolvedSupportChannels}
            selectedChannel={selectedChannel}
            onSelectChannel={handleSelectChannel}
            onCreateChannel={() => setShowCreateChannel(true)}
            onCreateDM={() => setShowNewDM(true)}
            user={user}
            unreadCounts={unreadCounts}
            onArchiveChannel={handleArchiveChannel}
            onDeleteChannel={handleDeleteChannelClick}
            onOpenSettings={() => setShowWorkspaceSettings(true)}
            onOpenChannelSettings={handleOpenChannelSettings}
            isConnected={isConnected}
            onClose={() => setMobileMenuOpen(false)}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="w-[280px] lg:w-[280px] h-full bg-zinc-900/95 border-r border-zinc-800/60 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHubTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                {activeHubTab === 'calendar' && <CalendarSidebarContent />}
                {activeHubTab === 'calls' && <CallsSidebarContent />}
                {activeHubTab === 'phone' && <PhoneSidebarContent />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {activeHubTab !== 'chat' ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHubTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {activeHubTab === 'calendar' && <CalendarMainContent />}
              {activeHubTab === 'calls' && <CallsMainContent />}
              {activeHubTab === 'phone' && <PhoneMainContent />}
            </motion.div>
          </AnimatePresence>
        ) : selectedChannel ? (
          <>
            {/* Channel Header */}
            <header className="h-11 sm:h-12 border-b border-zinc-800/60 px-3 sm:px-5 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {selectedChannel.type === 'special' ? (
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {selectedChannel.id === 'threads' ? (
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                    ) : selectedChannel.id === 'mentions' ? (
                      <AtSign className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </div>
                ) : selectedChannel.type === 'dm' ? (
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                    {selectedChannel.name?.charAt(0)?.toUpperCase()}
                  </div>
                ) : selectedChannel.type === 'private' ? (
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-medium text-white text-sm truncate">{selectedChannelDisplayName}</h2>
                  {selectedChannel.description && (
                    <p className="text-[11px] text-zinc-500 max-w-[150px] sm:max-w-md truncate hidden sm:block">{selectedChannel.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                {selectedChannel.type !== 'special' && headerActions.map((item, index) => (
                  <button
                    key={item.panel || item.title}
                    onClick={() => item.action ? item.action() : togglePanel(item.panel)}
                    className={`p-1.5 rounded-md transition-all ${
                      item.panel && activePanel === item.panel
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
                    } ${index >= 3 ? 'hidden sm:block' : ''}`}
                    title={item.title}
                  >
                    <item.icon className="w-4 h-4" />
                  </button>
                ))}

                <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block" />

                {/* Notification toggle */}
                {notificationsSupported && (
                  <button
                    onClick={async () => {
                      if (notificationPermission === 'granted') {
                        toast.info('Notifications are enabled');
                      } else if (notificationPermission === 'denied') {
                        toast.error('Notifications are blocked. Please enable them in browser settings.');
                      } else {
                        const granted = await requestNotificationPermission();
                        if (granted) {
                          toast.success('Notifications enabled!');
                        }
                      }
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      notificationPermission === 'granted'
                        ? 'text-cyan-400 hover:bg-zinc-800/80'
                        : notificationPermission === 'denied'
                        ? 'text-red-400/60 hover:bg-zinc-800/80'
                        : 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
                    }`}
                    title={
                      notificationPermission === 'granted'
                        ? 'Notifications enabled'
                        : notificationPermission === 'denied'
                        ? 'Notifications blocked'
                        : 'Enable notifications'
                    }
                  >
                    {notificationPermission === 'granted' ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 transition-all hidden sm:block"
                  title="Keyboard shortcuts (⌘/)"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Connection Status Indicator */}
            {!isConnected && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-600/90 text-white text-sm font-medium rounded-full shadow-lg">
                  <WifiOff className="w-4 h-4" />
                  Reconnecting...
                </div>
              </div>
            )}

            {/* Messages (realtime with pagination) */}
            <MessageList
              messages={realtimeMessages}
              currentUserId={user?.id}
              currentUser={user}
              teamMembers={teamMembers}
              onReply={handleOpenThread}
              onReact={handleReact}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onPin={handlePinMessage}
              onOpenThread={handleOpenThread}
              onLoadReplies={loadInlineReplies}
              onSendReply={sendInlineReply}
              isLoading={messagesLoading}
              isLoadingMore={messagesLoadingMore}
              hasMore={hasMoreMessages}
              onLoadMore={loadOlderMessages}
              getMessageReaders={getMessageReaders}
              getReadStatusText={getReadStatusText}
              onBookmark={toggleBookmark}
              onForward={(msg) => {
                setMessageToForward({ ...msg, channel_name: selectedChannel?.name });
                setShowForwardModal(true);
              }}
              isBookmarked={isBookmarked}
            />

            {/* Smart Reply suggestions + Message Input - hide for special views */}
            {selectedChannel.type !== 'special' && (
              <div>
                {/* Smart Reply pills */}
                <SmartReply
                  lastMessage={lastOtherMessage}
                  onSelectReply={(text) => {
                    // Insert the smart reply text into the message input
                    // We'll use a ref-based approach or just send directly
                    handleSendMessage({ content: text, type: 'text' });
                  }}
                  onDismiss={() => {}}
                />

                {/* Quick action bar: Poll + Briefing */}
                <div className="flex items-center gap-1 px-3 sm:px-5 py-1">
                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 rounded-md transition-colors"
                    title="Create Poll"
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Poll</span>
                  </button>
                  <button
                    onClick={() => setShowBriefing(true)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 rounded-md transition-colors"
                    title="Sync Briefing"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Briefing</span>
                  </button>
                </div>

                <MessageInput
                  channelName={selectedChannel.type === 'dm' ? selectedChannelDisplayName : selectedChannel.name}
                  channelId={selectedChannel.id}
                  onSend={handleSendMessage}
                  members={[user, ...teamMembers].filter(Boolean)}
                  channels={realtimeChannels}
                  onTyping={startTyping}
                  onStopTyping={stopTyping}
                  typingText={getTypingText()}
                  typingUsers={typingUsers}
                  isMuted={isMuted}
                  rateLimits={rateLimits}
                  checkRateLimit={checkRateLimit}
                  slowmodeSeconds={slowmodeSeconds}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              {/* Mobile Menu Button for empty state */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden mb-6 mx-auto flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
              >
                <Menu className="w-5 h-5" />
                <span>Open Channels</span>
              </button>

              <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <InboxIcon className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-white font-medium">Select a channel</p>
              <p className="text-sm text-zinc-500 mt-1">
                Pick a channel from the sidebar or start a new conversation.
              </p>
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create Channel
                </button>
                <button
                  onClick={() => setShowNewDM(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors border border-zinc-700"
                >
                  Start DM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Panels */}
      <AnimatePresence>
        {activeThread && (
          <ThreadPanel
            parentMessage={activeThread}
            replies={threadMessages}
            currentUserId={user?.id}
            channelName={selectedChannel?.name}
            onClose={() => setActiveThread(null)}
            onSendReply={(messageData) => rtSendReply(messageData.content, {
              channelId: selectedChannel?.id,
              sender_name: user?.full_name || user?.email,
              sender_avatar: user?.avatar_url,
              mentions: extractMentions(messageData.content)
            })}
            onReact={handleReact}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onPin={handlePinMessage}
            isLoading={threadLoading}
          />
        )}

        {activePanel === 'members' && (
          <MembersPanel
            channel={selectedChannel}
            members={getChannelMembers()}
            currentUserId={user?.id}
            onClose={() => setActivePanel(null)}
            onStartDM={async (member) => {
              setActivePanel(null);
              await handleCreateDM(member);
            }}
          />
        )}

        {activePanel === 'pinned' && (
          <PinnedMessagesPanel
            pinnedMessages={pinnedMessages}
            onClose={() => setActivePanel(null)}
            onJumpToMessage={() => setActivePanel(null)}
          />
        )}

        {activePanel === 'search' && (
          <SearchPanel
            channelId={selectedChannel?.id}
            onClose={() => setActivePanel(null)}
            onJumpToMessage={() => setActivePanel(null)}
          />
        )}

        {activePanel === 'bookmarks' && (
          <BookmarksPanel
            bookmarks={bookmarks}
            loading={bookmarksLoading}
            onClose={() => setActivePanel(null)}
            onRemoveBookmark={removeBookmark}
            onJumpToMessage={(bookmark) => {
              // Find channel and select it
              const channel = [...realtimeChannels, ...resolvedDMs].find(c => c.id === bookmark.channel_id);
              if (channel) {
                setSelectedChannel(channel);
              }
              setActivePanel(null);
            }}
          />
        )}

        {activePanel === 'details' && (
          <ChannelDetailsPanel
            channel={selectedChannel}
            memberCount={getChannelMembers().length}
            messageCount={realtimeMessages.length}
            isOwner={selectedChannel?.user_id === user?.id}
            currentUserId={user?.id}
            onClose={() => setActivePanel(null)}
            onUpdateChannel={handleUpdateChannel}
            onArchiveChannel={(ch) => {
              handleArchiveChannel(ch);
              setActivePanel(null);
            }}
            onDeleteChannel={handleDeleteChannelClick}
          />
        )}

        {channelSettingsOpen && settingsChannel && (
          <ChannelSettingsPanel
            channel={settingsChannel}
            onClose={() => {
              setChannelSettingsOpen(false);
              setSettingsChannel(null);
            }}
            onUpdateChannel={(updates) => {
              handleUpdateChannel(updates);
              // Also update the settings channel locally
              setSettingsChannel(prev => ({ ...prev, ...updates }));
            }}
            onArchiveChannel={handleArchiveChannel}
            onDeleteChannel={handleDeleteChannelClick}
            user={user}
            teamMembers={teamMembers}
          />
        )}
      </AnimatePresence>
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={handleCreateChannel}
        teamMembers={teamMembers}
      />

      <NewDMModal
        open={showNewDM}
        onClose={() => setShowNewDM(false)}
        onCreate={handleCreateDM}
        currentUserId={user?.id}
      />

      <WorkspaceSettingsModal
        isOpen={showWorkspaceSettings}
        onClose={() => setShowWorkspaceSettings(false)}
        user={user}
      />

      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      <DeleteChannelDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setChannelToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        channel={channelToDelete}
        isDeleting={isDeleting}
      />

      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setMessageToForward(null);
        }}
        message={messageToForward}
        channels={realtimeChannels}
        directMessages={resolvedDMs}
        currentUser={user}
      />

      {/* Universal Search (Cmd+K) */}
      <UniversalSearch
        open={showUniversalSearch}
        onClose={() => setShowUniversalSearch(false)}
        onResultSelect={(result) => {
          setShowUniversalSearch(false);
          // Navigate to the result's channel/message
          if (result?.channel_id) {
            const channel = [...realtimeChannels, ...resolvedDMs].find(c => c.id === result.channel_id);
            if (channel) setSelectedChannel(channel);
          }
        }}
      />

      {/* Guest Invite Modal */}
      <GuestInviteModal
        open={showGuestInvite}
        onClose={() => setShowGuestInvite(false)}
        channel={selectedChannel}
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
        onSubmit={handlePollSubmit}
      />

      {/* Sync Morning Briefing Overlay */}
      <AnimatePresence>
        {showBriefing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBriefing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800/60 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SyncBriefing />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Call Room overlay */}
      {videoCall.isInCall && (
        <div className="fixed inset-0 z-[70] bg-black">
          <VideoCallRoom
            call={videoCall.currentCall}
            participants={videoCall.participants}
            isMuted={videoCall.isMuted}
            isCameraOff={videoCall.isCameraOff}
            isScreenSharing={videoCall.isScreenSharing}
            onToggleMute={() => videoCall.toggleMute()}
            onToggleCamera={() => videoCall.toggleCamera()}
            onToggleScreen={() => videoCall.toggleScreenShare()}
            onLeave={() => videoCall.leaveCall()}
            onEndCall={() => videoCall.endCall()}
          />
        </div>
      )}

      {/* Call banner (shown when active call exists in channel) */}
      {videoCall.currentCall && !videoCall.isInCall && (
        <CallBanner
          title={videoCall.currentCall.title || 'Video call in progress'}
          participantCount={videoCall.participants.length}
          onJoin={() => videoCall.joinCall(videoCall.currentCall.id)}
        />
      )}
    </div>
  );
}