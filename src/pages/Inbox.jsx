import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import anime from '@/lib/anime-wrapper';
const animate = anime;
const stagger = anime.stagger;
import { prefersReducedMotion } from '@/lib/animations';
import {
  Hash, Lock, Users, Pin, Search, Info,
  Loader2, MessageSquare, Inbox as InboxIcon, Keyboard,
  RefreshCw, AtSign, Bookmark, Wifi, WifiOff, Bell, BellOff,
  Menu, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { db, supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
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

export default function InboxPage() {
  const { user } = useUser();

  // ========================================
  // REALTIME HOOKS (replacing polling)
  // ========================================

  // Realtime channels subscription
  const {
    channels: realtimeChannels,
    directMessages: realtimeDMs,
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
    // Find channel info for the notification
    const allChannels = [...realtimeChannels, ...realtimeDMs];
    const channel = allChannels.find(c => c.id === message.channel_id);
    notifyNewMessage(message, channel);
  }, [realtimeChannels, realtimeDMs, notifyNewMessage]);

  // Realtime messages subscription (changes when selectedChannel changes)
  const {
    messages: realtimeMessages,
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

  // Mobile UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Connection status
  const isConnected = channelsConnected && messagesConnected && unreadConnected;

  // Refs for anime.js animations
  const sidebarRef = useRef(null);
  const mainContentRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
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
        setActiveThread(null);
        setMobileMenuOpen(false);
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
        setTeamMembers((usersResponse?.data?.users || []).filter(u => u.id !== user?.id));
      } catch (e) {
        console.warn('getTeamMembers not available:', e.message);
      }
    };
    loadTeamMembers();
  }, [user]);

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
    const existingDM = realtimeDMs.find(dm =>
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
  }, [user, realtimeDMs, rtCreateDM]);

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

  const headerActions = useMemo(() => [
    { icon: Users, panel: 'members', title: 'Members' },
    { icon: Pin, panel: 'pinned', title: 'Pinned Messages', highlight: pinnedMessages.length > 0 },
    { icon: Search, panel: 'search', title: 'Search' },
    { icon: Info, panel: 'details', title: 'Channel Details' }
  ], [pinnedMessages.length]);

  // Animate sidebar on mount
  useEffect(() => {
    if (channelsLoading || !sidebarRef.current) return;

    // If user prefers reduced motion, just set final state immediately
    if (prefersReducedMotion()) {
      sidebarRef.current.style.opacity = '1';
      return;
    }

    animate({
      targets: sidebarRef.current,
      translateX: [-30, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuart',
    });
  }, [channelsLoading]);

  // Animate main content on mount and channel change
  useEffect(() => {
    if (channelsLoading || !mainContentRef.current) return;

    // If user prefers reduced motion, just set final state immediately
    if (prefersReducedMotion()) {
      mainContentRef.current.style.opacity = '1';
      return;
    }

    animate({
      targets: mainContentRef.current,
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
    });
  }, [channelsLoading, selectedChannel]);

  // Loading state
  if (channelsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Workspace</h2>
          <p className="text-zinc-500">Setting up your channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex overflow-hidden relative">
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

      {/* Channel Sidebar - Desktop always visible, mobile as drawer */}
      <div
        ref={sidebarRef}
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ opacity: 0 }}
      >
        <ChannelSidebar
          channels={realtimeChannels}
          directMessages={realtimeDMs}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={() => setShowCreateChannel(true)}
          onCreateDM={() => setShowNewDM(true)}
          user={user}
          unreadCounts={unreadCounts}
          onArchiveChannel={handleArchiveChannel}
          onDeleteChannel={handleDeleteChannelClick}
          onOpenSettings={() => setShowWorkspaceSettings(true)}
          isConnected={isConnected}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div ref={mainContentRef} className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-zinc-950 via-zinc-950 to-cyan-950/10" style={{ opacity: 0 }}>
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <header className="h-14 sm:h-16 border-b border-zinc-800/50 px-3 sm:px-6 flex items-center justify-between bg-zinc-900/60 backdrop-blur-sm">
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
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                    {selectedChannel.id === 'threads' ? (
                      <MessageSquare className="w-4 h-4 text-zinc-400" />
                    ) : selectedChannel.id === 'mentions' ? (
                      <AtSign className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                ) : selectedChannel.type === 'dm' ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300 flex-shrink-0">
                    {selectedChannel.name?.charAt(0)?.toUpperCase()}
                  </div>
                ) : selectedChannel.type === 'private' ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-white text-base sm:text-lg truncate">{selectedChannel.name}</h2>
                  {selectedChannel.description && (
                    <p className="text-xs text-zinc-500 max-w-[150px] sm:max-w-md truncate hidden sm:block">{selectedChannel.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                {selectedChannel.type !== 'special' && headerActions.map((item, index) => (
                  <button
                    key={item.panel}
                    onClick={() => togglePanel(item.panel)}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                      activePanel === item.panel
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
                    } ${index >= 2 ? 'hidden sm:block' : ''}`}
                    title={item.title}
                  >
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                ))}

                <div className="w-px h-5 sm:h-6 bg-zinc-800 mx-1 sm:mx-2 hidden sm:block" />

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
                    className={`p-1.5 sm:p-2.5 rounded-xl transition-all ${
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
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <BellOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="p-1.5 sm:p-2.5 rounded-xl text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 transition-all hidden sm:block"
                  title="Keyboard shortcuts (⌘/)"
                >
                  <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
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

            {/* Message Input - hide for special views */}
            {selectedChannel.type !== 'special' && (
              <MessageInput
                channelName={selectedChannel.name}
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
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              {/* Mobile Menu Button for empty state */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden mb-6 mx-auto flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
              >
                <Menu className="w-5 h-5" />
                <span>Open Channels</span>
              </button>

              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-cyan-500/10">
                <InboxIcon className="w-10 h-10 sm:w-14 sm:h-14 text-cyan-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Welcome to Team Inbox</h2>
              <p className="text-zinc-400 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                Select a channel from the sidebar or start a new conversation to begin collaborating with your team.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Create Channel
                </button>
                <button
                  onClick={() => setShowNewDM(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-zinc-700"
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
              const channel = [...realtimeChannels, ...realtimeDMs].find(c => c.id === bookmark.channel_id);
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
            messageCount={messages.length}
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
      </AnimatePresence>

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
        directMessages={realtimeDMs}
        currentUser={user}
      />
    </div>
  );
}