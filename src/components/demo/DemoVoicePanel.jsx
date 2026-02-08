import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, MessageCircle } from 'lucide-react';

export default function DemoVoicePanel({
  voiceState = 'idle',
  transcript = '',
  isMuted = false,
  onToggleMute,
  recipientName = '',
  onTextSubmit,
}) {
  const [textInput, setTextInput] = useState('');

  const stateLabels = {
    idle: 'Ready',
    listening: 'Listening...',
    processing: 'Thinking...',
    speaking: 'Speaking...',
  };

  const stateColors = {
    idle: 'text-zinc-500',
    listening: 'text-cyan-400',
    processing: 'text-amber-400',
    speaking: 'text-emerald-400',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center ${
              voiceState === 'speaking' ? 'animate-pulse' : ''
            }`}>
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${
              voiceState === 'idle' ? 'bg-zinc-500' :
              voiceState === 'listening' ? 'bg-cyan-400' :
              voiceState === 'processing' ? 'bg-amber-400' :
              'bg-emerald-400'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Sync</h3>
            <p className={`text-xs ${stateColors[voiceState]}`}>
              {stateLabels[voiceState]}
            </p>
          </div>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {transcript ? (
          <div className="space-y-3">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-sm text-zinc-300 leading-relaxed">
              {transcript}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <Volume2 className="w-8 h-8 text-cyan-400/40" />
            </div>
            <p className="text-zinc-500 text-sm">
              Sync is guiding your demo
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Speak anytime to ask questions
            </p>
          </div>
        )}
      </div>

      {/* Waveform / listening indicator */}
      {voiceState === 'listening' && (
        <div className="px-4 py-2 flex items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-cyan-400 rounded-full animate-pulse"
              style={{
                height: `${12 + Math.random() * 16}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Text input fallback */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className={`p-2.5 rounded-xl transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <div className="flex-1 flex items-center gap-2">
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
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={() => {
                if (textInput.trim()) {
                  onTextSubmit?.(textInput.trim());
                  setTextInput('');
                }
              }}
              className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
