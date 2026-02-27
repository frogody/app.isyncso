import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Phone,
  Link
} from 'lucide-react';

import { SyncViewSelector } from '@/components/sync/ui';
import IntegrationCard from '@/components/actions/IntegrationCard';
import ConnectIntegrationModal from '@/components/actions/ConnectIntegrationModal';
import ExecuteActionModal from '@/components/actions/ExecuteActionModal';
import ActionHistoryList from '@/components/actions/ActionHistoryList';
import ActionQueueCard from '@/components/actions/ActionQueueCard';
import CreateActionModal from '@/components/actions/CreateActionModal';

// Lazy load phone panel (compact layout designed for Actions context)
const ActionsPhonePanel = lazy(() => import('@/components/actions/ActionsPhonePanel'));

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

// ---------------------------------------------------------------------------
// Motion presets (matching StoreDashboard)
// ---------------------------------------------------------------------------

const SLIDE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = (delay = 0) => ({
  ...SLIDE_UP,
  transition: { ...SLIDE_UP.transition, delay },
});

export default function Actions() {
  const { user, isLoading: userLoading } = useUser();
  const [integrations, setIntegrations] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [createActionModalOpen, setCreateActionModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [executingAction, setExecutingAction] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRides, setShowRides] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const loadIntegrations = useCallback(async () => {
    if (!user) return;

    try {
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

  // Derived data
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
      <div className="bg-black min-h-screen px-4 lg:px-6 py-4">
        <div className="space-y-4">
          <Skeleton className="h-14 w-full bg-zinc-800 rounded-[20px]" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-[20px]" />)}
          </div>
          <Skeleton className="h-64 w-full bg-zinc-800 rounded-[20px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen px-4 lg:px-6 py-4 space-y-4">

      {/* ── Header ── */}
      <motion.div {...stagger(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Actions</h1>
            <p className="text-sm text-zinc-400">Automations & integrations</p>
          </div>
          {approvalActions.length > 0 && (
            <Badge className="bg-amber-950/40 text-amber-300/80 border-amber-800/30 text-[10px] ml-1">
              {approvalActions.length} Needs Approval
            </Badge>
          )}
        </div>
        <SyncViewSelector />
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Link}
          label="Connected Apps"
          value={activeCount}
          color="cyan"
          delay={0.05}
        />
        <StatCard
          icon={Zap}
          label="Actions Run"
          value={actionLogs.length}
          color="blue"
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          label="Pending Queue"
          value={queuedActions.length + inProgressActions.length}
          color="amber"
          delay={0.15}
        />
        <StatCard
          icon={CheckCircle}
          label="Success Rate"
          value={`${successRate}%`}
          color="green"
          delay={0.2}
        />
      </div>

      {/* ── Action Buttons ── */}
      <motion.div {...stagger(0.25)} className="flex items-center gap-2">
        <Button onClick={() => setConnectModalOpen(true)} className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs px-3 py-1.5 h-auto">
          <Plug className="w-3 h-3 mr-1.5" />
          Connect
        </Button>
        <Button onClick={() => setCreateActionModalOpen(true)} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium text-xs px-3 py-1.5 h-auto">
          <Plus className="w-3 h-3 mr-1.5" />
          New Action
        </Button>
        <Button onClick={() => { setShowRides(!showRides); setShowPhone(false); }} className={`border text-xs px-3 py-1.5 h-auto ${showRides ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/1850cd012_claude-color.png" alt="Claude" className="w-3.5 h-3.5 mr-1.5" loading="lazy" decoding="async" />
          Rides
        </Button>
        <Button onClick={() => { setShowPhone(!showPhone); setShowRides(false); }} className={`border text-xs px-3 py-1.5 h-auto ${showPhone ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
          <Phone className="w-3 h-3 mr-1.5" />
          Phone
        </Button>
        <div className="flex-1" />
        <Button onClick={loadActionLogs} className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs px-3 py-1.5 h-auto">
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Refresh
        </Button>
      </motion.div>

      {/* ── Rides Panel (expandable) ── */}
      {showRides && (
        <motion.div {...stagger(0.1)}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-4">
            <Suspense fallback={<div className="space-y-3"><Skeleton className="h-20 bg-zinc-800 rounded-xl" /><div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 bg-zinc-800 rounded-xl" />)}</div></div>}>
              {!selectedRide ? (
                <RideSelector onSelectRide={setSelectedRide} selectedRide={selectedRide} />
              ) : (
                <div>
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
                </div>
              )}
            </Suspense>
          </div>
        </motion.div>
      )}

      {/* ── Phone Panel (expandable) ── */}
      {showPhone && (
        <motion.div {...stagger(0.1)}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm overflow-hidden" style={{ height: 'calc(100dvh - 340px)', minHeight: '460px' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>}>
              <ActionsPhonePanel />
            </Suspense>
          </div>
        </motion.div>
      )}

      {/* ── Approval Banner ── */}
      {approvalActions.length > 0 && (
        <motion.div {...stagger(0.3)}>
          <div className="rounded-[20px] border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-3">
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
        </motion.div>
      )}

      {/* ── Main Dashboard Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Action Queue Card ── */}
        <motion.div {...stagger(0.3)}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Action Queue</h3>
                  <p className="text-xs text-zinc-500">{queuedActions.length + inProgressActions.length} pending</p>
                </div>
              </div>
            </div>

            {/* SYNC Activity Feed */}
            {recentSyncActions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-3.5 h-3.5 text-cyan-400/70" />
                  <span className="text-xs font-medium text-zinc-300">SYNC Activity</span>
                  <span className="text-[10px] text-zinc-500">Actions taken on your behalf</span>
                </div>
                <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-2 space-y-1">
                  {recentSyncActions.slice(0, 5).map((action, i) => (
                    <ActionQueueCard key={action.id} action={action} index={i} compact />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Manual Actions */}
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-zinc-800 rounded-xl" />)}
              </div>
            ) : [...inProgressActions, ...queuedActions].length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                  <ListTodo className="w-6 h-6 text-zinc-600" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">No Pending Actions</h4>
                <p className="text-zinc-500 text-xs mb-4">SYNC will queue actions here when they need your approval</p>
                <Button onClick={() => setCreateActionModalOpen(true)} className="bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 h-auto">
                  <Plus className="w-3 h-3 mr-1" />Create Action
                </Button>
              </div>
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
        </motion.div>

        {/* ── Action History Card ── */}
        <motion.div {...stagger(0.35)}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <History className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Action History</h3>
                  <p className="text-xs text-zinc-500">{actionLogs.length} actions executed</p>
                </div>
              </div>
            </div>
            <ActionHistoryList actions={actionLogs} loading={logsLoading} />
          </div>
        </motion.div>
      </div>

      {/* ── Connected Integrations Card (full width) ── */}
      <motion.div {...stagger(0.4)}>
        <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Plug className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Connected Integrations</h3>
                <p className="text-xs text-zinc-500">{activeCount} connected</p>
              </div>
            </div>
            <Button size="sm" onClick={loadIntegrations} className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs px-2 py-1 h-auto">
              <RefreshCw className="w-3 h-3 mr-1" />Refresh
            </Button>
          </div>

          {integrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-4">
                <Plug className="w-7 h-7 text-cyan-400/70" />
              </div>
              <h4 className="text-base font-bold text-zinc-100 mb-2">Connect Your First Integration</h4>
              <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
                Connect your favorite tools like HubSpot, Jira, Salesforce, and more to execute actions directly from ISYNCSO.
              </p>
              <Button onClick={() => setConnectModalOpen(true)} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium text-xs px-4 py-2 h-auto">
                <Plus className="w-4 h-4 mr-1" />
                Connect Integration
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </motion.div>

      {/* ── Modals ── */}
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
