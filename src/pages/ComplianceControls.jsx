import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Shield, CheckSquare, Search, ChevronDown, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, AlertTriangle, XCircle, MinusCircle, FileText,
  Zap, Save, ListChecks, SlidersHorizontal, Hash, SquareCheck, Square,
  Loader2, Eye, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelInput } from '@/components/sentinel/ui/SentinelInput';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import { MOTION_VARIANTS } from '@/tokens/sentinel';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';

// ─── Status Configuration ─────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not-implemented', label: 'Not Implemented' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'failing', label: 'Failing' },
  { value: 'not-applicable', label: 'Not Applicable' },
];

const STATUS_CONFIG = {
  'not-implemented': { label: 'Not Implemented', variant: 'neutral',  icon: MinusCircle,  dotLight: 'bg-slate-400',    dotDark: 'bg-zinc-500' },
  'in-progress':     { label: 'In Progress',     variant: 'warning',  icon: Clock,        dotLight: 'bg-yellow-500',   dotDark: 'bg-yellow-400' },
  'implemented':     { label: 'Implemented',     variant: 'success',  icon: CheckCircle2, dotLight: 'bg-emerald-500',  dotDark: 'bg-emerald-400' },
  'failing':         { label: 'Failing',         variant: 'error',    icon: XCircle,      dotLight: 'bg-red-500',      dotDark: 'bg-red-400' },
  'not-applicable':  { label: 'N/A',             variant: 'neutral',  icon: MinusCircle,  dotLight: 'bg-slate-300',    dotDark: 'bg-zinc-600' },
};

// ─── Severity Configuration ───────────────────────────────────────
const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', variant: 'error',   bgLight: 'bg-red-50 border-red-200 text-red-700',          bgDark: 'bg-red-500/10 border-red-500/30 text-red-400' },
  high:     { label: 'High',     variant: 'warning',  bgLight: 'bg-orange-50 border-orange-200 text-orange-700',  bgDark: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
  medium:   { label: 'Medium',   variant: 'neutral',  bgLight: 'bg-yellow-50 border-yellow-200 text-yellow-700',  bgDark: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
  low:      { label: 'Low',      variant: 'neutral',  bgLight: 'bg-emerald-50 border-emerald-200 text-emerald-700', bgDark: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
};

// ─── Bulk Action Options ──────────────────────────────────────────
const BULK_ACTIONS = [
  { value: 'implemented',    label: 'Mark Implemented', icon: CheckCircle2 },
  { value: 'in-progress',    label: 'Mark In Progress', icon: Clock },
  { value: 'not-applicable', label: 'Mark N/A',         icon: MinusCircle },
];

// ─── Select Dropdown ──────────────────────────────────────────────
function SentinelSelect({ value, onChange, options, className, st }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-11 appearance-none border rounded-xl pl-4 pr-10 text-sm cursor-pointer',
          'transition-all duration-200',
          st(
            'bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
            'bg-zinc-900/40 text-white border-zinc-800/60 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20',
          ),
          className,
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
          st('text-slate-400', 'text-zinc-500'),
        )}
      />
    </div>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────
function SeverityBadge({ severity, st }) {
  const config = SEVERITY_CONFIG[severity];
  if (!config) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
        st(config.bgLight, config.bgDark),
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ status, st }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <SentinelBadge variant={config.variant} size="sm">
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', st(config.dotLight, config.dotDark))} />
      {config.label}
    </SentinelBadge>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────
function ImplementationProgress({ implemented, total, st }) {
  const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;
  return (
    <SentinelCard padding="sm">
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-medium uppercase tracking-wider', st('text-slate-500', 'text-zinc-400'))}>
          Implementation Progress
        </span>
        <span className={cn('text-sm font-semibold tabular-nums', st('text-slate-900', 'text-white'))}>
          {implemented}/{total} ({pct}%)
        </span>
      </div>
      <div className={cn('h-2.5 rounded-full overflow-hidden', st('bg-slate-200', 'bg-zinc-800'))}>
        <motion.div
          className={cn(
            'h-full rounded-full',
            pct >= 80 ? st('bg-emerald-500', 'bg-emerald-400')
              : pct >= 40 ? st('bg-yellow-500', 'bg-yellow-400')
              : st('bg-red-500', 'bg-red-400'),
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </SentinelCard>
  );
}

// ─── Control Row ──────────────────────────────────────────────────
function ControlRow({
  control,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onSave,
  saving,
  st,
}) {
  const [localStatus, setLocalStatus] = useState(control.status);
  const [localNotes, setLocalNotes] = useState(control.notes || '');

  useEffect(() => {
    setLocalStatus(control.status);
    setLocalNotes(control.notes || '');
  }, [control.status, control.notes]);

  const framework = control.compliance_frameworks;
  const hasChanges = localStatus !== control.status || localNotes !== (control.notes || '');

  const lastTestedLabel = useMemo(() => {
    if (!control.last_tested_at) return null;
    const d = new Date(control.last_tested_at);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [control.last_tested_at]);

  const testResultColor = useMemo(() => {
    if (control.test_result === 'pass') return st('text-emerald-600', 'text-emerald-400');
    if (control.test_result === 'fail') return st('text-red-600', 'text-red-400');
    if (control.test_result === 'warning') return st('text-yellow-600', 'text-yellow-400');
    return st('text-slate-400', 'text-zinc-500');
  }, [control.test_result, st]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      <SentinelCard
        padding="none"
        className={cn(
          'overflow-hidden transition-all duration-200',
          isSelected && st('ring-2 ring-emerald-500/40', 'ring-2 ring-emerald-400/40'),
        )}
      >
        {/* ── Main row ─────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 cursor-pointer group',
            st('hover:bg-slate-50', 'hover:bg-zinc-800/30'),
            'transition-colors duration-150',
          )}
          onClick={() => onToggleExpand(control.id)}
        >
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(control.id); }}
            className={cn(
              'flex-shrink-0 p-0.5 rounded transition-colors',
              st('text-slate-400 hover:text-emerald-500', 'text-zinc-500 hover:text-emerald-400'),
            )}
          >
            {isSelected
              ? <SquareCheck className="w-4.5 h-4.5 text-emerald-400" />
              : <Square className="w-4.5 h-4.5" />}
          </button>

          {/* Expand chevron */}
          <div className={cn('flex-shrink-0', st('text-slate-400', 'text-zinc-500'))}>
            {isExpanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />}
          </div>

          {/* Control ref */}
          <span
            className={cn(
              'flex-shrink-0 font-mono text-xs px-2 py-1 rounded-lg border',
              st('bg-slate-100 text-slate-700 border-slate-200', 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60'),
            )}
          >
            {control.control_ref}
          </span>

          {/* Title */}
          <span className={cn('flex-1 text-sm font-medium truncate min-w-0', st('text-slate-800', 'text-white'))}>
            {control.title}
          </span>

          {/* Category badge */}
          {control.category && (
            <span
              className={cn(
                'flex-shrink-0 hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                st('bg-slate-100 text-slate-600 border-slate-200', 'bg-zinc-800/40 text-zinc-400 border-zinc-700/40'),
              )}
            >
              {control.category}
            </span>
          )}

          {/* Framework name */}
          {framework && (
            <span
              className={cn(
                'flex-shrink-0 hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                st('bg-blue-50 text-blue-600 border-blue-200', 'bg-blue-500/10 text-blue-400 border-blue-500/20'),
              )}
            >
              {framework.name}
            </span>
          )}

          {/* Severity */}
          <div className="flex-shrink-0 hidden md:block">
            <SeverityBadge severity={control.severity} st={st} />
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            <StatusBadge status={control.status} st={st} />
          </div>

          {/* Evidence count */}
          {control.evidence_count > 0 && (
            <span className={cn('flex-shrink-0 hidden lg:inline-flex items-center gap-1 text-[10px] font-medium', st('text-slate-500', 'text-zinc-500'))}>
              <FileText className="w-3 h-3" />
              {control.evidence_count}
            </span>
          )}

          {/* Last tested */}
          {lastTestedLabel && (
            <span className={cn('flex-shrink-0 hidden xl:inline-flex items-center gap-1 text-[10px]', testResultColor)}>
              <Clock className="w-3 h-3" />
              {lastTestedLabel}
            </span>
          )}

          {/* Automated */}
          {control.automated && (
            <span
              className={cn(
                'flex-shrink-0 hidden lg:inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                st('bg-emerald-50 text-emerald-600 border-emerald-200', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'),
              )}
            >
              <Zap className="w-3 h-3" />
              Auto
            </span>
          )}
        </div>

        {/* ── Expanded detail panel ────────────────────────── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'px-6 py-5 space-y-5 border-t',
                  st('border-slate-200 bg-slate-50/50', 'border-zinc-800/60 bg-zinc-900/30'),
                )}
              >
                {/* Description */}
                {control.description && (
                  <div>
                    <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                      Description
                    </label>
                    <p className={cn('text-sm leading-relaxed', st('text-slate-600', 'text-zinc-300'))}>
                      {control.description}
                    </p>
                  </div>
                )}

                {/* Implementation guidance */}
                {control.implementation_guidance && (
                  <div>
                    <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                      Implementation Guidance
                    </label>
                    <div
                      className={cn(
                        'text-sm leading-relaxed p-3 rounded-xl border',
                        st('bg-white text-slate-600 border-slate-200', 'bg-zinc-900/40 text-zinc-300 border-zinc-800/60'),
                      )}
                    >
                      {control.implementation_guidance}
                    </div>
                  </div>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-3">
                  {control.automated && (
                    <SentinelBadge variant="success" size="sm">
                      <Zap className="w-3 h-3 mr-1" />
                      Automated Control
                    </SentinelBadge>
                  )}
                  {control.severity && (
                    <SeverityBadge severity={control.severity} st={st} />
                  )}
                  {control.last_tested_at && (
                    <span className={cn('inline-flex items-center gap-1.5 text-xs', st('text-slate-500', 'text-zinc-400'))}>
                      <Clock className="w-3.5 h-3.5" />
                      Last tested: {new Date(control.last_tested_at).toLocaleDateString()}
                      {control.test_result && (
                        <span className={cn(
                          'ml-1 font-medium',
                          control.test_result === 'pass' ? 'text-emerald-500' :
                          control.test_result === 'fail' ? 'text-red-500' :
                          'text-yellow-500',
                        )}>
                          ({control.test_result})
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Status dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                      Update Status
                    </label>
                    <SentinelSelect
                      value={localStatus}
                      onChange={(v) => setLocalStatus(v)}
                      options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
                      className="w-full"
                      st={st}
                    />
                  </div>

                  <div>
                    <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                      Evidence
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', st('text-slate-700', 'text-zinc-300'))}>
                        {control.evidence_count || 0} item{control.evidence_count !== 1 ? 's' : ''} linked
                      </span>
                      <Link
                        to={createPageUrl('ComplianceEvidence') + `?control=${control.id}`}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium transition-colors',
                          st('text-emerald-600 hover:text-emerald-700', 'text-emerald-400 hover:text-emerald-300'),
                        )}
                      >
                        View Evidence
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                    Notes
                  </label>
                  <textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Add notes about this control..."
                    rows={3}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm resize-none transition-all duration-200',
                      st(
                        'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
                        'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20',
                      ),
                    )}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    {control.evidence_count > 0 && (
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', st('text-slate-500', 'text-zinc-400'))}>
                        <FileText className="w-3.5 h-3.5" />
                        {control.evidence_count} evidence item{control.evidence_count !== 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={createPageUrl('ComplianceEvidence') + `?control=${control.id}`}>
                      <SentinelButton
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Evidence
                      </SentinelButton>
                    </Link>
                    <SentinelButton
                      variant="primary"
                      size="sm"
                      loading={saving === control.id}
                      disabled={!hasChanges}
                      icon={<Save className="w-3.5 h-3.5" />}
                      onClick={() =>
                        onSave(control.id, {
                          status: localStatus,
                          notes: localNotes,
                        })
                      }
                    >
                      Save
                    </SentinelButton>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SentinelCard>
    </motion.div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────
export default function ComplianceControls() {
  const { st } = useTheme();
  const [searchParams] = useSearchParams();
  const frameworkId = searchParams.get('framework') || null;

  // Data state
  const [controls, setControls] = useState([]);
  const [frameworkName, setFrameworkName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Interaction state
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  // ─── Fetch controls ────────────────────────────────────────
  const fetchControls = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData?.company_id) throw new Error('No company found');

      let query = supabase
        .from('compliance_controls')
        .select('*, compliance_frameworks(name, slug)')
        .eq('company_id', userData.company_id)
        .order('control_ref');

      if (frameworkId) {
        query = query.eq('framework_id', frameworkId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setControls(data || []);

      // Resolve framework name for header
      if (frameworkId && data?.length > 0 && data[0].compliance_frameworks) {
        setFrameworkName(data[0].compliance_frameworks.name);
      } else if (frameworkId) {
        // Framework has no controls yet -- fetch the name directly
        const { data: fw } = await supabase
          .from('compliance_frameworks')
          .select('name')
          .eq('id', frameworkId)
          .single();
        if (fw) setFrameworkName(fw.name);
      }
    } catch (err) {
      console.error('[ComplianceControls] Fetch error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    fetchControls();
  }, [fetchControls]);

  // ─── Derived data ──────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set();
    controls.forEach((c) => { if (c.category) set.add(c.category); });
    return Array.from(set).sort();
  }, [controls]);

  const categoryOptions = useMemo(
    () => [{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c, label: c }))],
    [categories],
  );

  // ─── Filtered controls ─────────────────────────────────────
  const filteredControls = useMemo(() => {
    let result = controls;

    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (severityFilter !== 'all') {
      result = result.filter((c) => c.severity === severityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.control_ref || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [controls, categoryFilter, statusFilter, severityFilter, searchQuery]);

  // ─── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: controls.length,
    implemented: controls.filter((c) => c.status === 'implemented').length,
    inProgress: controls.filter((c) => c.status === 'in-progress').length,
    failing: controls.filter((c) => c.status === 'failing' || c.status === 'not-implemented').length,
  }), [controls]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleToggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredControls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredControls.map((c) => c.id)));
    }
  }, [filteredControls, selectedIds.size]);

  const handleSave = useCallback(async (controlId, updates) => {
    setSaving(controlId);
    try {
      const { error: updateError } = await supabase
        .from('compliance_controls')
        .update({
          status: updates.status,
          notes: updates.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', controlId);

      if (updateError) throw updateError;

      setControls((prev) =>
        prev.map((c) =>
          c.id === controlId
            ? { ...c, status: updates.status, notes: updates.notes }
            : c,
        ),
      );
      toast.success('Control updated successfully');
    } catch (err) {
      console.error('[ComplianceControls] Save error:', err);
      toast.error('Failed to update control');
    } finally {
      setSaving(null);
    }
  }, []);

  const handleBulkAction = useCallback(async (newStatus) => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);

    try {
      const ids = Array.from(selectedIds);
      const { error: updateError } = await supabase
        .from('compliance_controls')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (updateError) throw updateError;

      setControls((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, status: newStatus } : c)),
      );
      setSelectedIds(new Set());
      toast.success(`${ids.length} control${ids.length > 1 ? 's' : ''} updated`);
    } catch (err) {
      console.error('[ComplianceControls] Bulk action error:', err);
      toast.error('Failed to update controls');
    } finally {
      setBulkSaving(false);
    }
  }, [selectedIds]);

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    setSearchQuery('');
  }, []);

  // ─── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header skeleton */}
          <SentinelCardSkeleton className="h-20" />
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SentinelCardSkeleton key={i} className="h-28" />
            ))}
          </div>
          {/* Progress bar skeleton */}
          <SentinelCardSkeleton className="h-16" />
          {/* Filter bar skeleton */}
          <SentinelCardSkeleton className="h-16" />
          {/* Control rows skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SentinelCardSkeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
        <div className="w-full px-4 lg:px-6 py-4">
          <SentinelCard>
            <SentinelEmptyState
              icon={AlertTriangle}
              title="Failed to load controls"
              message={error.message || 'An unexpected error occurred while loading compliance controls.'}
              action={{ label: 'Retry', onClick: fetchControls }}
            />
          </SentinelCard>
        </div>
      </SentinelPageTransition>
    );
  }

  const pageTitle = frameworkName ? `${frameworkName} Controls` : 'Compliance Controls';
  const allSelected = filteredControls.length > 0 && selectedIds.size === filteredControls.length;

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* ─── Header ────────────────────────────────────────── */}
        <motion.div {...MOTION_VARIANTS.fadeIn}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Breadcrumb back link */}
              <Link
                to={createPageUrl('ComplianceFrameworks')}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium transition-colors mr-2',
                  st('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300'),
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Frameworks
              </Link>

              <div
                className={cn(
                  'w-10 h-10 rounded-[20px] flex items-center justify-center',
                  st('bg-emerald-100', 'bg-emerald-400/10'),
                )}
              >
                <Shield className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                  <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>
                    {pageTitle}
                  </h1>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      st('bg-slate-100 text-slate-600 border border-slate-200', 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/60'),
                    )}
                  >
                    {filteredControls.length}
                  </span>
                </div>
                <p className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
                  {frameworkName
                    ? `Manage controls for the ${frameworkName} framework`
                    : 'Manage compliance controls across all frameworks'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Stat Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Hash}
            label="Total Controls"
            value={stats.total}
            delay={0}
            accentColor="emerald"
          />
          <StatCard
            icon={CheckCircle2}
            label="Implemented"
            value={stats.implemented}
            delay={0.05}
            accentColor="green"
          />
          <StatCard
            icon={Clock}
            label="In Progress"
            value={stats.inProgress}
            delay={0.1}
            accentColor="yellow"
          />
          <StatCard
            icon={XCircle}
            label="Failing / Not Impl."
            value={stats.failing}
            delay={0.15}
            accentColor="red"
          />
        </div>

        {/* ─── Implementation Progress Bar ────────────────────── */}
        <motion.div {...MOTION_VARIANTS.slideUp} transition={{ delay: 0.2 }}>
          <ImplementationProgress
            implemented={stats.implemented}
            total={stats.total}
            st={st}
          />
        </motion.div>

        {/* ─── Filter Bar ─────────────────────────────────────── */}
        <motion.div {...MOTION_VARIANTS.slideUp} transition={{ delay: 0.25 }}>
          <SentinelCard padding="sm">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <SlidersHorizontal className={cn('w-4 h-4', st('text-slate-400', 'text-zinc-500'))} />
                <span className={cn('text-xs font-medium uppercase tracking-wider', st('text-slate-500', 'text-zinc-400'))}>
                  Filters
                </span>
              </div>

              <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
                <SentinelSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_OPTIONS}
                  className="w-full sm:w-auto min-w-[150px]"
                  st={st}
                />
                <SentinelSelect
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  options={SEVERITY_OPTIONS}
                  className="w-full sm:w-auto min-w-[140px]"
                  st={st}
                />
                <SentinelSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoryOptions}
                  className="w-full sm:w-auto min-w-[160px]"
                  st={st}
                />
                <div className="flex-1 min-w-[200px]">
                  <SentinelInput
                    variant="search"
                    placeholder="Search by title, ref, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </SentinelCard>
        </motion.div>

        {/* ─── Bulk Actions Bar ────────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SentinelCard padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSelectAll}
                      className={cn(
                        'flex items-center gap-2 text-sm font-medium',
                        st('text-emerald-600', 'text-emerald-400'),
                      )}
                    >
                      {allSelected
                        ? <SquareCheck className="w-4 h-4" />
                        : <Square className="w-4 h-4" />}
                      {selectedIds.size} selected
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className={cn('text-xs', st('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300'))}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {BULK_ACTIONS.map((action) => (
                      <SentinelButton
                        key={action.value}
                        variant="secondary"
                        size="sm"
                        loading={bulkSaving}
                        icon={<action.icon className="w-3.5 h-3.5" />}
                        onClick={() => handleBulkAction(action.value)}
                      >
                        <span className="hidden sm:inline">{action.label}</span>
                      </SentinelButton>
                    ))}
                  </div>
                </div>
              </SentinelCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Controls List ──────────────────────────────────── */}
        <motion.div {...MOTION_VARIANTS.slideUp} transition={{ delay: 0.3 }}>
          {filteredControls.length === 0 ? (
            <SentinelCard>
              <SentinelEmptyState
                icon={Shield}
                title={controls.length === 0 ? 'No controls found' : 'No controls match filters'}
                message={
                  controls.length === 0
                    ? 'No compliance controls have been configured for your organization yet.'
                    : 'Try adjusting your filters or search query to find the controls you are looking for.'
                }
                action={
                  controls.length > 0
                    ? { label: 'Clear Filters', onClick: clearFilters }
                    : undefined
                }
              />
            </SentinelCard>
          ) : (
            <>
              {/* Select all header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  onClick={handleSelectAll}
                  className={cn(
                    'flex items-center gap-2 text-xs font-medium transition-colors',
                    st('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300'),
                  )}
                >
                  {allSelected
                    ? <SquareCheck className="w-3.5 h-3.5" />
                    : <Square className="w-3.5 h-3.5" />}
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
                <span className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                  {filteredControls.length} control{filteredControls.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Control rows */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredControls.map((control) => (
                    <ControlRow
                      key={control.id}
                      control={control}
                      isExpanded={expandedId === control.id}
                      isSelected={selectedIds.has(control.id)}
                      onToggleExpand={handleToggleExpand}
                      onToggleSelect={handleToggleSelect}
                      onSave={handleSave}
                      saving={saving}
                      st={st}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </SentinelPageTransition>
  );
}
