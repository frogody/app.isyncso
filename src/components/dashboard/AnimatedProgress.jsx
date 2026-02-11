import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

const colorMap = {
  cyan: 'from-cyan-500 to-cyan-400',
  indigo: 'from-indigo-500 to-indigo-400',
  emerald: 'from-emerald-500 to-emerald-400',
  blue: 'from-blue-500 to-blue-400',
  red: 'from-red-500 to-red-400',
  amber: 'from-amber-500 to-amber-400',
  purple: 'from-purple-500 to-purple-400',
  sage: 'from-[#86EFAC] to-[#a7f3d0]',
  orange: 'from-orange-500 to-orange-400',
};

export function AnimatedProgress({ value = 0, max = 100, color = 'cyan', height = 6, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const gradient = colorMap[color] || colorMap.cyan;

  return (
    <div ref={ref} className="flex items-center gap-2 w-full">
      <div className="flex-1 rounded-full bg-zinc-800 overflow-hidden" style={{ height }}>
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', gradient)}
          initial={{ width: '0%' }}
          animate={isInView ? { width: `${percent}%` } : { width: '0%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {label && <span className="text-xs text-zinc-400 whitespace-nowrap">{label}</span>}
    </div>
  );
}
