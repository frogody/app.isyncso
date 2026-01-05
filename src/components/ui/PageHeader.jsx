import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon,
  badge,
  actions,
  color = 'cyan' 
}) {
  const colorClasses = {
    cyan: { icon: 'text-cyan-400', iconBg: 'bg-cyan-500/20', gradient: 'from-cyan-500/10 to-transparent' },
    sage: { icon: 'text-[#86EFAC]', iconBg: 'bg-[#86EFAC]/20', gradient: 'from-[#86EFAC]/10 to-transparent' },
    indigo: { icon: 'text-indigo-400', iconBg: 'bg-indigo-500/20', gradient: 'from-indigo-500/10 to-transparent' },
    orange: { icon: 'text-orange-400', iconBg: 'bg-orange-500/20', gradient: 'from-orange-500/10 to-transparent' },
    red: { icon: 'text-red-400', iconBg: 'bg-red-500/20', gradient: 'from-red-500/10 to-transparent' },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-6',
        `bg-gradient-to-r ${colors.gradient}`
      )}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={cn('absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20', colors.iconBg)} />
        <div className={cn('absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl opacity-10', colors.iconBg)} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border', colors.iconBg, `border-${color}-500/30`)}>
              <Icon className={cn('w-7 h-7', colors.icon)} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="text-zinc-400 mt-1">{subtitle}</p>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}