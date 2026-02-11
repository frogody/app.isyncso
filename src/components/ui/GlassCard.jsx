import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { useTheme } from '@/contexts/GlobalThemeContext';

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
    cyan: { border: 'hover:border-cyan-500/40', shadow: '0 0 30px rgba(6, 182, 212, 0.15)' },
    sage: { border: 'hover:border-[#86EFAC]/40', shadow: '0 0 30px rgba(134, 239, 172, 0.15)' },
    indigo: { border: 'hover:border-indigo-500/40', shadow: '0 0 30px rgba(99, 102, 241, 0.15)' },
    orange: { border: 'hover:border-orange-500/40', shadow: '0 0 30px rgba(249, 115, 22, 0.15)' },
    amber: { border: 'hover:border-amber-500/40', shadow: '0 0 30px rgba(245, 158, 11, 0.15)' },
    red: { border: 'hover:border-red-500/40', shadow: '0 0 30px rgba(239, 68, 68, 0.15)' },
    yellow: { border: 'hover:border-yellow-500/40', shadow: '0 0 30px rgba(234, 179, 8, 0.15)' },
    blue: { border: 'hover:border-blue-500/40', shadow: '0 0 30px rgba(59, 130, 246, 0.15)' },
    green: { border: 'hover:border-green-500/40', shadow: '0 0 30px rgba(34, 197, 94, 0.15)' },
    purple: { border: 'hover:border-purple-500/40', shadow: '0 0 30px rgba(168, 85, 247, 0.15)' },
    emerald: { border: 'hover:border-emerald-500/40', shadow: '0 0 30px rgba(16, 185, 129, 0.15)' },
  };

  const sizeClasses = {
    xs: 'p-2 rounded-lg',
    sm: 'p-3 rounded-xl',
    md: 'p-4 rounded-xl',
    lg: 'p-6 rounded-xl',
  };

  const glowConfig = glow ? glowColors[glow] : null;

  let themeClasses;
  try {
    const { t } = useTheme();
    themeClasses = t(
      'bg-white/90 border border-zinc-200/80 shadow-sm',
      'bg-zinc-900/60 backdrop-blur-xl border border-white/10'
    );
  } catch {
    themeClasses = 'bg-zinc-900/60 backdrop-blur-xl border border-white/10';
  }

  const baseClasses = cn(
    themeClasses,
    'transition-colors duration-300',
    sizeClasses[size] || sizeClasses.md,
    hover && 'cursor-pointer',
    glowConfig?.border,
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
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
    teal: { icon: 'text-teal-400', bg: 'bg-teal-500/20', border: 'border-teal-500/30' },
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

  let valueTextClass = 'text-white';
  let labelTextClass = 'text-zinc-400';
  try {
    const { t } = useTheme();
    valueTextClass = t('text-zinc-900', 'text-white');
    labelTextClass = t('text-zinc-500', 'text-zinc-400');
  } catch {}

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
      <div className={cn(s.value, 'font-bold mb-0.5', valueTextClass)}>
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} delay={delay} duration={1.2} formatOptions={{ useLocale: true }} />
        ) : (
          value
        )}
      </div>
      <div className={cn(s.label, labelTextClass)}>{label}</div>
    </GlassCard>
  );
}

export function ProgressRing({ value, size = 120, strokeWidth = 8, color = 'cyan', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorClasses = {
    cyan: 'stroke-cyan-500',
    teal: 'stroke-teal-500',
    sage: 'stroke-[#86EFAC]',
    indigo: 'stroke-indigo-500',
    orange: 'stroke-orange-500',
    red: 'stroke-red-500',
    yellow: 'stroke-yellow-500',
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    amber: 'stroke-amber-500',
    purple: 'stroke-purple-500',
    emerald: 'stroke-emerald-500',
  };

  let trackClass = 'stroke-zinc-800';
  let valueTextClass = 'text-white';
  try {
    const { t } = useTheme();
    trackClass = t('stroke-zinc-200', 'stroke-zinc-800');
    valueTextClass = t('text-zinc-900', 'text-white');
  } catch {}

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className={trackClass}
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
        {children || <span className={cn('text-2xl font-bold', valueTextClass)}>{value}%</span>}
      </div>
    </div>
  );
}