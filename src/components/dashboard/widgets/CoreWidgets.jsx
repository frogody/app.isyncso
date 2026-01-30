import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListTodo, Zap, Clock, CheckCircle, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// Widget metadata - these are always available
export const CORE_WIDGETS = [
  {
    id: 'actions_recent',
    name: 'Recent Actions',
    description: 'Latest automation activity',
    size: 'medium'
  },
  {
    id: 'quick_actions',
    name: 'Quick Actions',
    description: 'Fast navigation shortcuts',
    size: 'medium'
  }
];

export function RecentActionsWidget({ actions = [] }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      case 'in_progress': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-amber-400 bg-amber-500/20';
    }
  };

  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-orange-400" />
          Recent Actions
        </h2>
        <Link to={createPageUrl("Actions")} className="text-orange-400 text-sm hover:text-orange-300">View all</Link>
      </div>

      {actions.length > 0 ? (
        <div className="space-y-3">
          {actions.slice(0, 4).map((action) => (
            <div key={action.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(action.status)}`}>
                {action.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                 action.status === 'failed' ? <AlertTriangle className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{action.title}</p>
                <p className="text-xs text-zinc-500">{action.action_type?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No recent actions
        </div>
      )}
    </GlassCard>
  );
}

export function QuickActionsWidget({ enabledApps = [] }) {
  const allActions = [
    { id: 'growth', label: "View Pipeline", icon: Zap, href: "GrowthPipeline", color: "indigo", app: 'growth' },
    { id: 'learn', label: "Continue Learning", icon: Zap, href: "Learn", color: "teal", app: 'learn' },
    { id: 'sentinel', label: "Check Compliance", icon: Zap, href: "SentinelDashboard", color: "sage", app: 'sentinel' },
    { id: 'actions', label: "View Actions", icon: ListTodo, href: "Actions", color: "orange", app: null },
  ];

  const quickActions = allActions.filter(a => !a.app || enabledApps.includes(a.app));

  const colorClasses = {
    indigo: 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-400',
    sage: 'bg-[#86EFAC]/5 border-[#86EFAC]/20 hover:border-[#86EFAC]/40 hover:bg-[#86EFAC]/10 text-[#86EFAC]',
    orange: 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10 text-orange-400',
    teal: 'bg-teal-500/5 border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/10 text-teal-400'
  };

  return (
    <GlassCard className="p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-400" />
        Quick Actions
      </h2>
      <div className="space-y-2">
        {quickActions.map((action) => (
          <Link key={action.label} to={createPageUrl(action.href)}>
            <div className={`p-3 rounded-xl border transition-all cursor-pointer group ${colorClasses[action.color]}`}>
              <div className="flex items-center gap-3">
                <action.icon className="w-5 h-5" />
                <span className="text-white text-sm font-medium">{action.label}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 ml-auto group-hover:text-white transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}