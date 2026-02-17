import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen, Plus, Edit3, Archive, Trash2, ChevronRight, Calendar,
  Clock, User, FileText, CheckCircle2, Eye, Send, Shield,
  AlertTriangle, X, Layers, ClipboardCheck, PenLine,
} from 'lucide-react';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelInput } from '@/components/sentinel/ui/SentinelInput';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import { MOTION_VARIANTS } from '@/tokens/sentinel';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     variant: 'neutral',  dot: ['bg-slate-300', 'bg-zinc-600'] },
  review:    { label: 'In Review', variant: 'warning',  dot: ['bg-yellow-400', 'bg-yellow-400'] },
  approved:  { label: 'Approved',  variant: 'primary',  dot: ['bg-emerald-400', 'bg-emerald-400'] },
  published: { label: 'Published', variant: 'success',  dot: ['bg-emerald-500', 'bg-emerald-500'] },
  archived:  { label: 'Archived',  variant: 'neutral',  dot: ['bg-slate-400', 'bg-zinc-500'] },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY_FORM = { title: '', category: '', content: '', framework_id: '', status: 'draft' };

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return null; }
}

function isOverdue(d) { return d ? new Date(d) < new Date() : false; }

// Shared select styling helper
function selectCls(st) {
  return cn(
    'h-11 px-4 rounded-xl text-sm border outline-none transition-colors',
    st('bg-white border-slate-300 text-slate-900 focus:border-emerald-500/50',
       'bg-zinc-900/40 border-zinc-800/60 text-white focus:border-emerald-400/50'),
  );
}

function borderColor(st) { return st('rgb(226 232 240)', 'rgb(63 63 70 / 0.4)'); }

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CompliancePolicies() {
  const { user } = useUser();
  const { st } = useTheme();

  const [policies, setPolicies] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [transitioningId, setTransitioningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // -- Fetch ----------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true); setError(null);
    try {
      const [pRes, fRes] = await Promise.all([
        supabase.from('compliance_policies')
          .select('*, compliance_frameworks(name, slug)')
          .eq('company_id', user.company_id)
          .order('updated_at', { ascending: false }),
        supabase.from('compliance_frameworks')
          .select('id, name, slug')
          .eq('company_id', user.company_id),
      ]);
      if (pRes.error) throw pRes.error;
      if (fRes.error) throw fRes.error;
      setPolicies(pRes.data || []);
      setFrameworks(fRes.data || []);
    } catch (err) {
      console.error('Error fetching compliance policies:', err);
      setError(err.message || 'Failed to load policies');
      toast.error('Failed to load compliance policies');
    } finally { setLoading(false); }
  }, [user?.company_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // -- Derived --------------------------------------------------------------

  const categories = useMemo(() => {
    const s = new Set();
    policies.forEach((p) => { if (p.category) s.add(p.category); });
    return Array.from(s).sort();
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    let r = policies;
    if (statusFilter !== 'all') r = r.filter((p) => p.status === statusFilter);
    if (categoryFilter !== 'all') r = r.filter((p) => p.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q));
    }
    return r;
  }, [policies, statusFilter, categoryFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: policies.length,
    published: policies.filter((p) => p.status === 'published').length,
    review: policies.filter((p) => p.status === 'review').length,
    drafts: policies.filter((p) => p.status === 'draft').length,
  }), [policies]);

  // -- Modal ----------------------------------------------------------------

  const openCreate = useCallback(() => {
    setEditingPolicy(null); setForm(EMPTY_FORM); setModalOpen(true);
  }, []);

  const openEdit = useCallback((policy) => {
    setEditingPolicy(policy);
    setForm({ title: policy.title || '', category: policy.category || '', content: policy.content || '', framework_id: policy.framework_id || '', status: policy.status || 'draft' });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false); setEditingPolicy(null); setForm(EMPTY_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // -- Save -----------------------------------------------------------------

  const handleSave = useCallback(async (submitForReview = false) => {
    if (!form.title.trim()) { toast.error('Policy title is required'); return; }
    if (!user?.company_id) { toast.error('No company associated with your account'); return; }

    setSaving(true);
    try {
      const payload = {
        company_id: user.company_id, title: form.title.trim(),
        category: form.category.trim() || null, content: form.content || '',
        framework_id: form.framework_id || null,
        status: submitForReview ? 'review' : 'draft', owner_id: user.id,
      };

      if (editingPolicy) {
        const { error: e } = await supabase.from('compliance_policies').update({
          ...payload,
          version: submitForReview ? (editingPolicy.version || 1) + 1 : editingPolicy.version || 1,
          updated_at: new Date().toISOString(),
        }).eq('id', editingPolicy.id);
        if (e) throw e;
        toast.success(submitForReview ? 'Policy submitted for review' : 'Policy updated');
      } else {
        const { error: e } = await supabase.from('compliance_policies').insert({ ...payload, version: 1 });
        if (e) throw e;
        toast.success(submitForReview ? 'Policy created and submitted for review' : 'Policy draft saved');
      }
      closeModal(); await fetchData();
    } catch (err) {
      console.error('Error saving policy:', err);
      toast.error(err.message || 'Failed to save policy');
    } finally { setSaving(false); }
  }, [form, user, editingPolicy, closeModal, fetchData]);

  // -- Transitions ----------------------------------------------------------

  const handleTransition = useCallback(async (policy, newStatus) => {
    setTransitioningId(policy.id);
    try {
      const upd = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'approved') { upd.approved_by = user.id; upd.approved_at = new Date().toISOString(); }
      if (newStatus === 'published') { upd.published_at = new Date().toISOString(); }
      const { error: e } = await supabase.from('compliance_policies').update(upd).eq('id', policy.id);
      if (e) throw e;
      toast.success(`Policy status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      await fetchData();
    } catch (err) {
      console.error('Error transitioning policy:', err);
      toast.error(err.message || 'Failed to update status');
    } finally { setTransitioningId(null); }
  }, [user, fetchData]);

  // -- Delete ---------------------------------------------------------------

  const handleDelete = useCallback(async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this policy? This action cannot be undone.')) return;
    setDeletingId(policyId);
    try {
      const { error: e } = await supabase.from('compliance_policies').delete().eq('id', policyId);
      if (e) throw e;
      toast.success('Policy deleted');
      if (expandedId === policyId) setExpandedId(null);
      await fetchData();
    } catch (err) {
      console.error('Error deleting policy:', err);
      toast.error(err.message || 'Failed to delete policy');
    } finally { setDeletingId(null); }
  }, [expandedId, fetchData]);

  // -- Loading / Error States -----------------------------------------------

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <SentinelCardSkeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <SentinelCardSkeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
        <div className="w-full px-4 lg:px-6 py-4">
          <SentinelCard padding="lg" className="max-w-lg mx-auto text-center">
            <AlertTriangle className={cn('w-12 h-12 mx-auto mb-4', st('text-red-500', 'text-red-400'))} />
            <h2 className={cn('text-lg font-semibold mb-2', st('text-slate-900', 'text-white'))}>Failed to Load Policies</h2>
            <p className={cn('text-sm mb-4', st('text-slate-500', 'text-zinc-400'))}>{error}</p>
            <SentinelButton onClick={fetchData}>Retry</SentinelButton>
          </SentinelCard>
        </div>
      </SentinelPageTransition>
    );
  }

  // -- Render ---------------------------------------------------------------

  const hasFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all';

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <BookOpen className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>Compliance Policies</h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>Manage organizational compliance policies and their lifecycle</p>
            </div>
          </div>
          <SentinelButton onClick={openCreate} icon={<Plus className="w-4 h-4" />}>Create Policy</SentinelButton>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Layers} label="Total Policies" value={stats.total} subtitle="All statuses" delay={0} accentColor="emerald" />
          <StatCard icon={CheckCircle2} label="Published" value={stats.published} subtitle="Live and active" delay={0.1} accentColor="green" />
          <StatCard icon={Eye} label="In Review" value={stats.review} subtitle="Awaiting approval" delay={0.2} accentColor="orange" />
          <StatCard icon={PenLine} label="Drafts" value={stats.drafts} subtitle="Work in progress" delay={0.3} accentColor="blue" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 max-w-sm">
            <SentinelInput variant="search" placeholder="Search policies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls(st)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls(st)}>
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Policies Grid */}
        {filteredPolicies.length === 0 ? (
          <SentinelCard padding="lg">
            <SentinelEmptyState
              icon={BookOpen}
              title={hasFilters ? 'No policies match your filters' : 'No compliance policies yet'}
              message={hasFilters ? 'Try adjusting your search or filter criteria.' : 'Create your first compliance policy to get started with policy management.'}
              action={!hasFilters ? { label: 'Create Policy', onClick: openCreate } : undefined}
            />
          </SentinelCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPolicies.map((policy, i) => (
              <PolicyCard
                key={policy.id} policy={policy} index={i} st={st}
                expanded={expandedId === policy.id}
                onToggleExpand={() => setExpandedId(expandedId === policy.id ? null : policy.id)}
                onEdit={() => openEdit(policy)}
                onArchive={() => handleTransition(policy, 'archived')}
                onDelete={() => handleDelete(policy.id)}
                onTransition={handleTransition}
                transitioning={transitioningId === policy.id}
                deleting={deletingId === policy.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <PolicyModal form={form} onChange={handleFormChange} onSave={handleSave} onClose={closeModal}
            saving={saving} isEditing={!!editingPolicy} frameworks={frameworks} categories={categories} st={st} />
        )}
      </AnimatePresence>
    </SentinelPageTransition>
  );
}

// ---------------------------------------------------------------------------
// Policy Card
// ---------------------------------------------------------------------------

function PolicyCard({ policy, index, expanded, onToggleExpand, onEdit, onArchive, onDelete, onTransition, transitioning, deleting, st }) {
  const cfg = STATUS_CONFIG[policy.status] || STATUS_CONFIG.draft;
  const overdue = isOverdue(policy.next_review_at);
  const ackCount = Array.isArray(policy.acknowledgements) ? policy.acknowledgements.length : 0;

  const accentBar = policy.status === 'published' ? st('bg-emerald-400', 'bg-emerald-500')
    : policy.status === 'review' ? st('bg-yellow-400', 'bg-yellow-500')
    : policy.status === 'approved' ? st('bg-emerald-300', 'bg-emerald-400')
    : st('bg-slate-200', 'bg-zinc-800');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }}>
      <SentinelCard padding="none" className="overflow-hidden">
        <div className={cn('h-1 w-full', accentBar)} />
        <div className="p-5 space-y-3">
          {/* Title + badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn('text-sm font-semibold truncate', st('text-slate-900', 'text-white'))}>{policy.title}</h3>
                <SentinelBadge variant="neutral" size="sm">v{policy.version || 1}</SentinelBadge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <SentinelBadge variant={cfg.variant} size="sm">
                  <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', st(cfg.dot[0], cfg.dot[1]))} />
                  {cfg.label}
                </SentinelBadge>
                {policy.category && <SentinelBadge variant="neutral" size="sm">{policy.category}</SentinelBadge>}
                {policy.compliance_frameworks && (
                  <SentinelBadge variant="primary" size="sm">
                    <Shield className="w-3 h-3 mr-1" />{policy.compliance_frameworks.name}
                  </SentinelBadge>
                )}
              </div>
            </div>
            <button onClick={onToggleExpand} aria-label={expanded ? 'Collapse details' : 'Expand details'}
              className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0', st('hover:bg-slate-100 text-slate-400', 'hover:bg-zinc-800 text-zinc-500'))}>
              <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {policy.owner_id && (
              <span className={cn('flex items-center gap-1 text-[11px]', st('text-slate-500', 'text-zinc-400'))}>
                <User className="w-3 h-3" />Owner
              </span>
            )}
            {policy.published_at && (
              <span className={cn('flex items-center gap-1 text-[11px]', st('text-slate-500', 'text-zinc-400'))}>
                <Calendar className="w-3 h-3" />Published {fmtDate(policy.published_at)}
              </span>
            )}
            {policy.next_review_at && (
              <span className={cn('flex items-center gap-1 text-[11px] font-medium', overdue ? 'text-red-400' : st('text-slate-500', 'text-zinc-400'))}>
                <Clock className="w-3 h-3" />{overdue ? 'Review overdue' : `Review by ${fmtDate(policy.next_review_at)}`}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-dashed" style={{ borderColor: borderColor(st) }}>
            <div className="flex items-center gap-1">
              {policy.status === 'draft' && (
                <SentinelButton size="sm" variant="secondary" icon={transitioning ? undefined : <Send className="w-3.5 h-3.5" />}
                  loading={transitioning} disabled={transitioning} onClick={() => onTransition(policy, 'review')}>Submit for Review</SentinelButton>
              )}
              {policy.status === 'review' && (
                <SentinelButton size="sm" icon={transitioning ? undefined : <CheckCircle2 className="w-3.5 h-3.5" />}
                  loading={transitioning} disabled={transitioning} onClick={() => onTransition(policy, 'approved')}>Approve</SentinelButton>
              )}
              {policy.status === 'approved' && (
                <SentinelButton size="sm" icon={transitioning ? undefined : <Eye className="w-3.5 h-3.5" />}
                  loading={transitioning} disabled={transitioning} onClick={() => onTransition(policy, 'published')}>Publish</SentinelButton>
              )}
            </div>
            <div className="flex items-center gap-1">
              {policy.status !== 'archived' && (
                <SentinelButton size="sm" variant="ghost" icon={<Edit3 className="w-3.5 h-3.5" />} onClick={onEdit} aria-label="Edit policy" />
              )}
              {policy.status !== 'archived' && (
                <SentinelButton size="sm" variant="ghost" icon={<Archive className="w-3.5 h-3.5" />} onClick={onArchive} disabled={transitioning} aria-label="Archive policy" />
              )}
              <SentinelButton size="sm" variant="danger" icon={deleting ? undefined : <Trash2 className="w-3.5 h-3.5" />}
                loading={deleting} disabled={deleting} onClick={onDelete} aria-label="Delete policy" />
            </div>
          </div>

          {/* Expanded detail */}
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="pt-3 mt-1 border-t space-y-3" style={{ borderColor: borderColor(st) }}>
                  <div>
                    <h4 className={cn('text-[11px] font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>Policy Content</h4>
                    <div className={cn('text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto rounded-xl p-3', st('text-slate-600 bg-slate-50', 'text-zinc-300 bg-zinc-800/40'))}>
                      {policy.content || 'No content added yet.'}
                    </div>
                  </div>
                  {policy.approved_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn('w-3.5 h-3.5', st('text-emerald-500', 'text-emerald-400'))} />
                      <span className={cn('text-[11px]', st('text-slate-500', 'text-zinc-400'))}>Approved on {fmtDate(policy.approved_at)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className={cn('w-3.5 h-3.5', st('text-slate-400', 'text-zinc-500'))} />
                    <span className={cn('text-[11px]', st('text-slate-500', 'text-zinc-400'))}>{ackCount} acknowledgement{ackCount !== 1 ? 's' : ''} recorded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className={cn('w-3.5 h-3.5', st('text-slate-400', 'text-zinc-500'))} />
                    <span className={cn('text-[11px]', st('text-slate-500', 'text-zinc-400'))}>Last updated {fmtDate(policy.updated_at)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Policy Modal (Create / Edit)
// ---------------------------------------------------------------------------

function PolicyModal({ form, onChange, onSave, onClose, saving, isEditing, frameworks, categories, st }) {
  const inputCls = cn(
    'w-full h-11 border rounded-xl px-4 text-sm transition-all duration-200',
    st('bg-white text-slate-900 border-slate-300 placeholder:text-slate-400', 'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500'),
    st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20'),
  );
  const labelCls = cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'));

  return (
    <Fragment>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={cn('w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px] border',
          st('bg-white border-slate-200 shadow-xl', 'bg-zinc-900 border-zinc-800/60 shadow-2xl'))}
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: borderColor(st) }}>
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
                <FileText className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
              </div>
              <h2 className={cn('text-base font-semibold', st('text-slate-900', 'text-white'))}>
                {isEditing ? 'Edit Policy' : 'Create New Policy'}
              </h2>
            </div>
            <button onClick={onClose} aria-label="Close modal"
              className={cn('p-2 rounded-lg transition-colors', st('hover:bg-slate-100 text-slate-400', 'hover:bg-zinc-800 text-zinc-500'))}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <SentinelInput label="Policy Title" id="policy-title" placeholder="e.g., Data Retention Policy"
              value={form.title} onChange={(e) => onChange('title', e.target.value)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Category</label>
                <input type="text" list="policy-category-list" placeholder="e.g., Data Privacy"
                  value={form.category} onChange={(e) => onChange('category', e.target.value)} className={inputCls} />
                <datalist id="policy-category-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Framework (Optional)</label>
                <select value={form.framework_id} onChange={(e) => onChange('framework_id', e.target.value)} className={inputCls}>
                  <option value="">No framework</option>
                  {frameworks.map((fw) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Policy Content</label>
              <textarea value={form.content} onChange={(e) => onChange('content', e.target.value)}
                placeholder="Write your policy content here. Markdown is supported..." rows={14}
                className={cn(inputCls, 'h-auto py-3 leading-relaxed resize-y')} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t" style={{ borderColor: borderColor(st) }}>
            <SentinelButton variant="ghost" onClick={onClose} disabled={saving}>Cancel</SentinelButton>
            <div className="flex items-center gap-2">
              <SentinelButton variant="secondary" onClick={() => onSave(false)} loading={saving} disabled={saving}
                icon={<FileText className="w-3.5 h-3.5" />}>Save Draft</SentinelButton>
              <SentinelButton onClick={() => onSave(true)} loading={saving} disabled={saving}
                icon={<Send className="w-3.5 h-3.5" />}>Submit for Review</SentinelButton>
            </div>
          </div>
        </div>
      </motion.div>
    </Fragment>
  );
}
