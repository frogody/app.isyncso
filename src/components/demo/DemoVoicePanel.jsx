import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

// Contextual suggestion chips per page
const PAGE_SUGGESTIONS = {
  dashboard: ["How do these KPIs update?", "Show me Growth", "What modules are included?"],
  growth: ["How does AI scoring work?", "Show me a deal example", "Show me Finance"],
  crm: ["How does contact enrichment work?", "What's the lead scoring based on?", "Show me Growth"],
  talent: ["How does flight risk detection work?", "Show me a candidate match", "How does outreach work?"],
  finance: ["Can I create invoices from deals?", "Show me expenses", "How does P&L tracking work?"],
  learn: ["How are learning paths created?", "What certifications are available?", "Show me Create"],
  create: ["What can the AI generate?", "How does brand kit work?", "Show me Products"],
  products: ["How does inventory tracking work?", "Can I import products?", "Show me Finance"],
  raise: ["How does investor tracking work?", "What's in the data room?", "Show me Dashboard"],
  sentinel: ["What's the EU AI Act?", "How does risk classification work?", "Show me Integrations"],
  inbox: ["How does unified messaging work?", "Can SYNC respond here?", "Show me Tasks"],
  tasks: ["How does AI prioritization work?", "Can I assign tasks?", "Show me Dashboard"],
  integrations: ["How many integrations are there?", "How does sync work?", "Show me SYNC"],
  'sync-showcase': ["What can SYNC do?", "How many actions?", "Show me Dashboard"],
};

export default function DemoVoicePanel({
  voiceState = 'idle',
  transcript = '',
  isMuted = false,
  onToggleMute,
  recipientName = '',
  onTextSubmit,
  currentPage = 'dashboard',
  responseTime = null,
}) {
  const [textInput, setTextInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const transcriptRef = useRef(null);

  const stateLabels = {
    idle: 'Ready',
    off: 'Ready',
    listening: 'Listening...',
    processing: 'Thinking...',
    speaking: 'Speaking...',
  };

  const stateColors = {
    idle: 'bg-zinc-500',
    off: 'bg-zinc-500',
    listening: 'bg-cyan-400',
    processing: 'bg-amber-400',
    speaking: 'bg-emerald-400',
  };

  const stateTextColors = {
    idle: 'text-zinc-500',
    off: 'text-zinc-500',
    listening: 'text-cyan-400',
    processing: 'text-amber-400',
    speaking: 'text-emerald-400',
  };

  // Connection quality based on response time
  const getConnectionDot = () => {
    if (!responseTime) return 'bg-zinc-500';
    if (responseTime < 3000) return 'bg-emerald-400';
    if (responseTime < 5000) return 'bg-amber-400';
    return 'bg-red-400';
  };

  // Show chips when speaking finishes, hide when user interacts
  useEffect(() => {
    if (voiceState === 'speaking') {
      setShowChips(false);
    } else if (voiceState === 'listening' && transcript && !transcript.startsWith('You:')) {
      // SYNC finished speaking, show chips after brief delay
      const timer = setTimeout(() => setShowChips(true), 600);
      return () => clearTimeout(timer);
    }
  }, [voiceState, transcript]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Sync avatar ring segments (simplified)
  const segments = [
    '#ec4899', '#06b6d4', '#6366f1', '#10b981', '#86EFAC',
    '#f59e0b', '#f43f5e', '#f97316', '#3b82f6', '#14b8a6',
  ];

  const suggestions = PAGE_SUGGESTIONS[currentPage] || PAGE_SUGGESTIONS.dashboard;

  const handleChipClick = (chipText) => {
    setShowChips(false);
    onTextSubmit?.(chipText);
  };

  return (
    <div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header — always visible, clickable to collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
      >
        {/* Mini Sync avatar */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg width={40} height={40} viewBox="0 0 40 40">
            {segments.map((color, i) => {
              const from = i * 0.1 + 0.02;
              const to = from + 0.06;
              const a0 = (from - 0.25) * Math.PI * 2;
              const a1 = (to - 0.25) * Math.PI * 2;
              const r = 18;
              return (
                <path
                  key={i}
                  d={`M ${20 + r * Math.cos(a0)} ${20 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${20 + r * Math.cos(a1)} ${20 + r * Math.sin(a1)}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.75}
                />
              );
            })}
          </svg>
          <div
            className="absolute rounded-full"
            style={{
              top: 8, left: 8, width: 24, height: 24,
              background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(0,0,0,0.7) 100%)',
            }}
          />
          {/* Connection quality dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${getConnectionDot()}`} />
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold text-white">Sync</div>
          <div className={`text-xs ${stateTextColors[voiceState] || stateTextColors.idle}`}>
            {stateLabels[voiceState] || 'Ready'}
          </div>
        </div>

        {collapsed ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {/* Collapsed preview — show last message as 1-line */}
      {collapsed && transcript && (
        <div className="px-3 pb-2">
          <p className="text-xs text-zinc-500 truncate">{transcript}</p>
        </div>
      )}

      {!collapsed && (
        <>
          {/* Transcript */}
          <div ref={transcriptRef} className="px-3 pb-2 max-h-40 overflow-y-auto scroll-smooth">
            {transcript ? (
              <div className="bg-white/5 rounded-xl p-2.5 text-sm text-zinc-300 leading-relaxed">
                {transcript}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-zinc-600 text-xs">Speak anytime to ask questions</p>
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          {showChips && voiceState === 'listening' && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(chip)}
                  className="text-xs px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full hover:bg-cyan-500/20 transition-colors truncate max-w-full"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Listening indicator */}
          {voiceState === 'listening' && (
            <div className="px-3 py-1.5 flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-cyan-400 rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 12}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="p-2.5 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleMute}
                className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textInput.trim()) {
                    setShowChips(false);
                    onTextSubmit?.(textInput.trim());
                    setTextInput('');
                  }
                }}
                placeholder="Type a question..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={() => {
                  if (textInput.trim()) {
                    setShowChips(false);
                    onTextSubmit?.(textInput.trim());
                    setTextInput('');
                  }
                }}
                className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors flex-shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
