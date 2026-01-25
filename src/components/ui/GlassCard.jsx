import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function GlassCard({
  children,
  className,
  hover = true,
  glow,
  delay = 0,
  size = 'md',
  animated = true,
  ...props
}) {
  const glowColors = {
    cyan: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30',
    sage: 'hover:shadow-[0_0_30px_rgba(134,239,172,0.15)] hover:border-[#86EFAC]/30',
    indigo: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/30',
    orange: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:border-orange-500/30',
    amber: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:border-amber-500/30',
    red: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] hover:border-red-500/30',
    yellow: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-yellow-500/30',
    blue: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:border-blue-500/30',
    green: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] hover:border-green-500/30',
    purple: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:border-purple-500/30',
  };

  const sizeClasses = {
    xs: 'p-2 rounded-lg',
    sm: 'p-3 rounded-xl',
    md: 'p-4 rounded-xl',
    lg: 'p-6 rounded-xl',
  };

  const baseClasses = cn(
    'bg-zinc-900/60 backdrop-blur-xl border border-white/10',
    'transition-all duration-300',
    sizeClasses[size] || sizeClasses.md,
    hover && 'cursor-pointer',
    glow && glowColors[glow],
    className
  );

  if (!animated) {
    return (
      <div className={baseClasses} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      className={baseClasses}
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
  delay = 0,
  size = 'md'
}) {
  const colorClasses = {
    cyan: { icon: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    sage: { icon: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/20', border: 'border-[#86EFAC]/30' },
    indigo: { icon: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
    orange: { icon: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    amber: { icon: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    red: { icon: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
    yellow: { icon: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
    blue: { icon: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    green: { icon: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
    purple: { icon: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  };

  // Safe fallback to cyan if color not found
  const colors = colorClasses[color] || colorClasses.cyan;

  const sizeConfig = {
    sm: {
      card: 'p-3',
      iconContainer: 'w-8 h-8 rounded-lg',
      icon: 'w-4 h-4',
      value: 'text-lg',
      label: 'text-[10px]',
      change: 'text-xs px-1.5 py-0.5',
      mb: 'mb-2',
    },
    md: {
      card: 'p-3',
      iconContainer: 'w-8 h-8 rounded-lg',
      icon: 'w-4 h-4',
      value: 'text-lg',
      label: 'text-xs',
      change: 'text-xs px-1.5 py-0.5',
      mb: 'mb-2',
    },
    lg: {
      card: 'p-4',
      iconContainer: 'w-8 h-8 rounded-xl',
      icon: 'w-4 h-4',
      value: 'text-lg',
      label: 'text-xs',
      change: 'text-sm px-2 py-1',
      mb: 'mb-3',
    },
  };

  const s = sizeConfig[size] || sizeConfig.md;

  return (
    <GlassCard glow={color} delay={delay} className={s.card} size={size}>
      <div className={cn('flex items-center justify-between', s.mb)}>
        <div className={cn(s.iconContainer, 'flex items-center justify-center', colors.bg, colors.border, 'border')}>
          <Icon className={cn(s.icon, colors.icon)} />
        </div>
        {change && (
          <span className={cn(
            'font-medium rounded-lg',
            s.change,
            trend === 'up' ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'
          )}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <div className={cn(s.value, 'font-bold text-white mb-0.5')}>{value}</div>
      <div className={cn(s.label, 'text-zinc-400')}>{label}</div>
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
    yellow: 'stroke-yellow-500',
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    amber: 'stroke-amber-500',
    purple: 'stroke-purple-500',
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
          className={colorClasses[color] || colorClasses.cyan}
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