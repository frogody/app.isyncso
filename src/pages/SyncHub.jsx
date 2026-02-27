/**
 * SyncHub - Unified SYNC page with shared header + view selector
 * Route: /sync?view=agent|journal|profile|activity
 * Renders a single shell with shared header, then embeds the selected view.
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Brain, BookOpen, UserCircle, BarChart3 } from 'lucide-react';
import { SyncViewSelector } from '@/components/sync/ui';

const SyncAgent = lazy(() => import('./SyncAgent'));
const DailyJournal = lazy(() => import('./DailyJournal'));
const SyncProfile = lazy(() => import('./SyncProfile'));
const DesktopActivity = lazy(() => import('./DesktopActivity'));

const VIEW_CONFIG = {
  agent:    { component: SyncAgent,       title: 'SYNC Agent',      icon: Brain },
  journal:  { component: DailyJournal,    title: 'Daily Journals',  icon: BookOpen },
  profile:  { component: SyncProfile,     title: 'Profile',         icon: UserCircle },
  activity: { component: DesktopActivity, title: 'Activity',        icon: BarChart3 },
};

const VIEW_LAYOUT = {
  agent:    'max-w-[1600px] mx-auto h-[calc(100dvh-7rem)] overflow-hidden flex flex-col',
  journal:  'w-full space-y-4',
  profile:  'w-full',
  activity: 'w-full space-y-4',
};

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
    </div>
  );
}

export default function SyncHub() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'agent';
  const config = VIEW_CONFIG[view] || VIEW_CONFIG.agent;
  const ViewComponent = config.component;
  const Icon = config.icon;

  const [headerControls, setHeaderControls] = useState(null);

  // Reset header controls when switching views
  useEffect(() => {
    setHeaderControls(null);
  }, [view]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full px-4 lg:px-6 py-4">
        {/* Shared header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-lg font-medium text-zinc-200">{config.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {headerControls}
            <SyncViewSelector />
          </div>
        </div>

        {/* Content area */}
        <div className={VIEW_LAYOUT[view] || VIEW_LAYOUT.agent}>
          <Suspense fallback={<ViewFallback />}>
            <ViewComponent embedded onRegisterControls={setHeaderControls} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
