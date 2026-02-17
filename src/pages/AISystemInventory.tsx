import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Shield, Plus, Search, Cpu, AlertTriangle, CheckCircle, Clock,
  MoreHorizontal, Trash2, ArrowRight, Target, Zap, Building2, Edit,
  SearchX,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { usePagination } from '@/components/hooks/usePagination';
import { useAISystems, useComplianceStatus } from '@/hooks/sentinel';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import RiskClassificationBadge from '@/components/sentinel/RiskClassificationBadge';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import type { AISystemRecord, RiskClassification, ComplianceStatus } from '@/tokens/sentinel';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

const AISystemModal = lazy(() => import('@/components/sentinel/AISystemModal'));

const STATUS_PROGRESS: Record<string, { label: string; color: string; progress: number }> = {
  'not-started': { label: 'Not Started', color: 'text-zinc-500', progress: 0 },
  'in-progress': { label: 'In Progress', color: 'text-emerald-400', progress: 50 },
  compliant: { label: 'Compliant', color: 'text-green-400', progress: 100 },
  'non-compliant': { label: 'Non-Compliant', color: 'text-red-400', progress: 25 },
};

const RISK_ACCENT_COLORS: Record<string, string> = {
  prohibited: 'bg-red-500',
  'high-risk': 'bg-orange-500',
  gpai: 'bg-purple-500',
  'limited-risk': 'bg-yellow-500',
  'minimal-risk': 'bg-green-500',
  unclassified: 'bg-zinc-500',
};

interface SystemCardProps {
  system: AISystemRecord;
  onEdit: (system: AISystemRecord) => void;
  onDelete: (id: string) => void;
  onAssess: (id: string) => void;
  index: number;
}

function SystemCard({ system, onEdit, onDelete, onAssess, index }: SystemCardProps) {
  const { st } = useTheme();
  const statusConfig = STATUS_PROGRESS[system.compliance_status] || STATUS_PROGRESS['not-started'];
  const daysRegistered = Math.floor(
    (Date.now() - new Date(system.created_date).getTime()) / (1000 * 60 * 60 * 24),
  );

  const accentColor = RISK_ACCENT_COLORS[system.risk_classification || 'unclassified'] || 'bg-zinc-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      <SentinelCard variant="interactive" padding="none">
        {/* Top accent bar */}
        <div className={cn('h-[3px] w-full rounded-t-[inherit]', accentColor)} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3
                className={cn('font-semibold truncate transition-colors cursor-pointer', st('text-slate-900 group-hover:text-emerald-500', 'text-white group-hover:text-emerald-400'))}
                onClick={() => onEdit(system)}
              >
                {system.name}
              </h3>
              <div className="mt-1.5">
                <RiskClassificationBadge classification={system.risk_classification || 'unclassified'} />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className={cn('w-4 h-4', st('text-slate-400', 'text-zinc-400'))} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn(st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800'))}>
                <DropdownMenuItem onClick={() => onEdit(system)} className={cn(st('text-slate-700 focus:text-slate-900 focus:bg-slate-100', 'text-zinc-300 focus:text-white focus:bg-zinc-800'))}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssess(system.id)} className={cn(st('text-slate-700 focus:text-slate-900 focus:bg-slate-100', 'text-zinc-300 focus:text-white focus:bg-zinc-800'))}>
                  <Target className="w-4 h-4 mr-2" /> Risk Assessment
                </DropdownMenuItem>
                <DropdownMenuSeparator className={cn(st('bg-slate-200', 'bg-zinc-800'))} />
                <DropdownMenuItem onClick={() => onDelete(system.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Purpose */}
          <p className={cn('text-xs line-clamp-2 mb-3', st('text-slate-400', 'text-zinc-500'))}>{system.purpose || 'No purpose defined'}</p>

          {/* Compliance Status */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
              <span className={cn(st('text-slate-500', 'text-zinc-500'))}>{statusConfig.progress}%</span>
            </div>
            <div className={cn('h-1.5 rounded-full overflow-hidden', st('bg-slate-200', 'bg-zinc-800'))}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                style={{ width: `${statusConfig.progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={cn('flex items-center justify-between pt-2 border-t', st('border-slate-200', 'border-zinc-800/50'))}>
            <div className={cn('flex items-center gap-2 text-[10px]', st('text-slate-500', 'text-zinc-500'))}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysRegistered}d ago
              </span>
              {system.vendor && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {system.vendor}
                </span>
              )}
            </div>
            <SentinelButton size="sm" variant="ghost" onClick={() => onAssess(system.id)}>
              Assess <ArrowRight className="w-3 h-3 ml-1" />
            </SentinelButton>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

export default function AISystemInventory() {
  const navigate = useNavigate();
  const { systems, loading, refresh, remove } = useAISystems();
  const { totalSystems, byClassification, byStatus } = useComplianceStatus(systems);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<AISystemRecord | null>(null);

  const stats = useMemo(() => ({
    total: totalSystems,
    highRisk: byClassification['high-risk'],
    compliant: byStatus.compliant,
    unclassified: byClassification.unclassified,
  }), [totalSystems, byClassification, byStatus]);

  const filteredSystems = useMemo(() => {
    return systems.filter(system => {
      const matchesSearch = !searchTerm ||
        system.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        system.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = filterClassification === 'all' || system.risk_classification === filterClassification;
      const matchesStatus = filterStatus === 'all' || system.compliance_status === filterStatus;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [systems, searchTerm, filterClassification, filterStatus]);

  const hasActiveFilters = searchTerm || filterClassification !== 'all' || filterStatus !== 'all';

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterClassification('all');
    setFilterStatus('all');
  }, []);

  const pagination = usePagination(filteredSystems, 12);

  const handleSave = useCallback(async () => {
    await refresh();
    setShowModal(false);
    toast.success(editingSystem ? 'System updated' : 'System registered');
    setEditingSystem(null);
  }, [refresh, editingSystem]);

  const handleEdit = useCallback((system: AISystemRecord) => {
    setEditingSystem(system);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this AI system?')) return;
    try {
      await remove(id);
      toast.success('System deleted');
    } catch {
      toast.error('Failed to delete system');
    }
  }, [remove]);

  const handleAssess = useCallback((systemId: string) => {
    navigate(`${createPageUrl('RiskAssessment')}?systemId=${systemId}`);
  }, [navigate]);

  const handleCreateAndAssess = useCallback((systemId: string) => {
    setShowModal(false);
    setEditingSystem(null);
    navigate(`${createPageUrl('RiskAssessment')}?systemId=${systemId}`);
  }, [navigate]);

  const { st } = useTheme();

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="space-y-4">
          <SentinelCardSkeleton className="h-28" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <SentinelCardSkeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <SentinelCardSkeleton key={i} className="h-52" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <Cpu className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>AI System Inventory</h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{stats.total} systems registered · {stats.highRisk} high-risk</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SentinelButton
            onClick={() => { setEditingSystem(null); setShowModal(true); }}
            icon={<Plus className="w-4 h-4" />}
          >
            Register AI System
          </SentinelButton>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Cpu} label="Total Systems" value={stats.total} delay={0} accentColor="emerald" />
          <StatCard icon={AlertTriangle} label="High-Risk" value={stats.highRisk} subtitle="Requires documentation" delay={0.1} accentColor="orange" />
          <StatCard icon={CheckCircle} label="Compliant" value={stats.compliant} subtitle={`${stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0}% of total`} delay={0.2} accentColor="green" />
          <StatCard icon={Target} label="Needs Assessment" value={stats.unclassified} delay={0.3} accentColor="yellow" />
        </div>

        {/* Filters */}
        <SentinelCard padding="sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <div className="flex-1 relative w-full lg:max-w-md flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="search"
                  placeholder="Search AI systems..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={cn('pl-10', st('bg-white border-slate-300 text-slate-900 focus:border-emerald-500/40', 'bg-zinc-900/60 border-zinc-800/60 text-white focus:border-emerald-400/40'))}
                />
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full whitespace-nowrap', st('bg-slate-100 text-slate-500', 'bg-zinc-800 text-zinc-400'))}>
                {filteredSystems.length} results
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterClassification} onValueChange={setFilterClassification}>
                <SelectTrigger className={cn('w-44', st('bg-white border-slate-300 text-slate-900', 'bg-zinc-900/60 border-zinc-800/60 text-white'))}>
                  <Shield className={cn('w-4 h-4 mr-2', st('text-slate-400', 'text-zinc-400'))} />
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent className={st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                  <SelectItem value="all">All Classifications</SelectItem>
                  <SelectItem value="prohibited">Prohibited</SelectItem>
                  <SelectItem value="high-risk">High-Risk</SelectItem>
                  <SelectItem value="gpai">GPAI</SelectItem>
                  <SelectItem value="limited-risk">Limited Risk</SelectItem>
                  <SelectItem value="minimal-risk">Minimal Risk</SelectItem>
                  <SelectItem value="unclassified">Unclassified</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={cn('w-40', st('bg-white border-slate-300 text-slate-900', 'bg-zinc-900/60 border-zinc-800/60 text-white'))}>
                  <Zap className={cn('w-4 h-4 mr-2', st('text-slate-400', 'text-zinc-400'))} />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className={st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SentinelCard>

        {/* Systems Grid */}
        {filteredSystems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {pagination.items.map((system: AISystemRecord, i: number) => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAssess={handleAssess}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <SentinelButton variant="secondary" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrev}>
                  Previous
                </SentinelButton>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pagination.totalPages }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-colors',
                        i + 1 === pagination.currentPage
                          ? st('bg-emerald-500', 'bg-emerald-400')
                          : st('bg-slate-300', 'bg-zinc-700')
                      )}
                    />
                  ))}
                </div>
                <span className={cn('text-xs tabular-nums', st('text-slate-500', 'text-zinc-500'))}>
                  {pagination.currentPage}/{pagination.totalPages}
                </span>
                <SentinelButton variant="secondary" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNext}>
                  Next
                </SentinelButton>
              </div>
            )}
          </>
        ) : systems.length > 0 && hasActiveFilters ? (
          /* No search results empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', st('bg-slate-100', 'bg-zinc-900'))}>
              <SearchX className={cn('w-7 h-7', st('text-slate-400', 'text-zinc-500'))} />
            </div>
            <div className="text-center">
              <h3 className={cn('text-base font-semibold mb-1', st('text-slate-700', 'text-zinc-300'))}>No Systems Found</h3>
              <p className={cn('text-sm mb-3', st('text-slate-400', 'text-zinc-500'))}>No systems match your current filters.</p>
              <button
                onClick={resetFilters}
                className={cn(
                  'text-sm font-medium px-4 py-1.5 rounded-full transition-colors',
                  st(
                    'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
                    'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20'
                  )
                )}
              >
                Try adjusting your filters
              </button>
            </div>
          </div>
        ) : (
          /* No systems at all empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className={cn(
                'absolute inset-0 rounded-full blur-2xl opacity-30',
                st('bg-emerald-200', 'bg-emerald-400/20')
              )} />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className={cn('relative w-16 h-16 rounded-2xl flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}
              >
                <Shield className={cn('w-8 h-8', st('text-emerald-500', 'text-emerald-400'))} />
              </motion.div>
            </div>
            <div className="text-center">
              <h3 className={cn('text-base font-semibold mb-1', st('text-slate-700', 'text-zinc-300'))}>Register Your First AI System</h3>
              <p className={cn('text-sm mb-3', st('text-slate-400', 'text-zinc-500'))}>Start tracking AI systems for EU AI Act compliance.</p>
              <SentinelButton
                onClick={() => { setEditingSystem(null); setShowModal(true); }}
                icon={<Plus className="w-4 h-4" />}
              >
                Register AI System
              </SentinelButton>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
            </div>
          }
        >
          <AISystemModal
            system={editingSystem}
            onClose={() => { setShowModal(false); setEditingSystem(null); }}
            onSave={handleSave}
            onCreateAndAssess={handleCreateAndAssess}
          />
        </Suspense>
      )}
    </SentinelPageTransition>
  );
}
