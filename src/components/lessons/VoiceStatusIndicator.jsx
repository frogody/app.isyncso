import { Mic, Loader2, Volume2 } from 'lucide-react';

export default function VoiceStatusIndicator({ voiceState, onToggle, disabled }) {
  const states = {
    idle: { icon: Mic, bg: 'bg-gray-700 hover:bg-gray-600', label: 'Click to talk' },
    listening: { icon: Mic, bg: 'bg-red-500 ring-4 ring-red-500/30 animate-pulse', label: 'Listening...' },
    processing: { icon: Loader2, bg: 'bg-yellow-500', label: 'Thinking...', spin: true },
    speaking: { icon: Volume2, bg: 'bg-blue-500 animate-pulse', label: 'AI speaking...' }
  };

  const { icon: Icon, bg, label, spin } = states[voiceState] || states.idle;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onToggle}
        disabled={disabled || voiceState === 'processing' || voiceState === 'speaking'}
        className={`rounded-full w-14 h-14 flex items-center justify-center text-white transition-all ${bg} disabled:opacity-50`}
      >
        <Icon className={`w-6 h-6 ${spin ? 'animate-spin' : ''}`} />
      </button>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}