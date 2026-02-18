import React from 'react';
import {
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  Globe,
  Search,
  Youtube,
  Twitter,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORMS, SOCIAL_PLATFORMS } from '@/lib/reach-constants';

const ICON_MAP = {
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  Globe,
  Search,
  Youtube,
  Twitter,
  BarChart3,
};

const PLATFORM_COLORS = {
  instagram_feed: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  instagram_stories: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  facebook_feed: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  facebook_stories: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  linkedin_feed: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  linkedin_sidebar: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  tiktok_feed: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/25',
  google_display: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  google_search: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  youtube_preroll: 'bg-red-500/15 text-red-400 border-red-500/25',
  // Social platform keys
  instagram: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  facebook: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  linkedin: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  twitter: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  tiktok: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/25',
  google_analytics: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
};

const SIZE_CLASSES = {
  sm: { badge: 'px-1.5 py-0.5 text-[10px] gap-1', icon: 'w-3 h-3' },
  md: { badge: 'px-2 py-1 text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
};

export default function PlatformBadge({ platform, size = 'sm', showLabel = true, className }) {
  const platformData = PLATFORMS[platform] || SOCIAL_PLATFORMS[platform];
  if (!platformData) return null;

  const IconComponent = ICON_MAP[platformData.icon];
  if (!IconComponent) return null;

  const colorClasses = PLATFORM_COLORS[platform] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25';
  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        colorClasses,
        sizeConfig.badge,
        className
      )}
    >
      <IconComponent className={sizeConfig.icon} />
      {showLabel && <span>{platformData.name}</span>}
    </span>
  );
}
