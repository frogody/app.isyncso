import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, TrendingDown, Clock, FileText,
  Users, ShoppingCart, X, Check, ArrowRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

const ITEM_TYPE_CONFIG = {
  overdue_invoice: {
    icon: FileText,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  stale_deal: {
    icon: TrendingDown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  overdue_task: {
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  payment_risk_deal: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  low_stock: {
    icon: ShoppingCart,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  new_lead: {
    icon: Users,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
};

const DEFAULT_CONFIG = {
  icon: AlertTriangle,
  color: 'text-zinc-400',
  bgColor: 'bg-zinc-500/10',
  borderColor: 'border-zinc-500/20',
};

function PriorityDots({ score }) {
  const filled = Math.min(5, Math.round(score / 2));
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i <= filled
              ? score >= 8 ? 'bg-red-400' : score >= 5 ? 'bg-amber-400' : 'bg-cyan-400'
              : 'bg-zinc-600/30'
          )}
        />
      ))}
    </div>
  );
}

export default function PulseCard({ item, onDismiss, onActed }) {
  const { t } = useTheme();
  const config = ITEM_TYPE_CONFIG[item.item_type] || DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <div className={cn(
      'group relative rounded-xl border p-4 transition-all',
      t(
        `bg-white/60 ${config.borderColor} hover:bg-white/80`,
        `bg-zinc-900/40 ${config.borderColor} hover:bg-zinc-900/60`
      )
    )}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          config.bgColor
        )}>
          <Icon className={cn('w-4.5 h-4.5', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'text-sm font-medium leading-tight',
              t('text-zinc-900', 'text-white')
            )}>
              {item.title}
            </h3>
            <PriorityDots score={item.priority_score} />
          </div>

          <p className={cn(
            'text-xs mt-1 leading-relaxed line-clamp-2',
            t('text-zinc-500', 'text-zinc-400')
          )}>
            {item.description}
          </p>

          {/* Source modules + action */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-1.5">
              {(item.source_modules || []).map(mod => (
                <span
                  key={mod}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider',
                    t('bg-zinc-100 text-zinc-500', 'bg-zinc-800 text-zinc-500')
                  )}
                >
                  {mod}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Dismiss */}
              <button
                onClick={onDismiss}
                className={cn(
                  'p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity',
                  t('hover:bg-zinc-100 text-zinc-400', 'hover:bg-zinc-800 text-zinc-500')
                )}
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Action button */}
              {item.action_label && !item.acted_on && (
                <Link
                  to={item.action_url || '#'}
                  onClick={(e) => {
                    onActed();
                  }}
                  className={cn(
                    'flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-colors',
                    'text-cyan-400 hover:text-cyan-300',
                    t('bg-cyan-50 hover:bg-cyan-100', 'bg-cyan-500/10 hover:bg-cyan-500/20')
                  )}
                >
                  {item.action_label}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}

              {item.acted_on && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="w-3 h-3" />
                  Done
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
