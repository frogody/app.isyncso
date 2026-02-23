import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Check, CheckCheck } from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';

export default function OrderMessages({ orderId, clientId, clientName }) {
  const { portalApi } = useWholesale();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!orderId || !clientId) return;
    try {
      const res = await portalApi('getOrderMessages', { orderId, clientId });
      if (res.success) {
        setMessages(res.messages || []);
        // Mark merchant messages as read
        await portalApi('markMessagesRead', { orderId, clientId });
      }
    } catch (err) {
      console.error('[OrderMessages] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, clientId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchMessages();
    // Poll every 15 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await portalApi('sendOrderMessage', {
        orderId,
        clientId,
        message: newMessage.trim(),
        senderType: 'client',
      });
      if (res.success) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (err) {
      console.error('[OrderMessages] send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Messages</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-cyan-400" />
        <h3 className="text-base font-semibold text-white">Messages</h3>
        {messages.length > 0 && (
          <span className="text-xs text-zinc-500 ml-auto">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Messages area */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3" style={{ minHeight: '120px' }}>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No messages yet</p>
            <p className="text-xs text-zinc-600 mt-1">Start a conversation about this order</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.sender_type === 'client';
            return (
              <div
                key={msg.id}
                className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                    isClient
                      ? 'bg-cyan-600/20 border border-cyan-500/20 text-cyan-50'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className={`flex items-center gap-1.5 mt-1 ${isClient ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-zinc-500">{formatTime(msg.created_at)}</span>
                    {isClient && (
                      msg.read_at
                        ? <CheckCheck className="w-3 h-3 text-cyan-400" />
                        : <Check className="w-3 h-3 text-zinc-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/80">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
