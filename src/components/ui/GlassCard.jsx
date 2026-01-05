import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function GlassCard({ 
  children, 
  className, 
  hover = true,
  glow,
  delay = 0,
  ...props 
}) {
  const glowColors = {
    cyan: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30',
    sage: 'hover:shadow-[0_0_30px_rgba(134,239,172,0.15)] hover:border-[#86EFAC]/30',
    indigo: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/30',
    orange: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:border-orange-500/30',
    red: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] hover:border-red-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      className={cn(
        'bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl',
        'transition-all duration-300',
        hover && 'cursor-pointer',
        glow && glowColors[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  trend,
  color = 'cyan',
  delay = 0 
}) {
  const colorClasses = {
    cyan: { icon: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    sage: { icon: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/20', border: 'border-[#86EFAC]/30' },
    indigo: { icon: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
    orange: { icon: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    red: { icon: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  };

  const colors = colorClasses[color];

  return (
    <GlassCard glow={color} delay={delay} className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg, colors.border, 'border')}>
          <Icon className={cn('w-6 h-6', colors.icon)} />
        </div>
        {change && (
          <span className={cn(
            'text-sm font-medium px-2 py-1 rounded-lg',
            trend === 'up' ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'
          )}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-400">{label}</div>
    </GlassCard>
  );
}

export function ProgressRing({ value, size = 120, strokeWidth = 8, color = 'cyan' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorClasses = {
    cyan: 'stroke-cyan-500',
    sage: 'stroke-[#86EFAC]',
    indigo: 'stroke-indigo-500',
    orange: 'stroke-orange-500',
    red: 'stroke-red-500',
  };

  return (
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
          className={colorClasses[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}