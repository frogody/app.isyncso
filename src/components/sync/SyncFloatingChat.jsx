/**
 * SyncFloatingChat
 * Compact floating chat widget for quick interactions with SYNC
 * Appears in bottom-right corner when triggered from sidebar avatar
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Maximize2, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import SyncAvatarMini from '@/components/icons/SyncAvatarMini';
import { useTheme } from '@/contexts/GlobalThemeContext';

// Generate unique session ID
const generateSessionId = () => `floating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function SyncFloatingChat({ isOpen, onClose, onExpandToFullPage, onStartVoice }) {
  const { user } = useUser();
  const syncState = useSyncState();
  const { syt } = useTheme();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey! How can I help?", ts: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Send message to SYNC
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage, ts: Date.now() }]);
    setIsSending(true);
    syncState.setProcessing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: userMessage,
            sessionId,
            stream: false,
            context: {
              userId: user?.id,
              companyId: user?.company_id,
              source: 'floating-chat',
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Update sync state based on response
      if (data.delegatedTo) {
        syncState.setActiveAgent(data.delegatedTo);
      }
      if (data.actionExecuted) {
        syncState.triggerSuccess();
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.response || data.message || "I've processed that for you.",
        ts: Date.now(),
        action: data.actionExecuted,
      }]);

    } catch (error) {
      console.error('SYNC error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Sorry, I couldn't process that. Try again?",
        ts: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsSending(false);
      syncState.setProcessing(false);
      syncState.setActiveAgent(null);
    }
  }, [input, isSending, sessionId, user, syncState]);

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-[380px] h-[500px] flex flex-col backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden",
            syt('bg-white/95 border border-slate-200', 'bg-zinc-900/95 border border-zinc-700/50')
          )}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.1)',
          }}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-b",
            syt('border-slate-200 bg-white/80', 'border-zinc-800/50 bg-zinc-900/80')
          )}>
            <div className="flex items-center gap-3">
              <SyncAvatarMini size={36} />
              <div>
                <h3 className={cn("text-sm font-semibold", syt('text-slate-900', 'text-white'))}>SYNC</h3>
                <p className={cn("text-xs", syt('text-slate-400', 'text-zinc-500'))}>AI Orchestrator</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onStartVoice}
                className={cn(
                  "p-2 rounded-lg hover:text-purple-400 transition-colors",
                  syt('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800/50')
                )}
                title="Voice mode"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={onExpandToFullPage}
                className={cn(
                  "p-2 rounded-lg hover:text-cyan-400 transition-colors",
                  syt('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800/50')
                )}
                title="Open full page"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  syt('text-slate-500 hover:text-slate-900 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-zinc-800/50')
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                    msg.role === 'user'
                      ? "bg-cyan-500/20 text-cyan-100 rounded-br-sm"
                      : msg.isError
                        ? "bg-red-500/10 text-red-300 border border-red-500/20"
                        : cn(syt('bg-slate-100/80 text-slate-700', 'bg-zinc-800/80 text-zinc-200'), "rounded-bl-sm")
                  )}
                >
                  <ReactMarkdown
                    className={cn(
                      "prose prose-sm max-w-none [&>p]:m-0 [&>p]:leading-relaxed",
                      syt('prose-slate', 'prose-invert')
                    )}
                  >
                    {msg.text}
                  </ReactMarkdown>
                  {msg.action && (
                    <div className={cn(
                      "mt-2 pt-2 border-t text-xs",
                      syt('border-slate-300/50 text-slate-500', 'border-zinc-700/50 text-zinc-400')
                    )}>
                      <span className="text-green-400">&#10003;</span> {msg.action.type?.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn("flex items-center gap-2 text-sm", syt('text-slate-400', 'text-zinc-500'))}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={cn(
            "p-3 border-t",
            syt('border-slate-200 bg-white/80', 'border-zinc-800/50 bg-zinc-900/80')
          )}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask SYNC anything..."
                disabled={isSending}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all disabled:opacity-50",
                  syt(
                    'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400',
                    'bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500'
                  )
                )}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isSending}
                className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className={cn("text-[10px] mt-2 text-center", syt('text-slate-400', 'text-zinc-600'))}>
              Press Enter to send - Esc to close
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
