/**
 * PortalChatWindow - Chat window for the wholesale portal.
 *
 * Header with title + close, scrollable messages with alignment
 * (client=right, admin=left), message bubbles with timestamps,
 * input bar with send button, auto-scroll. 380px wide, 500px tall.
 * Uses usePortalChat.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import usePortalChat from './usePortalChat';

function MessageBubble({ message, isOwn }) {
  const time = new Date(message.created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'bg-cyan-600 text-white rounded-br-md'
            : 'bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? 'text-cyan-200/60' : 'text-zinc-500'
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

export default function PortalChatWindow({ onClose }) {
  const { client, config } = useWholesale();
  const organizationId = config?.organization_id;
  const clientId = client?.id;

  const { messages, sendMessage, markAsRead, isLoading, isConnected } = usePortalChat({
    clientId,
    organizationId,
  });

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark admin messages as read when window opens
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    await sendMessage(input.trim(), 'client');
    setInput('');
    setSending(false);
    inputRef.current?.focus();
  };

  const storeName = config?.company?.name || config?.name || 'Support';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-24 right-6 z-50 w-[380px] h-[500px] rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <span className="text-xs font-bold text-cyan-400">
              {storeName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{storeName}</h3>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-2.5 h-2.5 text-zinc-500" />
              )}
              <span className={`text-[10px] ${isConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-sm text-zinc-400 mb-1">No messages yet</p>
              <p className="text-xs text-zinc-600">Send a message to get started</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender === 'client'}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-900/80"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </motion.div>
  );
}
