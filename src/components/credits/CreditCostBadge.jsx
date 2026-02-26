import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small badge showing the credit cost of an action.
 * Place next to buttons that trigger billable actions.
 *
 * Usage:
 *   <Button>
 *     Generate Image <CreditCostBadge credits={3} />
 *   </Button>
 */
export function CreditCostBadge({ credits, className, size = 'sm' }) {
  if (!credits || credits <= 0) return null;

  const sizes = {
    xs: 'text-[9px] px-1 py-0.5 gap-0.5',
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-black/40 text-white border border-white/20 font-semibold whitespace-nowrap backdrop-blur-sm',
        sizes[size] || sizes.sm,
        className
      )}
    >
      <Zap className={size === 'xs' ? 'w-2 h-2' : size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} fill="currentColor" />
      {credits}
    </span>
  );
}
