import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListTodo, Zap, Clock, CheckCircle, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

// Widget metadata - these are always available
export const CORE_WIDGETS = [
  { id: 'actions_recent', name: 'Recent Actions', description: 'Latest automation activity', size: 'medium' },
  { id: 'quick_actions', name: 'Quick Actions', description: 'Fast navigation shortcuts', size: 'medium' }
];

export function RecentActionsWidget({ actions = [] }) {
  const { t } = useTheme();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <GlassCard glow="cyan" className="p-5 h-full" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn(
          'text-base font-semibold flex items-center gap-2',
          t('text-zinc-900', 'text-white')
        )}>
          <ListTodo className="w-5 h-5 text-cyan-400" />
          Recent Actions
        </h2>
        <Link
          to={createPageUrl("Actions")}
          className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
        >
          View all
        </Link>
      </div>

      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.slice(0, 4).map((action, i) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg',
                t('bg-zinc-100/60', 'bg-zinc-800/30')
              )}
            >
              {getStatusIcon(action.status)}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm truncate',
                  t('text-zinc-900', 'text-white')
                )}>
                  {action.title}
                </p>
                <p className={cn(
                  'text-xs',
                  t('text-zinc-500', 'text-zinc-400')
                )}>
                  {action.action_type?.replace(/_/g, ' ')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={cn(
          'text-center py-6 text-sm',
          t('text-zinc-400', 'text-zinc-500')
        )}>
          <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No recent actions
        </div>
      )}
    </GlassCard>
  );
}

export function QuickActionsWidget({ enabledApps = [] }) {
  const { t } = useTheme();

  const allActions = [
    { id: 'growth', label: "View Pipeline", icon: Zap, href: "GrowthPipeline", color: 'text-indigo-400 bg-indigo-500/10', app: 'growth' },
    { id: 'learn', label: "Continue Learning", icon: Zap, href: "Learn", color: 'text-cyan-400 bg-cyan-500/10', app: 'learn' },
    { id: 'sentinel', label: "Check Compliance", icon: Zap, href: "SentinelDashboard", color: 'text-[#86EFAC] bg-[#86EFAC]/10', app: 'sentinel' },
    { id: 'actions', label: "View Actions", icon: ListTodo, href: "Actions", color: 'text-amber-400 bg-amber-500/10', app: null },
  ];

  const quickActions = allActions.filter(a => !a.app || enabledApps.includes(a.app));

  return (
    <GlassCard glow="amber" className="p-5 h-full" hover={false}>
      <h2 className={cn(
        'text-base font-semibold mb-4 flex items-center gap-2',
        t('text-zinc-900', 'text-white')
      )}>
        <Zap className="w-5 h-5 text-amber-400" />
        Quick Actions
      </h2>
      <div className="space-y-2">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.03 }}
          >
            <Link to={createPageUrl(action.href)}>
              <div className={cn(
                'p-3 rounded-lg border transition-colors cursor-pointer group',
                t(
                  'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/60',
                  'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'
                )
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center',
                    action.color.split(' ')[1]
                  )}>
                    <action.icon className={cn('w-4 h-4', action.color.split(' ')[0])} />
                  </div>
                  <span className={cn(
                    'text-sm font-medium transition-colors',
                    t(
                      'text-zinc-600 group-hover:text-zinc-900',
                      'text-zinc-300 group-hover:text-white'
                    )
                  )}>
                    {action.label}
                  </span>
                  <ArrowUpRight className={cn(
                    'w-4 h-4 ml-auto transition-colors',
                    t(
                      'text-zinc-300 group-hover:text-zinc-500',
                      'text-zinc-600 group-hover:text-zinc-400'
                    )
                  )} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
