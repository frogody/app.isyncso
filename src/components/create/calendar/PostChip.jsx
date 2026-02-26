import React from 'react';
import { Linkedin, Twitter, Instagram, Facebook } from 'lucide-react';

const PLATFORM_CONFIG = {
  linkedin: {
    icon: Linkedin,
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  twitter: {
    icon: Twitter,
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-300',
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-300',
  },
  instagram: {
    icon: Instagram,
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
    dot: 'bg-pink-400',
  },
  facebook: {
    icon: Facebook,
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-400',
  },
};

const STATUS_STYLES = {
  draft: 'border-dashed',
  scheduled: 'border-solid',
  publishing: 'border-solid',
  published: 'border-solid',
  failed: 'border-solid border-red-500/40',
  cancelled: 'border-solid border-zinc-600/40 opacity-50',
};

export default function PostChip({ post, onClick }) {
  const primaryPlatform = Array.isArray(post.platforms) && post.platforms.length > 0
    ? post.platforms[0]
    : 'linkedin';

  const config = PLATFORM_CONFIG[primaryPlatform] || PLATFORM_CONFIG.linkedin;
  const Icon = config.icon;
  const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.draft;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(post);
      }}
      className={`
        group/chip flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] leading-tight
        border ${config.bg} ${config.border} ${statusStyle}
        hover:brightness-125 transition-all cursor-pointer w-full min-w-0
      `}
      title={`${post.title || 'Untitled'} (${post.status})`}
    >
      <Icon className={`w-2.5 h-2.5 flex-shrink-0 ${config.text}`} />
      <span className={`truncate ${config.text} font-medium`}>
        {post.title || 'Untitled'}
      </span>
      {post.status === 'published' && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
      )}
      {post.status === 'failed' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
      )}
    </button>
  );
}

export { PLATFORM_CONFIG };
