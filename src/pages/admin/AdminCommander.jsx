/**
 * AdminCommander - Roadmap Commander Chat Interface
 *
 * Chat with the manager agent to describe features in natural language.
 * The agent understands the app structure and places features on the roadmap.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  ListTodo,
  AlertTriangle,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

const QUICK_COMMANDS = [
  { label: 'Status', cmd: '/status', icon: Activity, desc: 'Agent status overview' },
  { label: 'Health', cmd: '/health', icon: Shield, desc: 'Platform health check' },
  { label: 'PRs', cmd: '/prs', icon: GitBranch, desc: 'Recent pull requests' },
  { label: 'Backlog', cmd: '/backlog', icon: ListTodo, desc: 'Open backlog items' },
  { label: 'Blockers', cmd: '/blockers', icon: AlertTriangle, desc: 'Current blockers' },
  { label: 'Sprint', cmd: '/sprint', icon: Target, desc: 'Sprint progress' },
  { label: 'Stats', cmd: '/stats', icon: BarChart3, desc: 'Roadmap statistics' },
];

const SUGGESTED_PROMPTS = [
  'Add a notification system for overdue tasks',
  'What features are blocked right now?',
  'Create a bulk import tool for products',
  'Show me the progress of the Talent module',
];

// ─── Markdown for messages ──────────────────────────────────────────
function MdMessage({ children }) {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
            {children}
          </a>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="bg-zinc-700/50 px-1.5 py-0.5 rounded text-[12px] text-cyan-400 font-mono">{children}</code>
          ) : (
            <pre className="bg-zinc-800/80 rounded-lg p-3 text-[12px] text-zinc-300 overflow-x-auto my-2 font-mono border border-zinc-700/50">
              <code>{children}</code>
            </pre>
          ),
        ul: ({ children }) => <ul className="list-disc list-inside ml-1 my-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside ml-1 my-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-zinc-300">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="text-zinc-400 italic">{children}</em>,
        h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-2.5 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-200 mt-2 mb-1">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-cyan-500/40 pl-3 my-2 text-zinc-400 italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border border-zinc-700 rounded">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-zinc-800/50">{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1.5 text-left text-zinc-400 font-medium border-b border-zinc-700">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1.5 text-zinc-300 border-b border-zinc-800">{children}</td>,
        hr: () => <hr className="border-zinc-700/50 my-3" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

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
          <div className="text-sm text-zinc-300"><MdMessage>{message.content}</MdMessage></div>
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
            : 'bg-cyan-500/20 border border-cyan-500/30'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-cyan-400" />
        ) : (
          <Bot className="w-4 h-4 text-cyan-400" />
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
        {isUser ? (
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm text-zinc-200 leading-relaxed">
            <MdMessage>{message.content}</MdMessage>
            {isLast && message.streaming && (
              <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />
            )}
          </div>
        )}
        <p className="text-[10px] text-zinc-500 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-2">
      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
        <Bot className="w-4 h-4 text-red-400" />
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <span className="text-xs text-zinc-500 ml-1">Commander is thinking</span>
          <Sparkles className="w-3 h-3 text-red-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AdminCommander({ embedded = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [agentStats, setAgentStats] = useState({ total: 0, active: 0, idle: 0 });
  const [showCommands, setShowCommands] = useState(false);
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
            "I'm the **Roadmap Commander**. I can help you:\n\n- **Plan features** — describe what you want to build\n- **Check status** — agent activity, health, blockers\n- **Manage roadmap** — priorities, sprints, dependencies\n\nTry a quick command below or describe a feature.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  // Detect / commands in input
  useEffect(() => {
    setShowCommands(input.startsWith('/') && input.length <= 12);
  }, [input]);

  const handleSend = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isLoading) return;

      setInput('');
      setError(null);
      setShowCommands(false);

      // Handle quick commands
      let actualMessage = trimmed;
      if (trimmed === '/status') actualMessage = 'What is the current status of all agents?';
      if (trimmed === '/health') actualMessage = 'Give me a health summary of the platform';
      if (trimmed === '/prs') actualMessage = 'List recent pull requests created by agents';
      if (trimmed === '/backlog') actualMessage = 'Show me all open backlog items grouped by module, sorted by priority';
      if (trimmed === '/blockers') actualMessage = 'What features are currently blocked? List blockers with their dependencies';
      if (trimmed === '/sprint') actualMessage = 'Show me the current sprint progress — items in progress, items in review, and what\'s planned next';
      if (trimmed === '/stats') actualMessage = 'Give me roadmap statistics: total features, completion rate by module, priority distribution, and velocity';

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

  const filteredCommands = QUICK_COMMANDS.filter(cmd =>
    !input || cmd.cmd.startsWith(input.toLowerCase())
  );

  const isWelcomeOnly = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <div className={embedded ? "flex flex-col h-[calc(100vh-280px)] min-h-[500px]" : "min-h-screen bg-zinc-950 flex flex-col"}>
      {/* Header */}
      {!embedded && (
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-500">
              <Clock className="w-3 h-3" />
              Session: {sessionId?.substring(0, 8) || 'new'}
            </div>
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
      )}

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
          <TypingIndicator />
        )}

        {/* Suggested prompts on welcome */}
        {isWelcomeOnly && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="px-4 pt-2"
          >
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 px-1">Suggestions</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="text-left px-3 py-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-red-400/60 mb-1" />
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
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

      {/* Slash command autocomplete */}
      <AnimatePresence>
        {showCommands && filteredCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-2 bg-zinc-800/90 border border-zinc-700 rounded-xl overflow-hidden backdrop-blur-sm"
          >
            {filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.cmd}
                  onClick={() => { setInput(''); handleSend(cmd.cmd); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-zinc-500" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-white">{cmd.cmd}</span>
                    <span className="text-[10px] text-zinc-500 ml-2">{cmd.desc}</span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Commands */}
      <div className="px-4 pb-2 flex gap-2 flex-wrap">
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
            placeholder="Describe a feature, or type / for commands..."
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
          Powered by Kimi-K2 via Together.ai{embedded ? '' : ` | Session: ${sessionId?.substring(0, 8) || 'new'}`}
        </p>
      </div>
    </div>
  );
}
