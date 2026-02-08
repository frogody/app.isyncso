import React, { useState } from 'react';
import { Mic, MicOff, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function DemoVoicePanel({
  voiceState = 'idle',
  transcript = '',
  isMuted = false,
  onToggleMute,
  recipientName = '',
  onTextSubmit,
}) {
  const [textInput, setTextInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);

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

  // Sync avatar ring segments (simplified)
  const segments = [
    '#ec4899', '#06b6d4', '#6366f1', '#10b981', '#86EFAC',
    '#f59e0b', '#f43f5e', '#f97316', '#3b82f6', '#14b8a6',
  ];

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
          {/* Status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${stateColors[voiceState] || stateColors.idle}`} />
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

      {!collapsed && (
        <>
          {/* Transcript */}
          <div className="px-3 pb-2 max-h-40 overflow-y-auto">
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
