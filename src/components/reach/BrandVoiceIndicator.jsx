import React from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BrandVoiceIndicator({ profileName, onClick, className }) {
  const hasProfile = Boolean(profileName);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        hasProfile
          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25'
          : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800',
        className
      )}
    >
      <Volume2 className="w-3.5 h-3.5" />
      <span>{hasProfile ? profileName : 'No voice profile'}</span>
    </button>
  );
}
