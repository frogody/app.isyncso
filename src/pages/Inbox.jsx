import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Lock, Users, Pin, Search, Info,
  Loader2, MessageSquare, Inbox as InboxIcon, Keyboard,
  RefreshCw, AtSign, Bookmark
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/components/context/UserContext';
import {
  detectAgentMentions,
  extractAgentPrompt,
  invokeAgentForChat,
  AVAILABLE_AGENTS
} from '@/components/inbox/AgentMentionHandler';

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

// Constants
const POLL_INTERVAL = 5000;
const UNREAD_STORAGE_KEY = 'inbox_last_read';

export default function InboxPage() {
  const { user } = useUser();

  // Core State
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Loading State
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // UI State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Refs for polling
  const pollIntervalRef = useRef(null);
  const lastMessageTimeRef = useRef(null);
  const lastReadRef = useRef({});

  // Load last read data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(UNREAD_STORAGE_KEY);
      if (stored) lastReadRef.current = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load unread data:', e);
    }
  }, []);

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
        setThreadMessages([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Use service role function to get users (regular users can't list all users)
      const [channelsData, usersResponse] = await Promise.all([
        base44.entities.Channel.list('-last_message_at'),
        base44.functions.invoke('getTeamMembers')
      ]);

      const usersData = usersResponse?.data?.users || [];

      const publicChannels = (channelsData || []).filter(c => c.type !== 'dm' && !c.is_archived);
      const dms = (channelsData || []).filter(c => c.type === 'dm' && !c.is_archived);

      setChannels(publicChannels);
      setDirectMessages(dms);
      setTeamMembers(usersData.filter(u => u.id !== user?.id));

      // Calculate unread counts
      const counts = {};
      [...publicChannels, ...dms].forEach(channel => {
        const lastRead = lastReadRef.current[channel.id];
        if (lastRead && channel.last_message_at) {
          counts[channel.id] = new Date(channel.last_message_at) > new Date(lastRead) ? 1 : 0;
        } else if (!lastRead && channel.last_message_at) {
          counts[channel.id] = 1;
        } else {
          counts[channel.id] = 0;
        }
      });
      setUnreadCounts(counts);

      // Create default channels if none exist
      if (publicChannels.length === 0) {
        const defaultChannels = [
          { name: 'general', description: 'General discussions', type: 'public' },
          { name: 'random', description: 'Random stuff', type: 'public' },
          { name: 'announcements', description: 'Important announcements', type: 'public' }
        ];

        for (const ch of defaultChannels) {
          await base44.entities.Channel.create(ch);
        }

        const newChannels = await base44.entities.Channel.list('-created_date');
        setChannels(newChannels.filter(c => c.type !== 'dm'));

        if (newChannels.length > 0) {
          setSelectedChannel(newChannels.find(c => c.name === 'general') || newChannels[0]);
        }
      } else {
        setSelectedChannel(publicChannels[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Load messages when channel changes
  const loadMessages = useCallback(async (channelId, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      // Handle special views
      if (channelId === 'threads') {
        const allMsgs = await base44.entities.Message.filter({ reply_count: { $gt: 0 } }, '-created_date', 50);
        setMessages(allMsgs);
      } else if (channelId === 'mentions') {
        const mentionedMsgs = await base44.entities.Message.filter({ 
          mentions: { $in: [user?.id] }
        }, '-created_date', 50);
        setMessages(mentionedMsgs);
      } else if (channelId === 'saved') {
        const savedMsgs = await base44.entities.Message.filter({ is_saved: true }, '-created_date', 50);
        setMessages(savedMsgs);
      } else {
        // Regular channel
        const msgs = await base44.entities.Message.filter(
          { channel_id: channelId },
          'created_date',
          100
        );
        const topLevelMessages = msgs.filter(m => !m.thread_id);
        setMessages(topLevelMessages);

        if (topLevelMessages.length > 0) {
          lastMessageTimeRef.current = topLevelMessages[topLevelMessages.length - 1].created_date;
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [user?.id]);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!selectedChannel?.id) return;

    try {
      const msgs = await base44.entities.Message.filter(
        { channel_id: selectedChannel.id },
        '-created_date',
        10
      );

      const topLevel = msgs.filter(m => !m.thread_id);
      if (topLevel.length > 0 && lastMessageTimeRef.current) {
        const latestTime = new Date(topLevel[0].created_date);
        const lastTime = new Date(lastMessageTimeRef.current);

        if (latestTime > lastTime) {
          // New messages available
          setHasNewMessages(true);
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  }, [selectedChannel?.id]);

  // Set up polling
  useEffect(() => {
    if (selectedChannel?.id) {
      loadMessages(selectedChannel.id);
      
      // Only mark as read and poll for regular channels
      if (selectedChannel.type !== 'special') {
        // Mark as read inline to avoid dependency issue
        const now = new Date().toISOString();
        lastReadRef.current[selectedChannel.id] = now;
        try {
          localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(lastReadRef.current));
        } catch (e) {
          console.error('Failed to save unread data:', e);
        }
        setUnreadCounts(prev => ({ ...prev, [selectedChannel.id]: 0 }));
        
        pollIntervalRef.current = setInterval(pollMessages, POLL_INTERVAL);
      }

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [selectedChannel?.id, selectedChannel?.type, loadMessages, pollMessages]);

  // Mark channel as read
  const markAsRead = useCallback((channelId) => {
    const now = new Date().toISOString();
    lastReadRef.current[channelId] = now;

    try {
      localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(lastReadRef.current));
    } catch (e) {
      console.error('Failed to save unread data:', e);
    }

    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
  }, []);

  // Load new messages button handler
  const handleLoadNewMessages = useCallback(() => {
    if (selectedChannel?.id) {
      loadMessages(selectedChannel.id, true);
      setHasNewMessages(false);
    }
  }, [selectedChannel?.id, loadMessages]);

  // Load thread replies (for side panel)
  const loadThreadReplies = useCallback(async (parentMessageId) => {
    try {
      const replies = await base44.entities.Message.filter(
        { thread_id: parentMessageId },
        'created_date',
        50
      );
      setThreadMessages(replies);
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  }, []);

  // Load inline thread replies (returns replies for inline display)
  const loadInlineReplies = useCallback(async (parentMessageId) => {
    try {
      const replies = await base44.entities.Message.filter(
        { thread_id: parentMessageId },
        'created_date',
        50
      );
      return replies;
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

  // Send inline reply (returns the new reply for inline display)
  const sendInlineReply = useCallback(async (parentMessageId, content) => {
    if (!selectedChannel || !user) return null;

    try {
      const newReply = await base44.entities.Message.create({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_avatar: user.avatar_url,
        content: content,
        type: 'text',
        thread_id: parentMessageId,
        mentions: extractMentions(content)
      });

      // Update parent message reply count
      const parentMsg = messages.find(m => m.id === parentMessageId);
      if (parentMsg) {
        await base44.entities.Message.update(parentMessageId, {
          reply_count: (parentMsg.reply_count || 0) + 1
        });
        setMessages(prev => prev.map(m =>
          m.id === parentMessageId
            ? { ...m, reply_count: (m.reply_count || 0) + 1 }
            : m
        ));
      }

      return newReply;
    } catch (error) {
      console.error('Failed to send inline reply:', error);
      throw error;
    }
  }, [selectedChannel, user, messages, extractMentions]);

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

      const agentMessage = await base44.entities.Message.create({
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

      const errorMessage = await base44.entities.Message.create({
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

  // Send message
  const handleSendMessage = useCallback(async (messageData) => {
    if (!selectedChannel || !user) return;

    try {
      const newMessage = await base44.entities.Message.create({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_avatar: user.avatar_url,
        content: messageData.content,
        type: messageData.type || 'text',
        file_url: messageData.file_url,
        file_name: messageData.file_name,
        thread_id: messageData.thread_id || null,
        mentions: extractMentions(messageData.content)
      });

      await base44.entities.Channel.update(selectedChannel.id, {
        last_message_at: new Date().toISOString()
      });

      if (messageData.thread_id) {
        setThreadMessages(prev => [...prev, newMessage]);

        const parentMsg = messages.find(m => m.id === messageData.thread_id);
        if (parentMsg) {
          await base44.entities.Message.update(parentMsg.id, {
            reply_count: (parentMsg.reply_count || 0) + 1
          });
          setMessages(prev => prev.map(m =>
            m.id === parentMsg.id
              ? { ...m, reply_count: (m.reply_count || 0) + 1 }
              : m
          ));
        }
      } else {
        setMessages(prev => [...prev, newMessage]);
        lastMessageTimeRef.current = newMessage.created_date;
      }

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
  }, [selectedChannel, user, messages, extractMentions, handleAgentMention]);

  // React to message
  const handleReact = useCallback(async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !user) return;

    const reactions = { ...(message.reactions || {}) };
    const users = reactions[emoji] || [];

    if (users.includes(user.id)) {
      reactions[emoji] = users.filter(id => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.id];
    }

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, reactions } : m
    ));

    try {
      await base44.entities.Message.update(messageId, { reactions });
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // Revert
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: message.reactions } : m
      ));
    }
  }, [messages, user]);

  // Edit message
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    try {
      await base44.entities.Message.update(messageId, {
        content: newContent,
        is_edited: true
      });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
      ));
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  }, []);

  // Delete message
  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      await base44.entities.Message.delete(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  }, []);

  // Pin message
  const handlePinMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      await base44.entities.Message.update(messageId, {
        is_pinned: !message.is_pinned
      });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m
      ));
      toast.success(message.is_pinned ? 'Message unpinned' : 'Message pinned');
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  }, [messages]);

  // Open thread
  const handleOpenThread = useCallback((message) => {
    setActiveThread(message);
    loadThreadReplies(message.id);
  }, [loadThreadReplies]);

  // Create channel
  const handleCreateChannel = useCallback(async (channelData) => {
    if (!user) {
      toast.error('You must be logged in to create a channel');
      return;
    }

    try {
      console.log('[Inbox] Creating channel:', channelData);

      const newChannel = await base44.entities.Channel.create({
        ...channelData,
        members: channelData.members || [],
        created_by: user?.email,
        last_message_at: new Date().toISOString()
      });

      console.log('[Inbox] Channel created:', newChannel);

      if (!newChannel || !newChannel.id) {
        throw new Error('Channel creation returned invalid response');
      }

      setChannels(prev => [...prev, newChannel]);
      setSelectedChannel(newChannel);

      // Create system message (don't block on this)
      try {
        await base44.entities.Message.create({
          channel_id: newChannel.id,
          sender_id: user.id,
          sender_name: 'System',
          content: `${user.full_name} created this channel`,
          type: 'system'
        });
      } catch (msgError) {
        console.warn('[Inbox] Failed to create system message:', msgError);
        // Don't fail the whole operation for system message
      }

      toast.success(`Channel #${channelData.name} created`);
      return newChannel;
    } catch (error) {
      console.error('[Inbox] Failed to create channel:', error);
      toast.error(`Failed to create channel: ${error.message || 'Unknown error'}`);
      throw error; // Re-throw so caller knows it failed
    }
  }, [user]);

  // Create DM
  const handleCreateDM = useCallback(async (targetUser) => {
    const existingDM = directMessages.find(dm =>
      dm.members?.includes(targetUser.id) && dm.members?.includes(user.id)
    );

    if (existingDM) {
      setSelectedChannel(existingDM);
      return;
    }

    try {
      const newDM = await base44.entities.Channel.create({
        name: targetUser.full_name || targetUser.email,
        type: 'dm',
        members: [user.id, targetUser.id]
      });

      setDirectMessages(prev => [...prev, newDM]);
      setSelectedChannel(newDM);
      toast.success(`Started conversation with ${targetUser.full_name}`);
    } catch (error) {
      console.error('Failed to create DM:', error);
      toast.error('Failed to start conversation');
    }
  }, [user, directMessages]);

  // Archive channel
  const handleArchiveChannel = useCallback(async (channel) => {
    try {
      await base44.entities.Channel.update(channel.id, { is_archived: true });
      setChannels(prev => prev.filter(c => c.id !== channel.id));
      if (selectedChannel?.id === channel.id) {
        setSelectedChannel(channels.find(c => c.id !== channel.id) || null);
      }
      toast.success(`Channel #${channel.name} archived`);
    } catch (error) {
      console.error('Failed to archive channel:', error);
      toast.error('Failed to archive channel');
    }
  }, [selectedChannel, channels]);

  // Delete channel (with dialog)
  const handleDeleteChannelClick = useCallback((channel) => {
    setChannelToDelete(channel);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!channelToDelete) return;

    setIsDeleting(true);
    try {
      await base44.entities.Channel.delete(channelToDelete.id);
      setChannels(prev => prev.filter(c => c.id !== channelToDelete.id));
      if (selectedChannel?.id === channelToDelete.id) {
        setSelectedChannel(channels.find(c => c.id !== channelToDelete.id) || null);
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
  }, [channelToDelete, selectedChannel, channels]);

  // Update channel
  const handleUpdateChannel = useCallback(async (updates) => {
    if (!selectedChannel) return;
    try {
      await base44.entities.Channel.update(selectedChannel.id, updates);
      setChannels(prev => prev.map(c =>
        c.id === selectedChannel.id ? { ...c, ...updates } : c
      ));
      setSelectedChannel(prev => ({ ...prev, ...updates }));
      toast.success('Channel updated');
    } catch (error) {
      console.error('Failed to update channel:', error);
      toast.error('Failed to update channel');
    }
  }, [selectedChannel]);

  // Helpers
  const getChannelMembers = useCallback(() => {
    if (!selectedChannel) return [];
    if (selectedChannel.type === 'dm') {
      return teamMembers.filter(m => selectedChannel.members?.includes(m.id));
    }
    return [user, ...teamMembers].filter(Boolean);
  }, [selectedChannel, teamMembers, user]);

  const pinnedMessages = useMemo(() =>
    messages.filter(m => m.is_pinned),
    [messages]
  );

  const togglePanel = useCallback((panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  const headerActions = useMemo(() => [
    { icon: Users, panel: 'members', title: 'Members' },
    { icon: Pin, panel: 'pinned', title: 'Pinned Messages', highlight: pinnedMessages.length > 0 },
    { icon: Search, panel: 'search', title: 'Search' },
    { icon: Info, panel: 'details', title: 'Channel Details' }
  ], [pinnedMessages.length]);

  // Loading state
  if (loading) {
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
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Channel Sidebar */}
      <ChannelSidebar
        channels={channels}
        directMessages={directMessages}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        onCreateChannel={() => setShowCreateChannel(true)}
        onCreateDM={() => setShowNewDM(true)}
        user={user}
        unreadCounts={unreadCounts}
        onArchiveChannel={handleArchiveChannel}
        onDeleteChannel={handleDeleteChannelClick}
        onOpenSettings={() => setShowWorkspaceSettings(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-zinc-950 via-zinc-950 to-cyan-950/10">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <header className="h-16 border-b border-zinc-800/50 px-6 flex items-center justify-between bg-zinc-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {selectedChannel.type === 'special' ? (
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    {selectedChannel.id === 'threads' ? (
                      <MessageSquare className="w-4 h-4 text-zinc-400" />
                    ) : selectedChannel.id === 'mentions' ? (
                      <AtSign className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                ) : selectedChannel.type === 'dm' ? (
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                    {selectedChannel.name?.charAt(0)?.toUpperCase()}
                  </div>
                ) : selectedChannel.type === 'private' ? (
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-white text-lg">{selectedChannel.name}</h2>
                  {selectedChannel.description && (
                    <p className="text-xs text-zinc-500 max-w-md truncate">{selectedChannel.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {selectedChannel.type !== 'special' && headerActions.map((item) => (
                  <button
                    key={item.panel}
                    onClick={() => togglePanel(item.panel)}
                    className={`p-2 rounded-lg transition-all ${
                      activePanel === item.panel
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
                    }`}
                    title={item.title}
                  >
                    <item.icon className="w-5 h-5" />
                  </button>
                ))}

                <div className="w-px h-6 bg-zinc-800 mx-2" />

                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="p-2.5 rounded-xl text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 transition-all"
                  title="Keyboard shortcuts (⌘/)"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* New Messages Indicator */}
            <AnimatePresence>
              {hasNewMessages && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-20 left-1/2 -translate-x-1/2 z-10"
                >
                  <button
                    onClick={handleLoadNewMessages}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600/90 hover:bg-cyan-500/90 text-white text-sm font-medium rounded-full shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New messages
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <MessageList
              messages={messages}
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
            />

            {/* Message Input - hide for special views */}
            {selectedChannel.type !== 'special' && (
              <MessageInput
                channelName={selectedChannel.name}
                channelId={selectedChannel.id}
                onSend={handleSendMessage}
                members={[user, ...teamMembers].filter(Boolean)}
                channels={channels}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-cyan-500/10">
                <InboxIcon className="w-14 h-14 text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Welcome to Team Inbox</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Select a channel from the sidebar or start a new conversation to begin collaborating with your team.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Create Channel
                </button>
                <button
                  onClick={() => setShowNewDM(true)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-zinc-700"
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
            onClose={() => {
              setActiveThread(null);
              setThreadMessages([]);
            }}
            onSendReply={handleSendMessage}
            onReact={handleReact}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onPin={handlePinMessage}
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

        {activePanel === 'details' && (
          <ChannelDetailsPanel
            channel={selectedChannel}
            memberCount={getChannelMembers().length}
            messageCount={messages.length}
            isOwner={selectedChannel?.created_by === user?.email}
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
    </div>
  );
}