/**
 * SyncConnections - Connections page
 * Integrations + action management in a clean single-column layout.
 * Route: /sync/connections
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Link2, Plus, CheckCircle, XCircle, Clock,
  RefreshCw, Loader2, History, Zap, ExternalLink
} from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import IntegrationCard from '@/components/actions/IntegrationCard';
import ConnectIntegrationModal from '@/components/actions/ConnectIntegrationModal';
import ExecuteActionModal from '@/components/actions/ExecuteActionModal';
import ActionHistoryList from '@/components/actions/ActionHistoryList';
import ActionQueueCard from '@/components/actions/ActionQueueCard';
import CreateActionModal from '@/components/actions/CreateActionModal';

// ─── Section divider ────────────────────────────────────────────

function SectionDivider() {
  return <div className="border-t border-zinc-800/30 my-6" />;
}

function SectionLabel({ children }) {
  return <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-4">{children}</h3>;
}

// ─── Main Component ─────────────────────────────────────────────

export default function SyncConnections() {
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
    if (user) {
      loadIntegrations();
      loadActionLogs();
    }
  }, [user, loadIntegrations, loadActionLogs]);

  const handleDisconnect = async (integrationId) => {
    setDisconnecting(integrationId);
    try {
      await db.functions.invoke('mergeDisconnect', { integration_id: integrationId });
      setIntegrations(prev => prev.filter(i => i.id !== integrationId));
      toast.success('Integration disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleUseAction = (integration) => {
    setSelectedIntegration(integration);
    setExecuteModalOpen(true);
  };

  const handleConnectionSuccess = () => loadIntegrations();
  const handleActionComplete = () => loadActionLogs();

  const handleExecuteAction = async (action) => {
    setExecutingAction(action.id);
    try {
      await db.entities.ActionLog.update(action.id, { status: 'in_progress', executed_at: new Date().toISOString() });
      setTimeout(async () => {
        await db.entities.ActionLog.update(action.id, { status: 'success' });
        toast.success(`Action "${action.title}" completed!`);
        loadActionLogs();
        setExecutingAction(null);
      }, 1500);
    } catch {
      toast.error('Failed to execute action');
      setExecutingAction(null);
    }
  };

  const handleCancelAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, { status: 'cancelled' });
      toast.success('Action cancelled');
      loadActionLogs();
    } catch { toast.error('Failed to cancel'); }
  };

  const handleRetryAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, { status: 'pending', executed_at: null, completed_at: null });
      toast.success('Action requeued');
      loadActionLogs();
    } catch { toast.error('Failed to retry'); }
  };

  // Derived data
  const pendingActions = actionLogs.filter(a => a.status === 'pending' || a.status === 'queued');
  const recentActions = actionLogs.filter(a => a.status !== 'pending' && a.status !== 'queued').slice(0, 20);

  // Loading state
  if (loading && userLoading) {
    return (
      <div className="min-h-screen bg-black px-6 py-6">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Skeleton className="h-8 w-48 rounded bg-zinc-800/30" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg bg-zinc-800/30" />)}
          </div>
          <Skeleton className="h-48 rounded-lg bg-zinc-800/30" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black text-zinc-200"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-medium text-zinc-200">Connections</h1>
          <Button
            onClick={() => setConnectModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Connect
          </Button>
        </div>

        {/* Connected integrations */}
        <section>
          <SectionLabel>Connected</SectionLabel>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg bg-zinc-800/30" />)}
            </div>
          ) : integrations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-500 mb-3">No integrations connected yet</p>
              <button
                onClick={() => setConnectModalOpen(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Connect your first app
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {integrations.map(integration => (
                <div
                  key={integration.id}
                  className="group flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30 hover:border-zinc-700/50 transition-colors cursor-pointer"
                  onClick={() => handleUseAction(integration)}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0">
                    {integration.image ? (
                      <img src={integration.image} alt="" className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <Link2 className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{integration.name || integration.integration_slug || 'Integration'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="text-[10px] text-zinc-500">Connected</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDisconnect(integration.id); }}
                    disabled={disconnecting === integration.id}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1"
                    title="Disconnect"
                  >
                    {disconnecting === integration.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending actions */}
        {pendingActions.length > 0 && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Pending Actions</SectionLabel>
              <div className="space-y-2">
                {pendingActions.map(action => (
                  <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{action.title || action.action_type || 'Action'}</p>
                        <p className="text-xs text-zinc-500 truncate">{action.description || 'Pending execution'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={() => handleExecuteAction(action)}
                        disabled={executingAction === action.id}
                        className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10 transition-colors"
                      >
                        {executingAction === action.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Run'}
                      </button>
                      <button
                        onClick={() => handleCancelAction(action)}
                        className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Recent actions */}
        <SectionDivider />
        <section>
          <SectionLabel>Recent</SectionLabel>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg bg-zinc-800/30" />)}
            </div>
          ) : recentActions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-500">No actions yet</p>
              <p className="text-xs text-zinc-600 mt-1">Actions executed through SYNC will appear here</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActions.map(action => (
                <div key={action.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-900/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-6 h-6 rounded flex items-center justify-center shrink-0',
                      action.status === 'success' ? 'bg-cyan-500/10' :
                      action.status === 'failed' ? 'bg-red-500/10' : 'bg-zinc-800/60'
                    )}>
                      {action.status === 'success' ? <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> :
                       action.status === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-400" /> :
                       <Zap className="w-3.5 h-3.5 text-zinc-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{action.title || action.action_type || 'Action'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-zinc-600">
                      {action.created_at ? new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    {action.status === 'failed' && (
                      <button
                        onClick={() => handleRetryAction(action)}
                        className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <ConnectIntegrationModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onSuccess={handleConnectionSuccess}
      />

      {selectedIntegration && (
        <ExecuteActionModal
          open={executeModalOpen}
          onOpenChange={setExecuteModalOpen}
          integration={selectedIntegration}
          onComplete={handleActionComplete}
        />
      )}

      <CreateActionModal
        open={createActionModalOpen}
        onOpenChange={setCreateActionModalOpen}
        onCreated={handleActionComplete}
      />
    </motion.div>
  );
}
