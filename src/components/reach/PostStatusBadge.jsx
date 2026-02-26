import React from 'react';
import { cn } from '@/lib/utils';
import { POST_STATUSES } from '@/lib/reach-constants';

const COLOR_MAP = {
  zinc: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  green: 'bg-green-500/15 text-green-400 border-green-500/25',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  red: 'bg-red-500/15 text-red-400 border-red-500/25',
};

export default function PostStatusBadge({ status, className }) {
  const statusConfig = POST_STATUSES[status];
  if (!statusConfig) return null;

  const colorClasses = COLOR_MAP[statusConfig.color] || COLOR_MAP.zinc;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        colorClasses,
        className
      )}
    >
      {statusConfig.label}
    </span>
  );
}
