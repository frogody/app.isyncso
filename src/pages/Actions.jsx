import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import {
  Zap,
  Plus,
  Plug,
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Ticket,
  Building2,
  Briefcase,
  Calculator,
  FolderOpen,
  ArrowRight,
  Send,
  Sparkles,
  TrendingUp,
  Activity,
  ChevronRight,
  Settings,
  ExternalLink,
  ListTodo,
  Play,
  Loader2,
  CircleDot,
  ShieldCheck,
  Bot,
  Phone
} from 'lucide-react';

import { SyncViewSelector } from '@/components/sync/ui';
import IntegrationCard from '@/components/actions/IntegrationCard';
import ConnectIntegrationModal from '@/components/actions/ConnectIntegrationModal';
import ExecuteActionModal from '@/components/actions/ExecuteActionModal';
import ActionHistoryList from '@/components/actions/ActionHistoryList';
import ActionQueueCard from '@/components/actions/ActionQueueCard';
import CreateActionModal from '@/components/actions/CreateActionModal';

// Lazy load phone components
const LazyPhoneTab = lazy(() => import('@/components/inbox/phone').then(mod => {
  const { useSyncPhone, PhoneDashboard } = mod;
  // Wrapper component that calls the hook and renders PhoneDashboard
  return { default: function PhoneTab() {
    const syncPhone = useSyncPhone();
    return <PhoneDashboard {...syncPhone} />;
  }};
}));

// Lazy load ride components
const RideSelector = lazy(() => import('@/components/rides/RideSelector'));
const ClayCampaignBuilder = lazy(() => import('@/components/growth/ClayCampaignBuilder'));
const LinkedInOutreachRide = lazy(() => import('@/components/rides/LinkedInOutreachRide'));
const SalesNavResearchRide = lazy(() => import('@/components/rides/SalesNavResearchRide'));
const ColdEmailRide = lazy(() => import('@/components/rides/ColdEmailRide'));
const CompetitiveIntelRide = lazy(() => import('@/components/rides/CompetitiveIntelRide'));
const HubSpotWorkflowRide = lazy(() => import('@/components/rides/HubSpotWorkflowRide'));

const CATEGORY_ICONS = {
  crm: Users,
  ticketing: Ticket,
  hris: Building2,
  ats: Briefcase,
  accounting: Calculator,
  filestorage: FolderOpen
};

const CATEGORY_GRADIENTS = {
  crm: 'from-indigo-500 to-purple-500',
  ticketing: 'from-orange-500 to-amber-500',
  hris: 'from-green-500 to-emerald-500',
  ats: 'from-purple-500 to-pink-500',
  accounting: 'from-blue-500 to-cyan-500',
  filestorage: 'from-cyan-500 to-teal-500'
};

export default function Actions() {
  const { user, isLoading: userLoading } = useUser();
  const [integrations, setIntegrations] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [createActionModalOpen, setCreateActionModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [executingAction, setExecutingAction] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);

  const loadIntegrations = useCallback(async () => {
    if (!user) return;

    try {
      // RLS handles filtering - list all accessible integrations
      const data = await db.entities.MergeIntegration?.list?.({ limit: 50 }).catch(() => []) || [];
      setIntegrations((data || []).filter(i => i.status === 'active'));
    } catch (error) {
      console.warn('Error loading integrations:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadActionLogs = useCallback(async () => {
    if (!user) return;

    setLogsLoading(true);
    try {
      // RLS handles filtering - list all accessible logs
      const data = await db.entities.ActionLog?.list?.({ limit: 50 }).catch(() => []) || [];
      setActionLogs(data || []);
    } catch (error) {
      console.warn('Error loading action logs:', error.message);
    } finally {
      setLogsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      loadIntegrations().then(() => { if (!isMounted) return; });
      loadActionLogs().then(() => { if (!isMounted) return; });
    }
    return () => { isMounted = false; };
  }, [user, loadIntegrations, loadActionLogs]);

  const handleDisconnect = async (integrationId) => {
    setDisconnecting(integrationId);
    try {
      await db.functions.invoke('mergeDisconnect', {
        integration_id: integrationId
      });
      setIntegrations(prev => prev.filter(i => i.id !== integrationId));
      toast.success('Integration disconnected');
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleUseAction = (integration) => {
    setSelectedIntegration(integration);
    setExecuteModalOpen(true);
  };

  const handleConnectionSuccess = () => {
    loadIntegrations();
  };

  const handleActionComplete = () => {
    loadActionLogs();
  };

  const handleExecuteAction = async (action) => {
    setExecutingAction(action.id);
    try {
      await db.entities.ActionLog.update(action.id, { 
        status: 'in_progress',
        executed_at: new Date().toISOString()
      });
      
      // Simulate execution - in real app this would call the actual integration
      setTimeout(async () => {
        await db.entities.ActionLog.update(action.id, { status: 'success' });
        toast.success(`Action "${action.title}" completed!`);
        loadActionLogs();
        setExecutingAction(null);
      }, 1500);
    } catch (error) {
      toast.error('Failed to execute action');
      setExecutingAction(null);
    }
  };

  const handleCancelAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, { status: 'cancelled' });
      toast.success('Action cancelled');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to cancel action');
    }
  };

  const handleRetryAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, { 
        status: 'queued',
        retry_count: (action.retry_count || 0) + 1,
        error_message: null
      });
      toast.success('Action requeued');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to retry action');
    }
  };

  const handleDeleteAction = async (action) => {
    try {
      await db.entities.ActionLog.delete(action.id);
      toast.success('Action deleted');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to delete action');
    }
  };

  const handleApproveAction = async (action) => {
    setExecutingAction(action.id);
    try {
      await db.entities.ActionLog.update(action.id, {
        status: 'in_progress',
        executed_at: new Date().toISOString()
      });
      toast.success(`Approved: "${action.title}"`);
      // Execute the action (same flow as handleExecuteAction)
      setTimeout(async () => {
        await db.entities.ActionLog.update(action.id, { status: 'success' });
        toast.success(`Action "${action.title}" completed!`);
        loadActionLogs();
        setExecutingAction(null);
      }, 1500);
    } catch (error) {
      toast.error('Failed to approve action');
      setExecutingAction(null);
    }
  };

  const handleRejectAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, { status: 'rejected' });
      toast.success('Action rejected');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to reject action');
    }
  };

  const activeCount = integrations.length;
  const SYNC_SOURCES = ['ai_agent', 'sync', 'automation', 'workflow'];
  const approvalActions = actionLogs.filter(a => a.status === 'pending_approval');
  const syncActions = actionLogs.filter(a => SYNC_SOURCES.includes(a.source));
  const recentSyncActions = syncActions.filter(a => a.status === 'success' || a.status === 'in_progress').slice(0, 10);
  const queuedActions = actionLogs.filter(a => a.status === 'queued');
  const inProgressActions = actionLogs.filter(a => a.status === 'in_progress');
  const successfulActions = actionLogs.filter(a => a.status === 'success').length;
  const failedActions = actionLogs.filter(a => a.status === 'failed').length;
  const successRate = actionLogs.length > 0 ? Math.round((successfulActions / actionLogs.length) * 100) : 0;

  if (userLoading || loading) {
    return (
      <div className="bg-black p-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <Skeleton className="h-20 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 bg-zinc-800 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-3 space-y-3">
        {/* Header row with title + view selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">SYNC Actions</h1>
                {approvalActions.length > 0 && (
                  <Badge className="bg-amber-950/40 text-amber-300/80 border-amber-800/30 text-[10px]">
                    {approvalActions.length} Needs Approval
                  </Badge>
                )}
              </div>
              <p className="text-zinc-500 text-xs">Actions taken by SYNC on your behalf</p>
            </div>
          </div>
          <SyncViewSelector />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={() => setConnectModalOpen(true)} className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs px-3 py-1.5 h-auto">
            <Plug className="w-3 h-3 mr-1.5" />
            Connect
          </Button>
          <Button onClick={() => setCreateActionModalOpen(true)} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium text-xs px-3 py-1.5 h-auto">
            <Plus className="w-3 h-3 mr-1.5" />
            New Action
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-2">
          <div className={`px-3 py-2 rounded-xl flex items-center gap-3 ${approvalActions.length > 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-900/50 border border-zinc-800/60'}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${approvalActions.length > 0 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-800/80 border border-zinc-700/40'}`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${approvalActions.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
            </div>
            <div>
              <div className={`text-sm font-bold ${approvalActions.length > 0 ? 'text-amber-300' : 'text-zinc-100'}`}>{approvalActions.length}</div>
              <div className="text-[10px] text-zinc-500">Approval</div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-cyan-400/70" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">{queuedActions.length}</div>
              <div className="text-[10px] text-zinc-500">Queued</div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
              <Loader2 className={`w-3.5 h-3.5 text-cyan-300/70 ${inProgressActions.length > 0 ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">{inProgressActions.length}</div>
              <div className="text-[10px] text-zinc-500">Running</div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400/70" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">{successfulActions}</div>
              <div className="text-[10px] text-zinc-500">Done</div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
              <XCircle className="w-3.5 h-3.5 text-red-400/60" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">{failedActions}</div>
              <div className="text-[10px] text-zinc-500">Failed</div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== 'rides') setSelectedRide(null); }}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1 gap-1">
            <TabsTrigger value="queue" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-3 text-sm">
              <ListTodo className="w-4 h-4 mr-1" />Queue
              {queuedActions.length > 0 && <Badge className="ml-1 bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-[10px] px-1">{queuedActions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rides" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-3 text-sm">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/1850cd012_claude-color.png" alt="Claude" className="w-4 h-4 mr-1" />Claude Rides
              <Badge className="ml-1 bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-[10px] px-1">New</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-3 text-sm">
              <History className="w-4 h-4 mr-1" />History
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-3 text-sm">
              <Plug className="w-4 h-4 mr-1" />Integrations
            </TabsTrigger>
            <TabsTrigger value="phone" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-3 text-sm">
              <Phone className="w-4 h-4 mr-1" />Phone
            </TabsTrigger>
          </TabsList>

          {/* Rides Tab */}
          <TabsContent value="rides" className="mt-4">
            <Suspense fallback={<div className="space-y-3"><Skeleton className="h-20 bg-zinc-800 rounded-xl" /><div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 bg-zinc-800 rounded-xl" />)}</div></div>}>
              {!selectedRide ? (
                <RideSelector onSelectRide={setSelectedRide} selectedRide={selectedRide} />
              ) : (
                <GlassCard hover={false} className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRide(null)} className="text-zinc-400 hover:text-white text-xs px-2 py-1 h-auto">
                      ← Back to Rides
                    </Button>
                  </div>
                  {selectedRide === 'clay' && <ClayCampaignBuilder />}
                  {selectedRide === 'linkedin' && <LinkedInOutreachRide />}
                  {selectedRide === 'salesNav' && <SalesNavResearchRide />}
                  {selectedRide === 'coldEmail' && <ColdEmailRide />}
                  {selectedRide === 'competitive' && <CompetitiveIntelRide />}
                  {selectedRide === 'hubspot' && <HubSpotWorkflowRide />}
                </GlassCard>
              )}
            </Suspense>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue" className="mt-4 space-y-4">
            {/* Needs Approval Section */}
            {approvalActions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Needs Your Approval
                    <Badge className="bg-amber-950/40 text-amber-300/80 border-amber-800/30 text-[10px] px-1.5">{approvalActions.length}</Badge>
                  </h3>
                </div>
                <div className="space-y-2">
                  {approvalActions.map((action, i) => (
                    <ActionQueueCard
                      key={action.id}
                      action={action}
                      index={i}
                      onApprove={handleApproveAction}
                      onReject={handleRejectAction}
                      onDelete={handleDeleteAction}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* SYNC Activity + Queued Actions */}
              <div className="lg:col-span-2 space-y-4">
                {/* SYNC Activity Feed */}
                {recentSyncActions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-cyan-400/70" />
                        SYNC Activity
                        <span className="text-[10px] text-zinc-500 font-normal">Actions taken on your behalf</span>
                      </h3>
                      <Button size="sm" onClick={loadActionLogs} className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs px-2 py-1 h-auto">
                        <RefreshCw className="w-3 h-3 mr-1" />Refresh
                      </Button>
                    </div>
                    <GlassCard hover={false} className="p-3 space-y-1">
                      {recentSyncActions.map((action, i) => (
                        <ActionQueueCard key={action.id} action={action} index={i} compact />
                      ))}
                    </GlassCard>
                  </div>
                )}

                {/* Pending Manual Actions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400/70" />
                      Pending Actions
                    </h3>
                    {recentSyncActions.length === 0 && (
                      <Button size="sm" onClick={loadActionLogs} className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs px-2 py-1 h-auto">
                        <RefreshCw className="w-3 h-3 mr-1" />Refresh
                      </Button>
                    )}
                  </div>

                  {logsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
                    </div>
                  ) : [...inProgressActions, ...queuedActions].length === 0 ? (
                    <GlassCard hover={false} className="p-6">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                          <ListTodo className="w-6 h-6 text-zinc-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1">No Pending Actions</h4>
                        <p className="text-zinc-500 text-xs mb-4">SYNC will queue actions here when they need your approval</p>
                        <Button onClick={() => setCreateActionModalOpen(true)} className="bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 h-auto">
                          <Plus className="w-3 h-3 mr-1" />Create Action
                        </Button>
                      </div>
                    </GlassCard>
                  ) : (
                    <div className="space-y-2">
                      {[...inProgressActions, ...queuedActions].map((action, i) => (
                        <ActionQueueCard
                          key={action.id}
                          action={action}
                          index={i}
                          onExecute={handleExecuteAction}
                          onCancel={handleCancelAction}
                          onRetry={handleRetryAction}
                          onDelete={handleDeleteAction}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar: Recently Completed */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyan-400/70" />
                  Recently Completed
                </h3>

                <GlassCard hover={false} className="p-3 space-y-1">
                  {actionLogs.filter(a => a.status === 'success' || a.status === 'failed').slice(0, 5).length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-3">No completed actions yet</p>
                  ) : (
                    actionLogs.filter(a => a.status === 'success' || a.status === 'failed').slice(0, 5).map((action, i) => (
                      <ActionQueueCard key={action.id} action={action} index={i} compact />
                    ))
                  )}
                </GlassCard>
              </div>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-4">
            {integrations.length === 0 ? (
              <div className="p-8 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="text-center max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mx-auto mb-4">
                    <Plug className="w-7 h-7 text-cyan-400/70" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">Connect Your First Integration</h3>
                  <p className="text-zinc-500 text-sm mb-4">
                    Connect your favorite tools like HubSpot, Jira, Salesforce, and more to execute actions directly from ISYNCSO.
                  </p>
                  <Button onClick={() => setConnectModalOpen(true)} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium text-xs px-4 py-2 h-auto">
                    <Plus className="w-4 h-4 mr-1" />
                    Connect Integration
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200">Connected Integrations</h3>
                  <Button size="sm" onClick={loadIntegrations} className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs px-2 py-1 h-auto">
                    <RefreshCw className="w-3 h-3 mr-1" />Refresh
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {integrations.map((integration, index) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onDisconnect={handleDisconnect}
                      onUseAction={handleUseAction}
                      isDisconnecting={disconnecting === integration.id}
                      index={index}
                    />
                  ))}
                  
                  {/* Add More Card */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: integrations.length * 0.1 }}
                    onClick={() => setConnectModalOpen(true)}
                    className="p-4 rounded-xl border border-dashed border-zinc-700/60 hover:border-cyan-800/40 bg-zinc-900/30 transition-all flex flex-col items-center justify-center min-h-[140px] group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 group-hover:bg-zinc-800 flex items-center justify-center mb-2 transition-colors">
                      <Plus className="w-5 h-5 text-zinc-600 group-hover:text-cyan-400/70 transition-colors" />
                    </div>
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">Add Integration</span>
                  </motion.button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Phone Tab */}
          <TabsContent value="phone" className="mt-4">
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden" style={{ height: 'calc(100dvh - 280px)', minHeight: '500px' }}>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>}>
                <LazyPhoneTab />
              </Suspense>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                    <History className="w-4 h-4 text-cyan-400/70" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Action History</h3>
                    <p className="text-xs text-zinc-500">{actionLogs.length} actions executed</p>
                  </div>
                </div>
                <Button size="sm" onClick={loadActionLogs} className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs px-2 py-1 h-auto">
                  <RefreshCw className="w-3 h-3 mr-1" />Refresh
                </Button>
              </div>
              <ActionHistoryList actions={actionLogs} loading={logsLoading} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ConnectIntegrationModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={handleConnectionSuccess}
        existingIntegrations={integrations}
      />

      <ExecuteActionModal
        open={executeModalOpen}
        onClose={() => {
          setExecuteModalOpen(false);
          setSelectedIntegration(null);
        }}
        integration={selectedIntegration}
        onActionComplete={handleActionComplete}
      />

      <CreateActionModal
        open={createActionModalOpen}
        onClose={() => setCreateActionModalOpen(false)}
        onSuccess={() => loadActionLogs()}
        userId={user?.id}
      />
    </div>
  );
}