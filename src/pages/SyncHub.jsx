/**
 * SyncHub - Unified SYNC page with view selector
 * Route: /sync?view=agent|journal|profile|activity
 * Lazy-loads original page components based on selected view.
 */

import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const SyncAgent = lazy(() => import('./SyncAgent'));
const DailyJournal = lazy(() => import('./DailyJournal'));
const SyncProfile = lazy(() => import('./SyncProfile'));
const DesktopActivity = lazy(() => import('./DesktopActivity'));

const VIEW_COMPONENTS = {
  agent: SyncAgent,
  journal: DailyJournal,
  profile: SyncProfile,
  activity: DesktopActivity,
};

function ViewFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
    </div>
  );
}

export default function SyncHub() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'agent';
  const ViewComponent = VIEW_COMPONENTS[view] || VIEW_COMPONENTS.agent;

  return (
    <Suspense fallback={<ViewFallback />}>
      <ViewComponent />
    </Suspense>
  );
}
