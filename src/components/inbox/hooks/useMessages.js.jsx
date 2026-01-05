import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  detectAgentMentions,
  extractAgentPrompt,
  invokeAgentForChat,
  AVAILABLE_AGENTS
} from '../AgentMentionHandler';

const MESSAGES_PER_PAGE = 100;
const POLL_INTERVAL = 5000; // 5 seconds

export function useMessages(channel, user, teamMembers = []) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastMessageRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const isPollingRef = useRef(false);

  // Load messages for channel
  const loadMessages = useCallback(async (reset = false) => {
    if (!channel?.id) return;

    setLoading(true);
    try {
      const msgs = await base44.entities.Message.filter(
        { channel_id: channel.id },
        'created_date',
        MESSAGES_PER_PAGE
      );
      const topLevelMessages = msgs.filter(m => !m.thread_id);
      setMessages(topLevelMessages);
      setHasMore(msgs.length === MESSAGES_PER_PAGE);

      if (topLevelMessages.length > 0) {
        lastMessageRef.current = topLevelMessages[topLevelMessages.length - 1].created_date;
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [channel?.id]);

  // Poll for new messages
  const pollForNewMessages = useCallback(async () => {
    if (!channel?.id || isPollingRef.current) return;

    isPollingRef.current = true;
    try {
      const msgs = await base44.entities.Message.filter(
        { channel_id: channel.id },
        '-created_date',
        20
      );

      const topLevelMessages = msgs.filter(m => !m.thread_id);

      if (topLevelMessages.length > 0) {
        const latestMessage = topLevelMessages[0];

        // Check if there are new messages
        if (lastMessageRef.current && new Date(latestMessage.created_date) > new Date(lastMessageRef.current)) {
          // Merge new messages
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = topLevelMessages.filter(m => !existingIds.has(m.id));

            if (newMessages.length > 0) {
              lastMessageRef.current = latestMessage.created_date;
              return [...prev, ...newMessages.reverse()];
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [channel?.id]);

  // Start/stop polling
  useEffect(() => {
    if (channel?.id) {
      loadMessages(true);

      // Start polling
      pollIntervalRef.current = setInterval(pollForNewMessages, POLL_INTERVAL);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [channel?.id]);

  // Extract mentions from content
  const extractMentions = useCallback((content) => {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUser = teamMembers.find(u =>
        u.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }
    return mentions;
  }, [teamMembers]);

  // Send message
  const sendMessage = useCallback(async (messageData) => {
    if (!channel || !user) return null;

    try {
      const newMessage = await base44.entities.Message.create({
        channel_id: channel.id,
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

      // Update channel's last message time
      await base44.entities.Channel.update(channel.id, {
        last_message_at: new Date().toISOString()
      });

      // Add to local messages (optimistic update already done, but confirm)
      if (!messageData.thread_id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (!exists) {
            lastMessageRef.current = newMessage.created_date;
            return [...prev, newMessage];
          }
          return prev;
        });
      }

      // Handle agent mentions
      const agentMentions = detectAgentMentions(messageData.content);
      if (agentMentions.length > 0) {
        for (const mention of agentMentions) {
          handleAgentMention(mention.agentType, messageData.content, newMessage.id);
        }
      }

      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  }, [channel, user, extractMentions]);

  // Handle agent mention
  const handleAgentMention = useCallback(async (agentType, content, replyToMessageId) => {
    const agent = AVAILABLE_AGENTS[agentType];
    if (!agent || !channel || !user) return;

    const prompt = extractAgentPrompt(content, agentType);

    // Add typing indicator
    const typingMessage = {
      id: `typing_${agentType}_${Date.now()}`,
      channel_id: channel.id,
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
        channelId: channel.id,
        channelName: channel.name
      });

      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== typingMessage.id));

      // Create agent response
      const agentMessage = await base44.entities.Message.create({
        channel_id: channel.id,
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

      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== typingMessage.id));

      // Add error message
      const errorMessage = await base44.entities.Message.create({
        channel_id: channel.id,
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
  }, [channel, user]);

  // React to message
  const reactToMessage = useCallback(async (messageId, emoji) => {
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
      // Revert on error
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: message.reactions } : m
      ));
    }
  }, [messages, user]);

  // Edit message
  const editMessage = useCallback(async (messageId, newContent) => {
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
      throw error;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await base44.entities.Message.delete(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  }, []);

  // Pin/unpin message
  const pinMessage = useCallback(async (messageId) => {
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
      toast.error('Failed to update message');
      throw error;
    }
  }, [messages]);

  // Get pinned messages
  const pinnedMessages = messages.filter(m => m.is_pinned);

  return {
    messages,
    loading,
    hasMore,
    sendMessage,
    reactToMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    pinnedMessages,
    refreshMessages: loadMessages
  };
}
