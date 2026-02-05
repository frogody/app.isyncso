import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListTodo, Zap, Clock, CheckCircle, AlertTriangle, ArrowUpRight } from 'lucide-react';

// Widget metadata - these are always available
export const CORE_WIDGETS = [
  { id: 'actions_recent', name: 'Recent Actions', description: 'Latest automation activity', size: 'medium' },
  { id: 'quick_actions', name: 'Quick Actions', description: 'Fast navigation shortcuts', size: 'medium' }
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-colors ${className}`}>
    {children}
  </div>
);

export function RecentActionsWidget({ actions = [] }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-cyan-400" />
          Recent Actions
        </h2>
        <Link to={createPageUrl("Actions")} className="text-cyan-400 text-sm hover:text-cyan-300">View all</Link>
      </div>

      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.slice(0, 4).map((action) => (
            <div key={action.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/30">
              {getStatusIcon(action.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{action.title}</p>
                <p className="text-xs text-zinc-500">{action.action_type?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No recent actions
        </div>
      )}
    </Card>
  );
}

export function QuickActionsWidget({ enabledApps = [] }) {
  const allActions = [
    { id: 'growth', label: "View Pipeline", icon: Zap, href: "GrowthPipeline", color: 'text-indigo-400 bg-indigo-500/10', app: 'growth' },
    { id: 'learn', label: "Continue Learning", icon: Zap, href: "Learn", color: 'text-cyan-400 bg-cyan-500/10', app: 'learn' },
    { id: 'sentinel', label: "Check Compliance", icon: Zap, href: "SentinelDashboard", color: 'text-[#86EFAC] bg-[#86EFAC]/10', app: 'sentinel' },
    { id: 'actions', label: "View Actions", icon: ListTodo, href: "Actions", color: 'text-amber-400 bg-amber-500/10', app: null },
  ];

  const quickActions = allActions.filter(a => !a.app || enabledApps.includes(a.app));

  return (
    <Card className="p-5 h-full">
      <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-400" />
        Quick Actions
      </h2>
      <div className="space-y-2">
        {quickActions.map((action) => (
          <Link key={action.label} to={createPageUrl(action.href)}>
            <div className="p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${action.color.split(' ')[1]}`}>
                  <action.icon className={`w-4 h-4 ${action.color.split(' ')[0]}`} />
                </div>
                <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">{action.label}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 ml-auto group-hover:text-zinc-400 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
