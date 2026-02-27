import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Brain, Zap, BarChart3, BookOpen, UserCircle } from 'lucide-react';

const SYNC_TABS = [
  { label: 'SYNC Agent', view: 'agent', icon: Brain },
  { label: 'Daily Journals', view: 'journal', icon: BookOpen },
  { label: 'Profile', view: 'profile', icon: UserCircle },
  { label: 'Activity', view: 'activity', icon: BarChart3 },
];

export function SyncViewSelector({ className = '' }) {
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'agent';

  return (
    <div className={`flex items-center gap-0.5 bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-1 ${className}`}>
      {SYNC_TABS.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;

        return (
          <Link
            key={item.view}
            to={`/sync?view=${item.view}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-zinc-800/80 text-cyan-300/90'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
