import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Brain, Zap, BarChart3, BookOpen, Phone } from 'lucide-react';
import { createPageUrl } from '@/utils';

const SYNC_TABS = [
  { label: 'SYNC Agent', path: createPageUrl('SyncAgent'), icon: Brain },
  { label: 'Phone', path: createPageUrl('SyncPhone'), icon: Phone },
  { label: 'Actions', path: createPageUrl('Actions'), icon: Zap },
  { label: 'Activity', path: createPageUrl('DesktopActivity') + '?tab=overview', icon: BarChart3, matchPath: '/desktopactivity' },
  { label: 'Daily Journals', path: createPageUrl('DailyJournal'), icon: BookOpen },
];

export function SyncViewSelector({ className = '' }) {
  const location = useLocation();

  return (
    <div className={`flex items-center gap-0.5 bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-0.5 ${className}`}>
      {SYNC_TABS.map((item) => {
        const Icon = item.icon;
        const fullUrl = location.pathname + location.search;
        const itemBase = item.path?.split('?')[0];
        const isActive = item.matchPath
          ? location.pathname.toLowerCase().startsWith(item.matchPath)
          : location.pathname === itemBase;

        return (
          <Link
            key={item.label}
            to={item.path}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-zinc-800/80 text-cyan-300/90'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
