import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function getScoreColor(score) {
  if (score <= 40) return { stroke: 'stroke-red-500', text: 'text-red-400' };
  if (score <= 70) return { stroke: 'stroke-amber-500', text: 'text-amber-400' };
  return { stroke: 'stroke-green-500', text: 'text-green-400' };
}

export default function ScoreGauge({ score = 0, size = 120, label, className }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeWidth = Math.max(6, size * 0.07);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedScore / 100) * circumference;
  const colors = getScoreColor(clampedScore);

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="stroke-zinc-800"
            strokeWidth={strokeWidth}
            fill="none"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <motion.circle
            className={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', colors.text, size >= 100 ? 'text-2xl' : 'text-lg')}>
            {clampedScore}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-zinc-400 text-center">{label}</span>
      )}
    </div>
  );
}
