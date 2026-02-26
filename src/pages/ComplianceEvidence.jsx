import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileCheck, Upload, Search, Camera, Settings, FileText, Terminal, Plug,
  Edit, File, Clock, CheckCircle, AlertTriangle, XCircle, X, ChevronDown,
  Link2, Calendar, Filter, FolderOpen, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelInput } from '@/components/sentinel/ui/SentinelInput';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import { MOTION_VARIANTS } from '@/tokens/sentinel';

// ─── Constants ──────────────────────────────────────────────────

const EVIDENCE_TYPES = [
  { value: 'screenshot', label: 'Screenshot', icon: Camera },
  { value: 'config', label: 'Configuration', icon: Settings },
  { value: 'policy', label: 'Policy Document', icon: FileText },
  { value: 'log', label: 'Log Export', icon: Terminal },
  { value: 'api-pull', label: 'API Pull', icon: Plug },
  { value: 'manual', label: 'Manual Entry', icon: Edit },
  { value: 'document', label: 'Document', icon: File },
];

const EVIDENCE_STATUSES = [
  { value: 'pending', label: 'Pending Review', variant: 'warning' },
  { value: 'valid', label: 'Valid', variant: 'success' },
  { value: 'expired', label: 'Expired', variant: 'error' },
  { value: 'failed', label: 'Failed', variant: 'error' },
  { value: 'rejected', label: 'Rejected', variant: 'error' },
];

const STATUS_BADGE_MAP = {
  pending: 'warning',
  valid: 'success',
  expired: 'error',
  failed: 'error',
  rejected: 'error',
};

const TYPE_BADGE_MAP = {
  screenshot: 'primary',
  config: 'neutral',
  policy: 'primary',
  log: 'neutral',
  'api-pull': 'neutral',
  manual: 'warning',
  document: 'primary',
};

function getTypeIcon(type) {
  return EVIDENCE_TYPES.find((t) => t.value === type)?.icon || File;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpiringSoon(expiresAt) {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt) - new Date();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

// ─── Select Dropdown ────────────────────────────────────────────

function SelectDropdown({ value, onChange, options, st }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-medium transition-colors duration-200',
          st(
            'bg-white border-slate-300 text-slate-700 hover:bg-slate-50',
            'bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/40',
          ),
        )}
      >
        {selected?.label}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-1 w-48 rounded-xl border shadow-lg overflow-hidden',
              st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800'),
            )}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs transition-colors',
                  value === opt.value
                    ? st('bg-emerald-50 text-emerald-700', 'bg-emerald-500/10 text-emerald-400')
                    : st('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800/50'),
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function ComplianceEvidence() {
  const { st } = useTheme();

  const [evidence, setEvidence] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ─── Fetch user + company ─────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const { data: userData } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();
        if (userData?.company_id) setCompanyId(userData.company_id);
      } catch (err) {
        console.error('[ComplianceEvidence] Auth error:', err);
      }
    })();
  }, []);

  // ─── Fetch evidence ───────────────────────────────────────

  const fetchEvidence = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('compliance_evidence')
        .select('*, compliance_controls(control_ref, title)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvidence(data || []);
    } catch (err) {
      console.error('[ComplianceEvidence] Fetch error:', err);
      toast.error('Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchControls = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('compliance_controls')
        .select('id, control_ref, title')
        .eq('company_id', companyId)
        .order('control_ref', { ascending: true });
      if (error) throw error;
      setControls(data || []);
    } catch (err) {
      console.error('[ComplianceEvidence] Controls fetch error:', err);
    }
  }, [companyId]);

  useEffect(() => {
    fetchEvidence();
    fetchControls();
  }, [fetchEvidence, fetchControls]);

  // ─── Filtering ────────────────────────────────────────────

  const filteredEvidence = useMemo(() => {
    return evidence.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.title?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [evidence, filterType, filterStatus, searchQuery]);

  // ─── Stats ────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: evidence.length,
    valid: evidence.filter((e) => e.status === 'valid').length,
    pending: evidence.filter((e) => e.status === 'pending').length,
    expired: evidence.filter((e) => e.status === 'expired').length,
  }), [evidence]);

  // ─── Review handler ───────────────────────────────────────

  const handleReview = async (item, newStatus) => {
    try {
      const { error } = await supabase
        .from('compliance_evidence')
        .update({
          status: newStatus,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw error;
      setEvidence((prev) =>
        prev.map((e) => e.id === item.id ? { ...e, status: newStatus, reviewed_by: userId, reviewed_at: new Date().toISOString() } : e),
      );
      toast.success(`Evidence marked as ${newStatus}`);
    } catch (err) {
      console.error('[ComplianceEvidence] Review error:', err);
      toast.error('Failed to update evidence');
    }
  };

  // ─── Loading skeleton ─────────────────────────────────────

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <SentinelCardSkeleton key={i} className="h-28" />)}
          </div>
          <SentinelCardSkeleton className="h-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <SentinelCardSkeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* ─── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <FileCheck className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>Evidence Library</h1>
              <p className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
                Manage compliance evidence, documentation, and audit artifacts
              </p>
            </div>
          </div>
          <SentinelButton icon={<Upload className="w-4 h-4" />} onClick={() => setShowUploadModal(true)}>
            Upload Evidence
          </SentinelButton>
        </div>

        {/* ─── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={FolderOpen} label="Total Evidence" value={stats.total} delay={0} accentColor="emerald" />
          <StatCard icon={CheckCircle} label="Valid" value={stats.valid} delay={0.1} accentColor="green" />
          <StatCard icon={Clock} label="Pending Review" value={stats.pending} delay={0.2} accentColor="yellow" />
          <StatCard icon={AlertTriangle} label="Expired" value={stats.expired} delay={0.3} accentColor="orange" />
        </div>

        {/* ─── Filter Bar ──────────────────────────────────── */}
        <SentinelCard padding="sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className={cn('w-4 h-4', st('text-slate-400', 'text-zinc-500'))} />
              <span className={cn('text-xs font-medium uppercase tracking-wider', st('text-slate-500', 'text-zinc-400'))}>Filters</span>
            </div>
            <SelectDropdown value={filterType} onChange={setFilterType} options={[{ value: 'all', label: 'All Types' }, ...EVIDENCE_TYPES.map((t) => ({ value: t.value, label: t.label }))]} st={st} />
            <SelectDropdown value={filterStatus} onChange={setFilterStatus} options={[{ value: 'all', label: 'All Statuses' }, ...EVIDENCE_STATUSES.map((s) => ({ value: s.value, label: s.label }))]} st={st} />
            <div className="flex-1 w-full md:w-auto">
              <SentinelInput variant="search" placeholder="Search by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 text-xs" />
            </div>
            {filteredEvidence.length !== evidence.length && (
              <span className={cn('text-xs whitespace-nowrap', st('text-slate-400', 'text-zinc-500'))}>
                {filteredEvidence.length} of {evidence.length}
              </span>
            )}
          </div>
        </SentinelCard>

        {/* ─── Evidence Grid ───────────────────────────────── */}
        {filteredEvidence.length === 0 ? (
          <SentinelCard>
            <SentinelEmptyState
              icon={<FileCheck className="w-8 h-8 text-emerald-400" />}
              title={evidence.length === 0 ? 'No Evidence Yet' : 'No Matching Evidence'}
              message={evidence.length === 0 ? 'Upload your first piece of compliance evidence to get started.' : 'Try adjusting your filters or search query.'}
              action={evidence.length === 0 ? { label: 'Upload Evidence', onClick: () => setShowUploadModal(true) } : undefined}
            />
          </SentinelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvidence.map((item, i) => (
              <EvidenceCard key={item.id} item={item} index={i} st={st} onReview={handleReview} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Upload Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            st={st}
            companyId={companyId}
            userId={userId}
            controls={controls}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => { setShowUploadModal(false); fetchEvidence(); }}
          />
        )}
      </AnimatePresence>
    </SentinelPageTransition>
  );
}

// ─── Evidence Card ──────────────────────────────────────────────

function EvidenceCard({ item, index, st, onReview }) {
  const TypeIcon = getTypeIcon(item.type);
  const controlRef = item.compliance_controls?.control_ref;
  const controlTitle = item.compliance_controls?.title;
  const expiringSoon = isExpiringSoon(item.expires_at);
  const isExpired = item.expires_at && new Date(item.expires_at) < new Date();

  return (
    <SentinelCard
      variant="default"
      padding="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <div className="p-5">
        {/* Top row: icon + badges */}
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2.5 rounded-xl border', st('bg-emerald-100 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/20'))}>
            <TypeIcon className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <SentinelBadge variant={TYPE_BADGE_MAP[item.type] || 'neutral'} size="sm">
              {EVIDENCE_TYPES.find((t) => t.value === item.type)?.label || item.type}
            </SentinelBadge>
            <SentinelBadge variant={STATUS_BADGE_MAP[item.status] || 'neutral'} size="sm">
              {EVIDENCE_STATUSES.find((s) => s.value === item.status)?.label || item.status}
            </SentinelBadge>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn('text-sm font-semibold mb-1 line-clamp-2', st('text-slate-900', 'text-white'))}>
          {item.title || 'Untitled Evidence'}
        </h3>

        {/* Source label */}
        {item.source && (
          <p className={cn('text-[11px] mb-2', st('text-slate-400', 'text-zinc-500'))}>
            Source: {item.source}
          </p>
        )}

        {/* Linked control */}
        {controlRef && (
          <div className={cn('flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-xs', st('bg-slate-100 text-slate-600', 'bg-zinc-800/40 text-zinc-400'))}>
            <Link2 className="w-3 h-3 flex-shrink-0" />
            <span className="font-medium">{controlRef}</span>
            {controlTitle && <span className="truncate">- {controlTitle}</span>}
          </div>
        )}

        {/* File info */}
        {item.file_name && (
          <div className={cn('flex items-center gap-1.5 mb-2 text-[11px]', st('text-slate-400', 'text-zinc-500'))}>
            <File className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{item.file_name}</span>
            {item.file_size > 0 && <span className="flex-shrink-0">({formatFileSize(item.file_size)})</span>}
          </div>
        )}

        {/* Expiry warning */}
        {expiringSoon && !isExpired && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Expires {formatDate(item.expires_at)}</span>
          </div>
        )}
        {isExpired && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3 flex-shrink-0" />
            <span>Expired {formatDate(item.expires_at)}</span>
          </div>
        )}

        {/* Collected date */}
        <div className={cn('flex items-center gap-1 text-[11px]', st('text-slate-400', 'text-zinc-500'))}>
          <Calendar className="w-3 h-3" />
          <span>Collected {formatDate(item.collected_at || item.created_at)}</span>
        </div>

        {/* Review actions for pending */}
        {item.status === 'pending' && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed" style={{ borderColor: 'inherit' }}>
            <SentinelButton size="sm" onClick={(e) => { e.stopPropagation(); onReview(item, 'valid'); }} icon={<CheckCircle className="w-3.5 h-3.5" />}>
              Approve
            </SentinelButton>
            <SentinelButton size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); onReview(item, 'rejected'); }} icon={<XCircle className="w-3.5 h-3.5" />}>
              Reject
            </SentinelButton>
          </div>
        )}
      </div>
    </SentinelCard>
  );
}

// ─── Upload Modal ───────────────────────────────────────────────

function UploadModal({ st, companyId, userId, controls, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('document');
  const [controlId, setControlId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [controlSearch, setControlSearch] = useState('');
  const fileInputRef = useRef(null);

  const filteredControls = useMemo(() => {
    if (!controlSearch) return controls.slice(0, 20);
    const q = controlSearch.toLowerCase();
    return controls.filter((c) => c.control_ref?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)).slice(0, 20);
  }, [controls, controlSearch]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  }, [title]);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  }, [title]);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Please provide a file and title');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `evidence/${companyId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      const fileUrl = urlData?.publicUrl || null;

      const record = {
        company_id: companyId,
        uploaded_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        type,
        status: 'pending',
        source: 'manual',
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        control_id: controlId || null,
        collected_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('compliance_evidence').insert(record);
      if (insertError) throw insertError;

      toast.success('Evidence uploaded successfully');
      onSuccess();
    } catch (err) {
      console.error('[ComplianceEvidence] Upload failed:', err);
      toast.error(err.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn('relative w-full max-w-lg rounded-[20px] border shadow-2xl overflow-hidden', st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800'))}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between px-6 py-4 border-b', st('border-slate-200', 'border-zinc-800'))}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', st('bg-emerald-100', 'bg-emerald-500/10'))}>
              <Upload className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} />
            </div>
            <h2 className={cn('text-base font-semibold', st('text-slate-900', 'text-white'))}>Upload Evidence</h2>
          </div>
          <button onClick={onClose} className={cn('p-1.5 rounded-lg transition-colors', st('hover:bg-slate-100 text-slate-400', 'hover:bg-zinc-800 text-zinc-500'))}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[calc(80vh-140px)] overflow-y-auto">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
              dragOver
                ? st('border-emerald-400 bg-emerald-50', 'border-emerald-400 bg-emerald-400/5')
                : st('border-slate-300 hover:border-slate-400 bg-slate-50', 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/20'),
            )}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            {file ? (
              <div className="text-center">
                <FileText className={cn('w-8 h-8 mx-auto mb-2', st('text-emerald-500', 'text-emerald-400'))} />
                <p className={cn('text-sm font-medium', st('text-slate-900', 'text-white'))}>{file.name}</p>
                <p className={cn('text-xs mt-0.5', st('text-slate-400', 'text-zinc-500'))}>{formatFileSize(file.size)}</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className={cn('mt-2 text-xs font-medium', st('text-red-500 hover:text-red-600', 'text-red-400 hover:text-red-300'))}>
                  Remove file
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className={cn('w-8 h-8 mx-auto mb-2', st('text-slate-300', 'text-zinc-600'))} />
                <p className={cn('text-sm font-medium', st('text-slate-700', 'text-zinc-300'))}>Drop a file here or click to browse</p>
                <p className={cn('text-xs mt-1', st('text-slate-400', 'text-zinc-500'))}>Images, PDFs, documents, configs, logs</p>
              </div>
            )}
          </div>

          {/* Title */}
          <SentinelInput label="Title" id="evidence-title" placeholder="e.g. SOC 2 audit report Q1 2026" value={title} onChange={(e) => setTitle(e.target.value)} />

          {/* Description */}
          <div className="w-full">
            <label htmlFor="evidence-desc" className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>Description</label>
            <textarea
              id="evidence-desc"
              rows={3}
              placeholder="Describe this evidence and its relevance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                'w-full border rounded-xl px-4 py-3 text-sm resize-none transition-all duration-200',
                st('bg-white text-slate-900 placeholder:text-slate-400 border-slate-300', 'bg-zinc-900/40 text-white placeholder:text-zinc-500 border-zinc-800/60'),
                st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20'),
              )}
            />
          </div>

          {/* Type */}
          <div className="w-full">
            <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>Evidence Type</label>
            <SelectDropdown value={type} onChange={setType} options={EVIDENCE_TYPES.map((t) => ({ value: t.value, label: t.label }))} st={st} />
          </div>

          {/* Control select */}
          <div className="w-full">
            <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>Link to Control</label>
            <SentinelInput variant="search" placeholder="Search controls..." value={controlSearch} onChange={(e) => setControlSearch(e.target.value)} className="h-9 text-xs mb-2" />
            <div className={cn('max-h-32 overflow-y-auto rounded-xl border', st('border-slate-200', 'border-zinc-800/60'))}>
              <button
                type="button"
                onClick={() => setControlId('')}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs border-b transition-colors',
                  !controlId ? st('bg-emerald-50 text-emerald-700', 'bg-emerald-500/10 text-emerald-400') : st('text-slate-500 hover:bg-slate-50', 'text-zinc-500 hover:bg-zinc-800/30'),
                  st('border-slate-100', 'border-zinc-800/40'),
                )}
              >
                No control linked
              </button>
              {filteredControls.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setControlId(c.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs border-b last:border-b-0 transition-colors',
                    controlId === c.id ? st('bg-emerald-50 text-emerald-700', 'bg-emerald-500/10 text-emerald-400') : st('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800/30'),
                    st('border-slate-100', 'border-zinc-800/40'),
                  )}
                >
                  <span className="font-medium">{c.control_ref}</span>
                  <span className={cn('ml-1.5', st('text-slate-400', 'text-zinc-500'))}>{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t', st('border-slate-200', 'border-zinc-800'))}>
          <SentinelButton variant="secondary" onClick={onClose} disabled={uploading}>Cancel</SentinelButton>
          <SentinelButton onClick={handleUpload} loading={uploading} disabled={!file || !title.trim()} icon={<Upload className="w-4 h-4" />}>Upload</SentinelButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
