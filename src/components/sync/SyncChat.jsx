/**
 * SyncChat Component
 * Main chat interface for the SYNC orchestrator
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Shield,
  DollarSign,
  Rocket,
  Palette,
  Brain,
  X,
  Maximize2,
  Minimize2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useLocalStorage } from '@/components/hooks/useLocalStorage';

// Agent icon mapping
const AGENT_ICONS = {
  sync: Brain,
  learn: GraduationCap,
  growth: TrendingUp,
  sentinel: Shield,
  finance: DollarSign,
  raise: Rocket,
  create: Palette,
};

// Agent color mapping
const AGENT_COLORS = {
  sync: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  learn: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  growth: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  sentinel: { bg: 'bg-[#86EFAC]/20', text: 'text-[#86EFAC]', border: 'border-[#86EFAC]/30' },
  finance: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  raise: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  create: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
};

// Parse [ACTIONS] blocks from message content
function parseActionsFromContent(content) {
  const actionsRegex = /\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/g;
  const actions = [];
  let cleanContent = content;

  let match;
  while ((match = actionsRegex.exec(content)) !== null) {
    const actionsBlock = match[1];
    // Parse each action line: - emoji Label|action_id
    const actionLines = actionsBlock.split('\n').filter(line => line.trim().startsWith('-'));
    actionLines.forEach(line => {
      const actionMatch = line.match(/^-\s*(.+)\|(.+)$/);
      if (actionMatch) {
        actions.push({
          label: actionMatch[1].trim(),
          actionId: actionMatch[2].trim(),
        });
      }
    });
    // Remove the [ACTIONS] block from content
    cleanContent = cleanContent.replace(match[0], '').trim();
  }

  return { cleanContent, actions };
}

// Action buttons component
function ActionButtons({ actions, onAction, disabled }) {
  if (!actions || actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mt-3"
    >
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onAction(action)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg border transition-all',
            'bg-zinc-700/50 border-zinc-600 text-zinc-200',
            'hover:bg-purple-600/20 hover:border-purple-500/50 hover:text-white',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {action.label}
        </button>
      ))}
    </motion.div>
  );
}

// Message component
function ChatMessage({ message, isLast, onAction, isLoading }) {
  const isUser = message.role === 'user';
  const agentId = message.agentId || 'sync';
  const AgentIcon = AGENT_ICONS[agentId] || Bot;
  const colors = AGENT_COLORS[agentId] || AGENT_COLORS.sync;

  // Parse actions from assistant messages
  const { cleanContent, actions } = isUser
    ? { cleanContent: message.content, actions: [] }
    : parseActionsFromContent(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Agent avatar */}
      {!isUser && (
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
            colors.bg,
            colors.border
          )}
        >
          <AgentIcon className={cn('w-4 h-4', colors.text)} />
        </div>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        {/* Agent indicator */}
        {!isUser && message.agentId && message.agentId !== 'sync' && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn('text-xs font-medium', colors.text)}>
              {message.agentId.charAt(0).toUpperCase() + message.agentId.slice(1)} Agent
            </span>
            {message.delegated && (
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                delegated
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800/80 text-zinc-200 border border-white/5'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <ReactMarkdown
                className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-1 prose-code:text-purple-400 prose-code:bg-purple-950/30 prose-code:px-1 prose-code:rounded prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1"
                components={{
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto">
                      <table {...props} className="min-w-full border-collapse text-xs" />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th {...props} className="border border-zinc-700 bg-zinc-800 px-2 py-1 text-left font-medium text-zinc-300" />
                  ),
                  td: ({ node, ...props }) => (
                    <td {...props} className="border border-zinc-700 px-2 py-1" />
                  ),
                }}
              >
                {cleanContent}
              </ReactMarkdown>
              {/* Action buttons rendered below message */}
              {isLast && actions.length > 0 && (
                <ActionButtons actions={actions} onAction={onAction} disabled={isLoading} />
              )}
            </>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-zinc-600 px-2">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-zinc-300" />
        </div>
      )}
    </motion.div>
  );
}

// Loading indicator
function TypingIndicator({ agentId }) {
  const colors = AGENT_COLORS[agentId] || AGENT_COLORS.sync;
  const AgentIcon = AGENT_ICONS[agentId] || Bot;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
          colors.bg,
          colors.border
        )}
      >
        <AgentIcon className={cn('w-4 h-4', colors.text)} />
      </div>
      <div className="bg-zinc-800/80 rounded-2xl px-4 py-3 border border-white/5">
        <div className="flex items-center gap-1.5">
          <div className={cn('w-2 h-2 rounded-full animate-bounce', colors.bg.replace('/20', ''))} style={{ animationDelay: '0ms' }} />
          <div className={cn('w-2 h-2 rounded-full animate-bounce', colors.bg.replace('/20', ''))} style={{ animationDelay: '150ms' }} />
          <div className={cn('w-2 h-2 rounded-full animate-bounce', colors.bg.replace('/20', ''))} style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </motion.div>
  );
}

// Error display
function ErrorMessage({ error, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
    >
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-400 font-medium">Something went wrong</p>
        <p className="text-xs text-red-400/70 mt-1">{error}</p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
      )}
    </motion.div>
  );
}

// Main SyncChat component
export default function SyncChat({
  className,
  initialMessage,
  context,
  onClose,
  expanded = false,
  onToggleExpand,
}) {
  // Persist sessionId and messages in localStorage
  const [sessionId, setSessionId] = useLocalStorage('sync_session_id', null);
  const [cachedMessages, setCachedMessages] = useLocalStorage('sync_messages', []);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentAgent, setCurrentAgent] = useState('sync');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Restore messages from cache on mount
  useEffect(() => {
    if (cachedMessages.length > 0 && messages.length === 0) {
      setMessages(cachedMessages);
    }
  }, []);

  // Sync messages to cache (limit to last 50)
  useEffect(() => {
    if (messages.length > 0) {
      setCachedMessages(messages.slice(-50));
    }
  }, [messages]);

  // Handle new chat - clear session and messages
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setCachedMessages([]);
    setError(null);
    setCurrentAgent('sync');
    inputRef.current?.focus();
  }, [setSessionId, setCachedMessages]);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle initial message
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  // Send message to SYNC API
  const handleSend = async (messageText = input) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || isLoading) return;

    setError(null);
    setInput('');

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get current session for auth context
      const { data: { session } } = await supabase.auth.getSession();

      // Get the Supabase URL and anon key from the client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

      // Use session token if available, otherwise use anon key
      const authToken = session?.access_token || supabaseAnonKey;

      // Call SYNC edge function with explicit auth headers
      const response = await fetch(`${supabaseUrl}/functions/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          message: trimmedMessage,
          sessionId,
          context: {
            ...context,
            userId: session?.user?.id,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Update session ID
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      // Track delegated agent
      if (data.delegatedTo) {
        setCurrentAgent(data.delegatedTo);
      } else {
        setCurrentAgent('sync');
      }

      // Add assistant message
      const assistantMessage = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: data.response,
        agentId: data.delegatedTo || 'sync',
        delegated: !!data.delegatedTo,
        timestamp: new Date().toISOString(),
        usage: data.usage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('SYNC error:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry last message
  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      // Remove failed messages
      setMessages((prev) => prev.slice(0, prev.lastIndexOf(lastUserMessage) + 1));
      setError(null);
      handleSend(lastUserMessage.content);
    }
  };

  // Handle action button clicks
  const handleAction = useCallback((action) => {
    // Map action IDs to user-friendly messages
    const actionMessages = {
      create_invoice: 'Create the invoice',
      edit: 'Edit the details',
      cancel: 'Cancel this action',
      confirm: 'Yes, confirm',
      view_details: 'Show me the details',
      add_more: 'Add more items',
      send_email: 'Send the email',
      download: 'Download it',
      retry: 'Try again',
    };

    // Use mapped message or construct from action ID
    const message = actionMessages[action.actionId] || action.label.replace(/^[^\w]+/, '').trim();
    handleSend(message);
  }, []);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick action suggestions
  const suggestions = [
    { label: 'Create invoice', action: 'Help me create an invoice for a client' },
    { label: 'Find prospects', action: 'Find prospects in the SaaS industry' },
    { label: 'Compliance check', action: 'Check my AI system compliance status' },
    { label: 'Learning path', action: 'Recommend a learning path for AI development' },
  ];

  return (
    <div
      className={cn(
        'flex flex-col bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden',
        expanded ? 'fixed inset-4 z-50' : 'h-[600px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">SYNC</h3>
            <p className="text-xs text-zinc-500">AI Orchestrator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNewChat}
            className="text-zinc-400 hover:text-white gap-1.5"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs">New</span>
          </Button>
          {onToggleExpand && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleExpand}
              className="text-zinc-400 hover:text-white"
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">How can I help you?</h4>
            <p className="text-sm text-zinc-500 mb-6 max-w-sm">
              I can help with invoices, prospects, compliance, learning, and more.
              Just ask!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(suggestion.action)}
                  className="px-3 py-1.5 text-xs rounded-full bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={message === messages[messages.length - 1]}
                  onAction={handleAction}
                  isLoading={isLoading}
                />
              ))}
            </AnimatePresence>

            {isLoading && <TypingIndicator agentId={currentAgent} />}
            {error && <ErrorMessage error={error} onRetry={handleRetry} />}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-white/10 bg-zinc-900/80">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SYNC anything..."
              rows={1}
              disabled={isLoading}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all',
                'min-h-[48px] max-h-[120px]',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                height: 'auto',
                minHeight: '48px',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'h-12 w-12 rounded-xl transition-all',
              input.trim()
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 text-center mt-2">
          SYNC routes your requests to specialized agents automatically
        </p>
      </div>
    </div>
  );
}
