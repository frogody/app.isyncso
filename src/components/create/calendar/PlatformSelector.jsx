import React from 'react';
import { Linkedin, Twitter, Instagram, Facebook, Check, Link2 } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';

const PLATFORMS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    bg: 'bg-blue-500/10',
    activeBg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    activeBorder: 'border-blue-500/40',
    available: true,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    icon: Twitter,
    bg: 'bg-zinc-500/10',
    activeBg: 'bg-zinc-500/20',
    text: 'text-zinc-300',
    border: 'border-zinc-500/20',
    activeBorder: 'border-zinc-500/40',
    available: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    bg: 'bg-pink-500/10',
    activeBg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
    activeBorder: 'border-pink-500/40',
    available: false,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    bg: 'bg-indigo-500/10',
    activeBg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    activeBorder: 'border-indigo-500/40',
    available: false,
  },
];

export default function PlatformSelector({ selected = [], onChange, connectedAccounts = [] }) {
  const { ct } = useTheme();

  const togglePlatform = (platformId) => {
    if (!PLATFORMS.find(p => p.id === platformId)?.available) return;

    if (selected.includes(platformId)) {
      onChange(selected.filter(id => id !== platformId));
    } else {
      onChange([...selected, platformId]);
    }
  };

  const isConnected = (platformId) => {
    return connectedAccounts.some(acc => acc.platform === platformId && acc.status === 'connected');
  };

  return (
    <div className="space-y-2">
      <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider`}>
        Platforms
      </label>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selected.includes(platform.id);
          const connected = isConnected(platform.id);

          return (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              disabled={!platform.available}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all
                ${isSelected
                  ? `${platform.activeBg} ${platform.activeBorder} ${platform.text}`
                  : platform.available
                    ? `${platform.bg} ${platform.border} ${platform.text} hover:brightness-125`
                    : `${ct('bg-slate-100 border-slate-200 text-slate-400', 'bg-zinc-900/30 border-zinc-800/40 text-zinc-600')} cursor-not-allowed`
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{platform.label}</span>
              {!platform.available && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ct('bg-slate-200 text-slate-500', 'bg-zinc-800 text-zinc-500')}`}>
                  Soon
                </span>
              )}
              {platform.available && isSelected && (
                <Check className="w-3.5 h-3.5" />
              )}
              {platform.available && !isSelected && connected && (
                <Link2 className="w-3 h-3 opacity-50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PLATFORMS };
