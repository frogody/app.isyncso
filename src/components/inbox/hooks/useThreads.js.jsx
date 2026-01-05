import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useThreads(messages, setMessages) {
  const [activeThread, setActiveThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load thread replies
  const loadThreadReplies = useCallback(async (parentMessageId) => {
    setLoading(true);
    try {
      const replies = await base44.entities.Message.filter(
        { thread_id: parentMessageId },
        'created_date',
        50
      );
      setThreadMessages(replies);
    } catch (error) {
      console.error('Failed to load thread:', error);
      toast.error('Failed to load thread replies');
    } finally {
      setLoading(false);
    }
  }, []);

  // Open thread
  const openThread = useCallback((message) => {
    setActiveThread(message);
    loadThreadReplies(message.id);
  }, [loadThreadReplies]);

  // Close thread
  const closeThread = useCallback(() => {
    setActiveThread(null);
    setThreadMessages([]);
  }, []);

  // Send reply to thread
  const sendReply = useCallback(async (messageData, user, channel) => {
    if (!activeThread || !user || !channel) return null;

    try {
      const reply = await base44.entities.Message.create({
        channel_id: channel.id,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_avatar: user.avatar_url,
        content: messageData.content,
        type: messageData.type || 'text',
        file_url: messageData.file_url,
        file_name: messageData.file_name,
        thread_id: activeThread.id
      });

      // Add to thread messages
      setThreadMessages(prev => [...prev, reply]);

      // Update parent message reply count
      const parentMsg = messages.find(m => m.id === activeThread.id);
      if (parentMsg) {
        const newReplyCount = (parentMsg.reply_count || 0) + 1;
        await base44.entities.Message.update(parentMsg.id, {
          reply_count: newReplyCount
        });
        setMessages(prev => prev.map(m =>
          m.id === parentMsg.id
            ? { ...m, reply_count: newReplyCount }
            : m
        ));
        // Update activeThread as well
        setActiveThread(prev => prev ? { ...prev, reply_count: newReplyCount } : null);
      }

      return reply;
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
      throw error;
    }
  }, [activeThread, messages, setMessages]);

  return {
    activeThread,
    threadMessages,
    loading,
    openThread,
    closeThread,
    sendReply,
    refreshThread: () => activeThread && loadThreadReplies(activeThread.id)
  };
}
