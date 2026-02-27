/**
 * SyncJournal - Journal page
 * Merges SyncAgent chat + DailyJournal summary into one clean page.
 * Route: /sync
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Bot, User, AlertCircle, RefreshCw, Mic, MicOff,
  ChevronLeft, ChevronRight, Sparkles, Loader2, Clock,
  BookOpen, Download, ExternalLink, Image as ImageIcon, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SyncVoiceMode from '@/components/sync/SyncVoiceMode';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import { useLocalStorage } from '@/components/hooks/useLocalStorage';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { toast } from 'sonner';

// ─── Helpers ───────────────────────────────────────────────────────

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDuration(minutes) {
  if (!minutes) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateString(date) {
  return date.toISOString().split('T')[0];
}

// ─── Image detection ───────────────────────────────────────────────

const IMAGE_URL_PATTERNS = [
  /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/(?:public|sign)\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)/gi,
  /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"'<>]*)?/gi,
  /https?:\/\/[^\s"'<>]*(?:together|replicate|openai|stability|flux)[^\s"'<>]*\.(?:png|jpg|jpeg|gif|webp)/gi,
];

function extractImageUrls(text) {
  const matches = [];
  const seen = new Set();
  for (const pattern of IMAGE_URL_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!seen.has(match[0])) {
        seen.add(match[0]);
        matches.push({ url: match[0], startIndex: match.index, endIndex: match.index + match[0].length });
      }
    }
  }
  return matches.sort((a, b) => a.startIndex - b.startIndex);
}

function parseTextWithImages(text) {
  const images = extractImageUrls(text);
  if (images.length === 0) return [{ type: 'text', content: text }];
  const parts = [];
  let lastIndex = 0;
  for (const img of images) {
    if (img.startIndex > lastIndex) {
      const t = text.slice(lastIndex, img.startIndex).trim();
      if (t) parts.push({ type: 'text', content: t });
    }
    parts.push({ type: 'image', url: img.url });
    lastIndex = img.endIndex;
  }
  if (lastIndex < text.length) {
    const t = text.slice(lastIndex).trim();
    if (t) parts.push({ type: 'text', content: t });
  }
  return parts;
}

// ─── Inline Image ──────────────────────────────────────────────────

function InlineImage({ url }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 underline">
        View image
      </a>
    );
  }

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800/30 max-w-sm">
      {!loaded && <div className="h-32 bg-zinc-900/60 animate-pulse flex items-center justify-center"><ImageIcon className="w-5 h-5 text-zinc-600" /></div>}
      <img
        src={url}
        alt=""
        className={cn('w-full max-h-[300px] object-contain', !loaded && 'hidden')}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────

function MessageBubble({ role, text, ts }) {
  const isUser = role === 'user';
  const contentParts = useMemo(() => isUser ? null : parseTextWithImages(text), [text, isUser]);

  return (
    <div className={cn('flex gap-3 py-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-md bg-zinc-800/60 flex items-center justify-center mt-1">
          <Bot className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      )}
      <div className={cn('max-w-[80%]', isUser && 'text-right')}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-zinc-500">{isUser ? 'You' : 'SYNC'}</span>
          <span className="text-xs text-zinc-600">{formatTime(ts)}</span>
        </div>
        {isUser ? (
          <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{text}</div>
        ) : (
          <div className="text-sm text-zinc-200 leading-relaxed prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-code:text-cyan-400 prose-code:bg-zinc-800/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
            {contentParts.map((part, i) =>
              part.type === 'image'
                ? <InlineImage key={`img-${i}`} url={part.url} />
                : <ReactMarkdown key={`txt-${i}`}>{part.content}</ReactMarkdown>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-6 h-6 rounded-md bg-zinc-800/60 flex items-center justify-center mt-1">
          <User className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      )}
    </div>
  );
}

// ─── Journal Summary Card ──────────────────────────────────────────

function JournalSummary({ journal, onGenerate, generating }) {
  const [expanded, setExpanded] = useState(false);

  if (!journal) {
    return (
      <div className="border-b border-zinc-800/30 pb-4 mb-4">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-2"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating today's summary...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate today's summary</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-800/30 pb-4 mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Today's Summary</span>
          <div className="flex items-center gap-2">
            {journal.total_active_minutes && (
              <span className="text-xs text-zinc-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(journal.total_active_minutes)} active
              </span>
            )}
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />}
          </div>
        </div>
        {!expanded && journal.overview && (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{journal.overview}</p>
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-3">
              {journal.overview && (
                <p className="text-sm text-zinc-300 leading-relaxed">{journal.overview}</p>
              )}
              {journal.highlights && (
                <div>
                  <span className="text-xs text-zinc-500 font-medium">Highlights</span>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-1">{journal.highlights}</p>
                </div>
              )}
              {journal.productivity_score != null && (
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>Productivity: {Math.round(journal.productivity_score * 100)}%</span>
                  {journal.focus_score != null && <span>Focus: {Math.round(journal.focus_score * 100)}%</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Default messages ──────────────────────────────────────────────

const DEFAULT_MESSAGES = [
  { role: 'assistant', text: "Hey — I'm SYNC, your AI orchestrator. I can help with invoices, prospects, compliance, learning, and more.", ts: Date.now() - 60000 },
];

// ─── Main Component ────────────────────────────────────────────────

export default function SyncJournal() {
  const { user } = useUser();
  const syncState = useSyncState();

  // Date navigation
  const [currentDate, setCurrentDate] = useState(() => getDateString(new Date()));
  const isToday = currentDate === getDateString(new Date());

  // Journal state
  const [journal, setJournal] = useState(null);
  const [journalLoading, setJournalLoading] = useState(true);
  const [generatingJournal, setGeneratingJournal] = useState(false);

  // Chat state
  const [sessionId, setSessionId] = useLocalStorage('sync_journal_session_id', null);
  const [cachedMessages, setCachedMessages] = useLocalStorage('sync_journal_messages', []);
  const [messages, setMessages] = useState(() =>
    cachedMessages && cachedMessages.length > 0 ? cachedMessages : DEFAULT_MESSAGES
  );
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);

  const scrollerRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Fetch journal for current date ────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    setJournalLoading(true);
    db.from('daily_journals')
      .select('*')
      .eq('user_id', user.id)
      .eq('journal_date', currentDate)
      .maybeSingle()
      .then(({ data }) => {
        setJournal(data);
        setJournalLoading(false);
      })
      .catch(() => setJournalLoading(false));
  }, [user?.id, currentDate]);

  // ─── Sync messages to cache ────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 && messages !== DEFAULT_MESSAGES) {
      setCachedMessages(messages.slice(-50));
    }
  }, [messages]);

  // ─── Scroll to bottom on new messages ──────────────────────────

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ─── Date navigation ──────────────────────────────────────────

  const navigateDate = (direction) => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    const newDate = getDateString(d);
    const todayStr = getDateString(new Date());
    if (newDate > todayStr) return;
    setCurrentDate(newDate);
  };

  // ─── Generate journal ─────────────────────────────────────────

  const generateJournal = async () => {
    if (!user?.id) return;
    setGeneratingJournal(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-daily-journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({
          user_id: user.id,
          company_id: user.company_id,
          date: new Date(currentDate + 'T12:00:00').toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error === 'No activity data for this date'
          ? 'No activity data for this date. The desktop app needs to sync some data first.'
          : result.error || 'Failed to generate journal');
        return;
      }
      toast.success('Journal generated');
      if (result.journal) setJournal(result.journal);
    } catch (err) {
      toast.error('Failed to generate journal');
    } finally {
      setGeneratingJournal(false);
    }
  };

  // ─── Send message ─────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setError(null);
    setIsSending(true);
    syncState.setMood('thinking');
    const now = Date.now();

    setMessages(m => [...m, { role: 'user', text, ts: now }]);
    setInput('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
      const authToken = session?.access_token || supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          message: text,
          sessionId,
          stream: true,
          voice: true,
          context: { userId: session?.user?.id, companyId: user?.company_id },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let receivedSessionId = null;
      let firstChunk = true;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.event === 'start') {
                receivedSessionId = parsed.sessionId;
                if (parsed.delegatedTo) syncState.setActiveAgent(parsed.delegatedTo.toLowerCase());
                continue;
              }
              if (parsed.event === 'chunk' && parsed.content) {
                if (firstChunk) { firstChunk = false; syncState.setMood('speaking'); }
                fullText += parsed.content;
              }
              if (parsed.event === 'action_result' && parsed.success) {
                syncState.triggerSuccess();
              }
            } catch {}
          }
        }
      }

      if (receivedSessionId) setSessionId(receivedSessionId);
      if (fullText) {
        setMessages(m => [...m, { role: 'assistant', text: fullText.trim(), ts: Date.now() }]);
      }
      await new Promise(r => setTimeout(r, 500));
      syncState.setActiveAgent(null);
      syncState.setMood('listening');
    } catch (err) {
      setError(err.message || 'Failed to send message');
      syncState.setActiveAgent(null);
      syncState.setMood('listening');
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sessionId, user?.company_id, syncState]);

  // ─── New chat ─────────────────────────────────────────────────

  const handleNewChat = () => {
    setMessages(DEFAULT_MESSAGES);
    setSessionId(null);
    setCachedMessages([]);
    setError(null);
    setInput('');
  };

  // ─── Retry ────────────────────────────────────────────────────

  const handleRetry = () => {
    const last = [...messages].reverse().find(m => m.role === 'user');
    if (last) {
      setInput(last.text);
      setMessages(prev => prev.filter(m => m !== last));
      setError(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black text-zinc-200"
    >
      <div className="mx-auto max-w-3xl px-4 py-4 flex flex-col h-[calc(100dvh-3.5rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h1 className="text-lg font-medium text-zinc-200">Journal</h1>
          <div className="flex items-center gap-3">
            {/* Date nav */}
            <div className="flex items-center gap-1">
              <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-400 min-w-[100px] text-center">{formatDateLabel(currentDate)}</span>
              <button
                onClick={() => navigateDate(1)}
                disabled={isToday}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isToday ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Voice toggle */}
            <button
              onClick={() => setVoiceModeOpen(true)}
              className="p-2 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Voice mode"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Journal summary (collapsible) */}
        <div className="shrink-0">
          {journalLoading ? (
            <div className="border-b border-zinc-800/30 pb-4 mb-4">
              <div className="h-4 w-48 bg-zinc-800/40 rounded animate-pulse" />
            </div>
          ) : (
            <JournalSummary
              journal={journal}
              onGenerate={generateJournal}
              generating={generatingJournal}
            />
          )}
        </div>

        {/* Chat messages */}
        <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-1">
            {messages.map((m, idx) => (
              <MessageBubble key={idx} role={m.role} text={m.text} ts={m.ts} />
            ))}

            {isSending && (
              <div className="flex gap-3 py-2">
                <div className="shrink-0 w-6 h-6 rounded-md bg-zinc-800/60 flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-zinc-400" />
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
                <button onClick={handleRetry} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 pt-3">
          <div className="flex items-end gap-2 rounded-xl p-1.5 bg-zinc-900/60 border border-zinc-800/30 focus-within:border-cyan-500/30 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Message SYNC..."
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-50 px-3 py-2.5 min-h-[40px] max-h-[120px] text-zinc-200 placeholder:text-zinc-600"
            />
            <button
              onClick={() => setVoiceModeOpen(true)}
              className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Voice mode"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              onClick={send}
              disabled={isSending || !input.trim()}
              className={cn(
                'shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all',
                isSending || !input.trim()
                  ? 'bg-zinc-800/60 text-zinc-600'
                  : 'bg-cyan-600 text-white hover:bg-cyan-500'
              )}
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="px-3 pt-1 flex items-center justify-between text-[10px] text-zinc-600">
            <span>Enter to send · Shift+Enter for newline</span>
            <span>1 credit per message</span>
          </div>
        </div>
      </div>

      {/* Voice mode overlay */}
      <SyncVoiceMode
        isOpen={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onSwitchToChat={() => setVoiceModeOpen(false)}
      />
    </motion.div>
  );
}
