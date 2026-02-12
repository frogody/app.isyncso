/**
 * AdminCommander - Roadmap Commander Chat Interface
 *
 * Chat with the manager agent to describe features in natural language.
 * The agent understands the app structure and places features on the roadmap.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Map,
  GitBranch,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

const QUICK_COMMANDS = [
  { label: 'Agent Status', cmd: '/status', icon: Activity },
  { label: 'Health Check', cmd: '/health', icon: Shield },
  { label: 'Recent PRs', cmd: '/prs', icon: GitBranch },
];

function MessageBubble({ message, isLast }) {
  const isUser = message.role === 'user';
  const isAction = message.type === 'action_result';

  if (isAction) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 px-4 py-2"
      >
        <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <p className="text-xs text-green-400 font-medium mb-1">Action: {message.action}</p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 px-4 py-2', isUser && 'flex-row-reverse')}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-cyan-500/20 border border-cyan-500/30'
            : 'bg-red-500/20 border border-red-500/30'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-cyan-400" />
        ) : (
          <Bot className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-xl p-3',
          isUser
            ? 'bg-cyan-500/10 border border-cyan-500/20'
            : 'bg-zinc-800/50 border border-zinc-700/50'
        )}
      >
        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {message.content}
          {isLast && message.role === 'assistant' && message.streaming && (
            <span className="inline-block w-2 h-4 bg-red-400 ml-1 animate-pulse" />
          )}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
}

export default function AdminCommander() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [agentStats, setAgentStats] = useState({ total: 0, active: 0, idle: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch agent stats
  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('agent_registry').select('status');
      if (data) {
        setAgentStats({
          total: data.length,
          active: data.filter((a) => a.status === 'working').length,
          idle: data.filter((a) => a.status === 'idle').length,
        });
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "I'm the Roadmap Commander. Describe a feature you want to build and I'll help you place it on the roadmap with the right module, priority, and dependencies.\n\nYou can also ask me about agent status, platform health, or recent PRs.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const handleSend = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isLoading) return;

      setInput('');
      setError(null);

      // Handle quick commands
      let actualMessage = trimmed;
      if (trimmed === '/status') actualMessage = 'What is the current status of all agents?';
      if (trimmed === '/health') actualMessage = 'Give me a health summary of the platform';
      if (trimmed === '/prs') actualMessage = 'List recent pull requests created by agents';

      // Add user message
      const userMsg = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Create streaming placeholder
      const assistantId = `msg_${Date.now()}_resp`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          streaming: true,
        },
      ]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || SUPABASE_ANON_KEY;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/commander-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            message: actualMessage,
            sessionId,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed (${response.status})`);
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'session') {
                setSessionId(data.sessionId);
              } else if (data.type === 'chunk') {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              } else if (data.type === 'action_result') {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `action_${Date.now()}`,
                    type: 'action_result',
                    action: data.action,
                    content: data.result,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseErr) {
              // Skip malformed chunks
              if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
            }
          }
        }

        // Finalize streaming message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        );
      } catch (err) {
        console.error('Commander error:', err);
        setError(err.message);
        // Update placeholder with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, streaming: false }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, sessionId]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Roadmap Commander</h1>
              <p className="text-xs text-zinc-500">
                {agentStats.total} agents ({agentStats.active} active, {agentStats.idle} idle)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewSession}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Session
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={i === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Thinking...</span>
                <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Commands */}
      <div className="px-4 pb-2 flex gap-2">
        {QUICK_COMMANDS.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.cmd}
              onClick={() => handleSend(cmd.cmd)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5" />
              {cmd.label}
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a feature to build, or ask about agent status..."
            rows={1}
            className="flex-1 bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Powered by Kimi-K2 via Together.ai | Session: {sessionId?.substring(0, 8) || 'new'}
        </p>
      </div>
    </div>
  );
}
