/**
 * Flows - Flow List & Management Page
 * Route: /growth/flows
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Edit2,
  Copy,
  Trash2,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUser } from '@/components/context/UserContext';
import { useToast } from '@/components/ui/use-toast';
import {
  getFlowsWithStats,
  deleteFlow,
  duplicateFlow,
  toggleFlowStatus
} from '@/services/flowService';
import QuickRunModal from '@/components/flows/QuickRunModal';

// Status badge component
function StatusBadge({ status }) {
  const statusConfig = {
    active: {
      icon: Play,
      label: 'Active',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    paused: {
      icon: Pause,
      label: 'Paused',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    draft: {
      icon: Edit2,
      label: 'Draft',
      className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    }
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// Flow card component
function FlowCard({ flow, onEdit, onDuplicate, onDelete, onToggleStatus, onQuickRun }) {
  const stats = flow.stats || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate mb-1">
            {flow.name}
          </h3>
          {flow.description && (
            <p className="text-sm text-zinc-400 line-clamp-2">
              {flow.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={() => onEdit(flow.id)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Flow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onQuickRun(flow)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
              <Play className="w-4 h-4 mr-2" />
              Quick Run
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            {flow.status === 'active' ? (
              <DropdownMenuItem onClick={() => onToggleStatus(flow.id, 'paused')} className="text-amber-400 focus:text-amber-300 focus:bg-zinc-800">
                <Pause className="w-4 h-4 mr-2" />
                Pause Flow
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onToggleStatus(flow.id, 'active')} className="text-emerald-400 focus:text-emerald-300 focus:bg-zinc-800">
                <Play className="w-4 h-4 mr-2" />
                Activate Flow
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => onDuplicate(flow.id)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(flow)} className="text-red-400 focus:text-red-300 focus:bg-zinc-800">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status */}
      <div className="mb-4">
        <StatusBadge status={flow.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Total Runs
          </div>
          <p className="text-lg font-semibold text-white">
            {stats.totalRuns || 0}
          </p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Success Rate
          </div>
          <p className="text-lg font-semibold text-emerald-400">
            {stats.successRate || 0}%
          </p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
            <RefreshCw className="w-3.5 h-3.5" />
            Running
          </div>
          <p className="text-lg font-semibold text-cyan-400">
            {stats.runningCount || 0}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Updated {new Date(flow.updated_at).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(flow.id)}
          className="h-7 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          Open Builder
        </Button>
      </div>
    </motion.div>
  );
}

// Empty state component
function EmptyState({ onCreateNew }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-6">
        <Zap className="w-10 h-10 text-cyan-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        No Outreach Flows Yet
      </h3>
      <p className="text-zinc-400 text-center max-w-md mb-6">
        Create automated outreach sequences with AI-powered personalization.
        Build flows visually with our drag-and-drop editor.
      </p>
      <Button
        onClick={onCreateNew}
        className="bg-cyan-500 hover:bg-cyan-600 text-black"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Your First Flow
      </Button>
    </motion.div>
  );
}

export default function Flows() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();

  // Data state
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [quickRunFlow, setQuickRunFlow] = useState(null);

  // Load flows
  const loadFlows = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const workspaceId = user?.company_id || user?.organization_id;
      const result = await getFlowsWithStats(workspaceId);

      if (result.success) {
        setFlows(result.flows || []);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load flows',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flows',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, [user]);

  // Filter flows
  const filteredFlows = useMemo(() => {
    return flows.filter(flow => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          flow.name?.toLowerCase().includes(searchLower) ||
          flow.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && flow.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [flows, search, statusFilter]);

  // Handlers
  const handleCreateNew = (template = null) => {
    if (template) {
      navigate(`/growth/flows/new?template=${template}`);
    } else {
      navigate('/growth/flows/new');
    }
  };

  const handleEdit = (flowId) => {
    navigate(`/growth/flows/${flowId}`);
  };

  const handleDuplicate = async (flowId) => {
    try {
      const result = await duplicateFlow(flowId);
      if (result.success) {
        toast({
          title: 'Flow Duplicated',
          description: 'A copy has been created'
        });
        loadFlows(true);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to duplicate flow',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate flow',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const result = await deleteFlow(deleteConfirm.id);
      if (result.success) {
        toast({
          title: 'Flow Deleted',
          description: 'The flow has been permanently deleted'
        });
        setFlows(prev => prev.filter(f => f.id !== deleteConfirm.id));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete flow',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete flow',
        variant: 'destructive'
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleStatus = async (flowId, newStatus) => {
    try {
      const result = await toggleFlowStatus(flowId, newStatus);
      if (result.success) {
        toast({
          title: 'Status Updated',
          description: `Flow is now ${newStatus}`
        });
        setFlows(prev => prev.map(f =>
          f.id === flowId ? { ...f, status: newStatus } : f
        ));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update status',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleQuickRun = (flow) => {
    setQuickRunFlow(flow);
  };

  // Stats summary
  const stats = useMemo(() => {
    const active = flows.filter(f => f.status === 'active').length;
    const totalRuns = flows.reduce((sum, f) => sum + (f.stats?.totalRuns || 0), 0);
    const running = flows.reduce((sum, f) => sum + (f.stats?.runningCount || 0), 0);
    return { active, totalRuns, running };
  }, [flows]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Outreach Flows
            </h1>
            <p className="text-zinc-400">
              Create and manage automated outreach sequences
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFlows(true)}
              disabled={refreshing}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Flow
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => handleCreateNew()}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Blank Flow
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCreateNew('outreach')}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Outreach Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Bar */}
        {flows.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <Play className="w-4 h-4 text-emerald-400" />
                Active Flows
              </div>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Total Executions
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalRuns}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                Currently Running
              </div>
              <p className="text-2xl font-bold text-white">{stats.running}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        {flows.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search flows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 focus:border-cyan-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
                <Filter className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : flows.length === 0 ? (
          <EmptyState onCreateNew={() => handleCreateNew('outreach')} />
        ) : filteredFlows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">No flows match your filters</p>
            <Button
              variant="link"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="mt-2 text-cyan-400"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredFlows.map(flow => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={(f) => setDeleteConfirm(f)}
                  onToggleStatus={handleToggleStatus}
                  onQuickRun={handleQuickRun}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Flow</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{deleteConfirm?.name}"? This will also cancel any
              running executions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Run Modal */}
      <QuickRunModal
        open={!!quickRunFlow}
        onOpenChange={() => setQuickRunFlow(null)}
        flow={quickRunFlow}
        onSuccess={() => {
          setQuickRunFlow(null);
          loadFlows(true);
        }}
      />
    </div>
  );
}
