/**
 * ExecutionMonitor - Real-time Flow Execution Monitoring
 * Route: /growth/executions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Workflow,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Zap,
  MoreVertical,
  StopCircle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/components/context/UserContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/api/supabaseClient';
import ExecutionDetail from '@/components/flows/ExecutionDetail';

// Status configuration
const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20'
  },
  running: {
    icon: Activity,
    label: 'Running',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    animated: true
  },
  waiting: {
    icon: Clock,
    label: 'Waiting',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  paused: {
    icon: Pause,
    label: 'Paused',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  },
  cancelled: {
    icon: StopCircle,
    label: 'Cancelled',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20'
  }
};

// Status badge component
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.bg} ${config.border} ${config.color}`}>
      <Icon className={`w-3 h-3 ${config.animated ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

// Duration formatter
function formatDuration(startTime, endTime = null) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;

  if (diffMs < 1000) return '< 1s';
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s`;
  if (diffMs < 3600000) {
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// Execution row component
function ExecutionRow({ execution, isExpanded, onToggle, onAction }) {
  const flow = execution.outreach_flows || {};
  const prospect = execution.prospects || {};
  const nodeExecutions = execution.node_executions || [];

  const completedNodes = nodeExecutions.filter(n => n.status === 'completed').length;
  const totalNodes = flow.nodes?.length || 0;
  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  const displayName = prospect.full_name || prospect.name || prospect.email || 'Unknown';

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Main Row */}
      <div
        className={`p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {/* Expand Icon */}
          <button className="p-1 text-zinc-500 hover:text-white">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Status */}
          <StatusBadge status={execution.status} />

          {/* Flow Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Workflow className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">
              {flow.name || 'Unknown Flow'}
            </span>
          </div>

          {/* Prospect */}
          <div className="flex items-center gap-2 min-w-0 w-48">
            <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-300 truncate">{displayName}</span>
          </div>

          {/* Progress */}
          <div className="w-32 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 w-10">
                {completedNodes}/{totalNodes}
              </span>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">
              {formatDuration(execution.started_at || execution.created_at, execution.completed_at)}
            </span>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1.5 hover:bg-zinc-700 rounded">
                <MoreVertical className="w-4 h-4 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              {execution.status === 'running' && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onAction('pause', execution.id); }}
                  className="text-amber-400 focus:text-amber-300"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {execution.status === 'paused' && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onAction('resume', execution.id); }}
                  className="text-emerald-400 focus:text-emerald-300"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </DropdownMenuItem>
              )}
              {['running', 'pending', 'waiting', 'paused'].includes(execution.status) && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onAction('cancel', execution.id); }}
                  className="text-red-400 focus:text-red-300"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              )}
              {execution.status === 'failed' && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onAction('retry', execution.id); }}
                  className="text-cyan-400 focus:text-cyan-300"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Test Mode Badge */}
        {execution.execution_context?.test_mode && (
          <div className="mt-2 ml-9">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Zap className="w-3 h-3" />
              Test Mode
            </span>
          </div>
        )}
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ExecutionDetail execution={execution} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Activity className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No Executions Yet</h3>
      <p className="text-zinc-400 text-center max-w-md">
        Run a flow on a prospect to see execution details here.
        You can monitor progress in real-time.
      </p>
    </div>
  );
}

export default function ExecutionMonitor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { toast } = useToast();

  // State
  const [executions, setExecutions] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(searchParams.get('executionId') || null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flowFilter, setFlowFilter] = useState('all');

  // Load executions
  const loadExecutions = useCallback(async () => {
    try {
      const workspaceId = user?.company_id || user?.organization_id;
      if (!workspaceId) return;

      const { data, error } = await supabase
        .from('flow_executions')
        .select(`
          *,
          outreach_flows(id, name, nodes),
          prospects(id, name, full_name, email, company, company_name),
          node_executions(id, node_id, status, started_at, completed_at, error_message)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load flows for filter
  const loadFlows = useCallback(async () => {
    try {
      const workspaceId = user?.company_id || user?.organization_id;
      if (!workspaceId) return;

      const { data, error } = await supabase
        .from('outreach_flows')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Failed to load flows:', error);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadExecutions();
    loadFlows();
  }, [loadExecutions, loadFlows]);

  // Auto-refresh with polling
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadExecutions();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadExecutions]);

  // Real-time subscription
  useEffect(() => {
    const workspaceId = user?.company_id || user?.organization_id;
    if (!workspaceId) return;

    const channel = supabase
      .channel('execution-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flow_executions',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          loadExecutions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'node_executions'
        },
        () => {
          loadExecutions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadExecutions]);

  // Filter executions
  const filteredExecutions = useMemo(() => {
    return executions.filter(exec => {
      // Status filter
      if (statusFilter !== 'all' && exec.status !== statusFilter) {
        return false;
      }

      // Flow filter
      if (flowFilter !== 'all' && exec.flow_id !== flowFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const flowName = exec.outreach_flows?.name?.toLowerCase() || '';
        const prospectName = (exec.prospects?.full_name || exec.prospects?.name || '').toLowerCase();
        const prospectEmail = exec.prospects?.email?.toLowerCase() || '';

        if (!flowName.includes(searchLower) &&
            !prospectName.includes(searchLower) &&
            !prospectEmail.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [executions, statusFilter, flowFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const running = executions.filter(e => e.status === 'running').length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const total = executions.length;
    return { running, completed, failed, total };
  }, [executions]);

  // Actions
  const handleAction = async (action, executionId) => {
    try {
      let updates = {};

      switch (action) {
        case 'pause':
          updates = { status: 'paused', paused_at: new Date().toISOString() };
          break;
        case 'resume':
          updates = { status: 'running', paused_at: null };
          break;
        case 'cancel':
          updates = {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Manually cancelled'
          };
          break;
        case 'retry':
          updates = { status: 'pending', error_message: null, completed_at: null };
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('flow_executions')
        .update(updates)
        .eq('id', executionId);

      if (error) throw error;

      toast({
        title: 'Execution Updated',
        description: `Execution ${action}ed successfully`
      });

      loadExecutions();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} execution`,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Execution Monitor
            </h1>
            <p className="text-zinc-400">
              Track flow executions in real-time
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`border-zinc-700 ${autoRefresh ? 'bg-cyan-500/10 border-cyan-500/50' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin text-cyan-400' : ''}`} />
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </Button>

            <Button
              onClick={() => navigate('/growth/flows')}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
            >
              <Workflow className="w-4 h-4 mr-2" />
              Manage Flows
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
              <Activity className="w-4 h-4" />
              Total Executions
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              Running
            </div>
            <p className="text-2xl font-bold text-cyan-400">{stats.running}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Completed
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              Failed
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by flow or prospect..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 focus:border-cyan-500"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
              <Filter className="w-4 h-4 mr-2 text-zinc-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={flowFilter} onValueChange={setFlowFilter}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
              <Workflow className="w-4 h-4 mr-2 text-zinc-400" />
              <SelectValue placeholder="Flow" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Flows</SelectItem>
              {flows.map(flow => (
                <SelectItem key={flow.id} value={flow.id}>
                  {flow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Executions List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredExecutions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filteredExecutions.map(execution => (
              <ExecutionRow
                key={execution.id}
                execution={execution}
                isExpanded={expandedId === execution.id}
                onToggle={() => setExpandedId(expandedId === execution.id ? null : execution.id)}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
