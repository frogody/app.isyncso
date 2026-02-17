import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Globe, FileText, HelpCircle, Server, Users,
  Plus, Trash2, GripVertical, Eye, EyeOff, Check, X,
  ChevronUp, ChevronDown, Copy, CheckCircle,
  Clock, Mail, Building2, Link as LinkIcon,
} from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'configuration', label: 'Configuration', icon: Globe },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'subprocessors', label: 'Subprocessors', icon: Server },
  { id: 'requests', label: 'Access Requests', icon: Users },
];

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);
}

// ---------------------------------------------------------------------------
// Section Editor (reorderable content sections for Configuration tab)
// ---------------------------------------------------------------------------

function SectionEditor({ sections, onChange, st }) {
  const addSection = () => {
    onChange([
      ...sections,
      { id: generateId(), title: '', content: '', visible: true },
    ]);
  };

  const updateSection = (idx, field, value) => {
    const next = sections.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s,
    );
    onChange(next);
  };

  const removeSection = (idx) => {
    onChange(sections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx, dir) => {
    const next = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label
          className={cn(
            'text-xs font-medium uppercase tracking-wider',
            st('text-slate-500', 'text-zinc-400'),
          )}
        >
          Content Sections
        </label>
        <SentinelButton
          size="sm"
          variant="secondary"
          icon={<Plus className="w-3 h-3" />}
          onClick={addSection}
        >
          Add Section
        </SentinelButton>
      </div>
      <AnimatePresence mode="popLayout">
        {sections.map((section, idx) => (
          <motion.div
            key={section.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'rounded-xl border p-4 space-y-3',
              st(
                'bg-slate-50 border-slate-200',
                'bg-zinc-800/30 border-zinc-700/40',
              ),
            )}
          >
            <div className="flex items-center gap-2">
              <GripVertical
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  st('text-slate-400', 'text-zinc-600'),
                )}
              />
              <input
                value={section.title}
                onChange={(e) => updateSection(idx, 'title', e.target.value)}
                placeholder="Section title"
                className={cn(
                  'flex-1 bg-transparent text-sm font-medium border-none outline-none',
                  st(
                    'text-slate-900 placeholder:text-slate-400',
                    'text-white placeholder:text-zinc-500',
                  ),
                )}
              />
              <button
                onClick={() =>
                  updateSection(idx, 'visible', !section.visible)
                }
                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                {section.visible ? (
                  <Eye
                    className={cn(
                      'w-4 h-4',
                      st('text-emerald-500', 'text-emerald-400'),
                    )}
                  />
                ) : (
                  <EyeOff
                    className={cn(
                      'w-4 h-4',
                      st('text-slate-400', 'text-zinc-500'),
                    )}
                  />
                )}
              </button>
              <button
                onClick={() => moveSection(idx, -1)}
                disabled={idx === 0}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveSection(idx, 1)}
                disabled={idx === sections.length - 1}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeSection(idx)}
                className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={section.content}
              onChange={(e) => updateSection(idx, 'content', e.target.value)}
              placeholder="Section content (supports markdown)"
              rows={3}
              className={cn(
                'w-full bg-transparent text-sm border rounded-lg p-3 outline-none resize-y transition-all',
                st(
                  'text-slate-700 placeholder:text-slate-400 border-slate-200 focus:border-emerald-500/50',
                  'text-zinc-300 placeholder:text-zinc-500 border-zinc-700/40 focus:border-emerald-400/50',
                ),
              )}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {sections.length === 0 && (
        <p
          className={cn(
            'text-sm text-center py-6',
            st('text-slate-400', 'text-zinc-500'),
          )}
        >
          No sections yet. Add one to get started.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document Row
// ---------------------------------------------------------------------------

function DocumentRow({ doc, onUpdate, onRemove, st }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-xl border p-4 space-y-3',
        st('bg-white border-slate-200', 'bg-zinc-800/30 border-zinc-700/40'),
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SentinelInput
          label="Title"
          value={doc.title}
          onChange={(e) => onUpdate({ ...doc, title: e.target.value })}
          placeholder="e.g. SOC 2 Type II Report"
        />
        <SentinelInput
          label="File URL"
          value={doc.file_url}
          onChange={(e) => onUpdate({ ...doc, file_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <SentinelInput
        label="Description"
        value={doc.description}
        onChange={(e) => onUpdate({ ...doc, description: e.target.value })}
        placeholder="Brief description of this document"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={doc.requires_approval}
            onChange={(e) =>
              onUpdate({ ...doc, requires_approval: e.target.checked })
            }
            className="w-4 h-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500/20"
          />
          <span className={cn('text-sm', st('text-slate-600', 'text-zinc-400'))}>
            Requires approval before sharing
          </span>
        </label>
        <SentinelButton
          size="sm"
          variant="danger"
          icon={<Trash2 className="w-3 h-3" />}
          onClick={onRemove}
        >
          Remove
        </SentinelButton>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FAQ Row
// ---------------------------------------------------------------------------

function FAQRow({ item, onUpdate, onRemove, onMove, idx, total, st }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-xl border p-4 space-y-3',
        st('bg-white border-slate-200', 'bg-zinc-800/30 border-zinc-700/40'),
      )}
    >
      <SentinelInput
        label="Question"
        value={item.question}
        onChange={(e) => onUpdate({ ...item, question: e.target.value })}
        placeholder="e.g. How do you handle data encryption?"
      />
      <textarea
        value={item.answer}
        onChange={(e) => onUpdate({ ...item, answer: e.target.value })}
        placeholder="Answer"
        rows={3}
        className={cn(
          'w-full text-sm border rounded-xl p-3 outline-none resize-y transition-all duration-200',
          st(
            'bg-white text-slate-700 placeholder:text-slate-400 border-slate-300 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
            'bg-zinc-900/40 text-zinc-300 placeholder:text-zinc-500 border-zinc-800/60 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20',
          ),
        )}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={idx === 0}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={idx === total - 1}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <SentinelButton
          size="sm"
          variant="danger"
          icon={<Trash2 className="w-3 h-3" />}
          onClick={onRemove}
        >
          Remove
        </SentinelButton>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Subprocessor Row
// ---------------------------------------------------------------------------

function SubprocessorRow({ sp, onUpdate, onRemove, st }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-xl border p-4',
        st('bg-white border-slate-200', 'bg-zinc-800/30 border-zinc-700/40'),
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <SentinelInput
          label="Name"
          value={sp.name}
          onChange={(e) => onUpdate({ ...sp, name: e.target.value })}
          placeholder="e.g. AWS"
        />
        <SentinelInput
          label="Purpose"
          value={sp.purpose}
          onChange={(e) => onUpdate({ ...sp, purpose: e.target.value })}
          placeholder="e.g. Cloud hosting"
        />
        <SentinelInput
          label="Location"
          value={sp.location}
          onChange={(e) => onUpdate({ ...sp, location: e.target.value })}
          placeholder="e.g. US, EU"
        />
        <SentinelInput
          label="Data Types"
          value={sp.data_types}
          onChange={(e) => onUpdate({ ...sp, data_types: e.target.value })}
          placeholder="e.g. PII, usage analytics"
        />
      </div>
      <div className="flex justify-end">
        <SentinelButton
          size="sm"
          variant="danger"
          icon={<Trash2 className="w-3 h-3" />}
          onClick={onRemove}
        >
          Remove
        </SentinelButton>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Request Status Badge
// ---------------------------------------------------------------------------

function RequestStatusBadge({ status }) {
  const map = { pending: 'warning', approved: 'success', denied: 'error' };
  return (
    <SentinelBadge variant={map[status] || 'neutral'}>{status}</SentinelBadge>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TrustCenter() {
  const { st } = useTheme();

  // ---- core state ----
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration');
  const [config, setConfig] = useState(null);
  const [requests, setRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // ---- editable local copies ----
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [branding, setBranding] = useState({
    logo_url: '',
    primary_color: '#10b981',
    company_name: '',
    tagline: '',
  });
  const [sections, setSections] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [faq, setFaq] = useState([]);
  const [subprocessors, setSubprocessors] = useState([]);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in');
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        toast.error('No company associated with your account');
        setLoading(false);
        return;
      }

      // Get or create trust center config
      let { data: cfg } = await supabase
        .from('trust_center_config')
        .select('*')
        .eq('company_id', userData.company_id)
        .single();

      if (!cfg) {
        const { data: newCfg, error: insertErr } = await supabase
          .from('trust_center_config')
          .insert({
            company_id: userData.company_id,
            slug: '',
            enabled: false,
          })
          .select()
          .single();

        if (insertErr) {
          toast.error('Failed to initialize trust center');
          setLoading(false);
          return;
        }
        cfg = newCfg;
      }

      // Hydrate local state from config
      setConfig(cfg);
      setEnabled(cfg.enabled ?? false);
      setSlug(cfg.slug ?? '');
      setCustomDomain(cfg.custom_domain ?? '');
      setBranding({
        logo_url: '',
        primary_color: '#10b981',
        company_name: '',
        tagline: '',
        ...(cfg.branding || {}),
      });
      setSections(cfg.sections ?? []);
      setDocuments(cfg.gated_documents ?? []);
      setFaq(cfg.faq ?? []);
      setSubprocessors(cfg.subprocessors ?? []);

      // Get access requests
      const { data: reqs } = await supabase
        .from('trust_center_requests')
        .select('*')
        .eq('trust_center_id', cfg.id)
        .order('created_at', { ascending: false });

      setRequests(reqs ?? []);
    } catch (err) {
      console.error('[TrustCenter] fetch error:', err);
      toast.error('Failed to load trust center data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Save all configuration fields
  // -----------------------------------------------------------------------

  const saveConfig = useCallback(async () => {
    if (!config) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('trust_center_config')
        .update({
          enabled,
          slug,
          custom_domain: customDomain || null,
          branding,
          sections,
          gated_documents: documents,
          faq,
          subprocessors,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Trust center saved');
    } catch (err) {
      console.error('[TrustCenter] save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [
    config,
    enabled,
    slug,
    customDomain,
    branding,
    sections,
    documents,
    faq,
    subprocessors,
  ]);

  // -----------------------------------------------------------------------
  // Toggle trust center enabled / disabled
  // -----------------------------------------------------------------------

  const toggleEnabled = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    if (!config) return;

    const { error } = await supabase
      .from('trust_center_config')
      .update({ enabled: next, updated_at: new Date().toISOString() })
      .eq('id', config.id);

    if (error) {
      toast.error('Failed to toggle trust center');
      setEnabled(!next);
      return;
    }
    toast.success(next ? 'Trust center enabled' : 'Trust center disabled');
  }, [enabled, config]);

  // -----------------------------------------------------------------------
  // Access request approve / deny
  // -----------------------------------------------------------------------

  const handleRequestAction = useCallback(async (requestId, action) => {
    try {
      setActionLoading(requestId);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('trust_center_requests')
        .update({
          status: action,
          approved_by: action === 'approved' ? user?.id : null,
        })
        .eq('id', requestId);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: action,
                approved_by:
                  action === 'approved' ? user?.id : null,
              }
            : r,
        ),
      );
      toast.success(`Request ${action}`);
    } catch (err) {
      console.error('[TrustCenter] request action error:', err);
      toast.error('Failed to update request');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Computed stats
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    return {
      pending,
      approved,
      documents: documents.length,
      subprocessors: subprocessors.length,
    };
  }, [requests, documents, subprocessors]);

  // -----------------------------------------------------------------------
  // Document CRUD helpers
  // -----------------------------------------------------------------------

  const addDocument = () => {
    setDocuments((prev) => [
      ...prev,
      {
        id: generateId(),
        title: '',
        description: '',
        file_url: '',
        requires_approval: false,
      },
    ]);
  };

  const updateDocument = (idx, doc) => {
    setDocuments((prev) => prev.map((d, i) => (i === idx ? doc : d)));
  };

  const removeDocument = (idx) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  // -----------------------------------------------------------------------
  // FAQ CRUD helpers
  // -----------------------------------------------------------------------

  const addFaq = () => {
    setFaq((prev) => [...prev, { question: '', answer: '' }]);
  };

  const updateFaq = (idx, item) => {
    setFaq((prev) => prev.map((f, i) => (i === idx ? item : f)));
  };

  const removeFaq = (idx) => {
    setFaq((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveFaq = (idx, dir) => {
    setFaq((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Subprocessor CRUD helpers
  // -----------------------------------------------------------------------

  const addSubprocessor = () => {
    setSubprocessors((prev) => [
      ...prev,
      { name: '', purpose: '', location: '', data_types: '' },
    ]);
  };

  const updateSubprocessor = (idx, sp) => {
    setSubprocessors((prev) => prev.map((s, i) => (i === idx ? sp : s)));
  };

  const removeSubprocessor = (idx) => {
    setSubprocessors((prev) => prev.filter((_, i) => i !== idx));
  };

  // -----------------------------------------------------------------------
  // Copy public link
  // -----------------------------------------------------------------------

  const copyLink = () => {
    const url = customDomain
      ? `https://${customDomain}`
      : slug
        ? `${window.location.origin}/trust/${slug}`
        : '';
    if (!url) {
      toast.error('Set a slug or custom domain first');
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SentinelCardSkeleton key={i} className="h-28" />
            ))}
          </div>
          <SentinelCardSkeleton className="h-12" />
          <SentinelCardSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <SentinelPageTransition
      className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}
    >
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* ================================================================ */}
        {/* Header                                                          */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-[20px] flex items-center justify-center',
                st('bg-emerald-100', 'bg-emerald-400/10'),
              )}
            >
              <Globe
                className={cn(
                  'w-5 h-5',
                  st('text-emerald-500', 'text-emerald-400'),
                )}
              />
            </div>
            <div>
              <h1
                className={cn(
                  'text-xl font-semibold',
                  st('text-slate-900', 'text-white'),
                )}
              >
                Trust Center
              </h1>
              <p
                className={cn(
                  'text-xs',
                  st('text-slate-400', 'text-zinc-500'),
                )}
              >
                Configure your public-facing trust center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {slug && (
              <SentinelButton
                size="sm"
                variant="ghost"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={copyLink}
              >
                Copy Link
              </SentinelButton>
            )}
            <button
              onClick={toggleEnabled}
              className={cn(
                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2',
                enabled
                  ? st(
                      'bg-emerald-500 focus-visible:ring-emerald-500/40',
                      'bg-emerald-400 focus-visible:ring-emerald-400/40',
                    )
                  : st(
                      'bg-slate-300 focus-visible:ring-slate-400/40',
                      'bg-zinc-700 focus-visible:ring-zinc-600/40',
                    ),
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                  enabled ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
            <span
              className={cn(
                'text-sm font-medium',
                enabled
                  ? st('text-emerald-600', 'text-emerald-400')
                  : st('text-slate-500', 'text-zinc-500'),
              )}
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Stat Cards                                                      */}
        {/* ================================================================ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats.pending}
            delay={0}
            accentColor="orange"
          />
          <StatCard
            icon={CheckCircle}
            label="Approved"
            value={stats.approved}
            delay={0.1}
            accentColor="green"
          />
          <StatCard
            icon={FileText}
            label="Documents"
            value={stats.documents}
            delay={0.2}
            accentColor="blue"
          />
          <StatCard
            icon={Server}
            label="Subprocessors"
            value={stats.subprocessors}
            delay={0.3}
            accentColor="purple"
          />
        </div>

        {/* ================================================================ */}
        {/* Tab Bar                                                         */}
        {/* ================================================================ */}
        <SentinelCard padding="none">
          <div className="flex items-center gap-1 p-1.5 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap',
                    active
                      ? st(
                          'bg-emerald-500 text-white',
                          'bg-emerald-400 text-black',
                        )
                      : st(
                          'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                          'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                        ),
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'requests' && stats.pending > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {stats.pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SentinelCard>

        {/* ================================================================ */}
        {/* Tab Content                                                     */}
        {/* ================================================================ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* ---- Configuration ------------------------------------ */}
            {activeTab === 'configuration' && (
              <SentinelCard padding="lg" className="space-y-6">
                {/* Slug and Domain */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SentinelInput
                    id="slug"
                    label="URL Slug"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ''),
                      )
                    }
                    placeholder="my-company"
                  />
                  <SentinelInput
                    id="custom-domain"
                    label="Custom Domain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="trust.mycompany.com"
                  />
                </div>

                {slug && (
                  <div
                    className={cn(
                      'flex items-center gap-2 text-xs rounded-lg px-3 py-2',
                      st(
                        'bg-slate-100 text-slate-600',
                        'bg-zinc-800/50 text-zinc-400',
                      ),
                    )}
                  >
                    <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {customDomain
                        ? `https://${customDomain}`
                        : `${window.location.origin}/trust/${slug}`}
                    </span>
                  </div>
                )}

                {/* Branding */}
                <div>
                  <h3
                    className={cn(
                      'text-sm font-semibold mb-3',
                      st('text-slate-900', 'text-white'),
                    )}
                  >
                    Branding
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SentinelInput
                      id="company-name"
                      label="Company Name"
                      value={branding.company_name}
                      onChange={(e) =>
                        setBranding((b) => ({
                          ...b,
                          company_name: e.target.value,
                        }))
                      }
                      placeholder="Acme Corp"
                    />
                    <SentinelInput
                      id="tagline"
                      label="Tagline"
                      value={branding.tagline}
                      onChange={(e) =>
                        setBranding((b) => ({
                          ...b,
                          tagline: e.target.value,
                        }))
                      }
                      placeholder="Security you can trust"
                    />
                    <SentinelInput
                      id="logo-url"
                      label="Logo URL"
                      value={branding.logo_url}
                      onChange={(e) =>
                        setBranding((b) => ({
                          ...b,
                          logo_url: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                    />
                    <div className="w-full">
                      <label
                        className={cn(
                          'block text-xs font-medium uppercase tracking-wider mb-1.5',
                          st('text-slate-500', 'text-zinc-400'),
                        )}
                      >
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={branding.primary_color}
                          onChange={(e) =>
                            setBranding((b) => ({
                              ...b,
                              primary_color: e.target.value,
                            }))
                          }
                          className="w-11 h-11 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={branding.primary_color}
                          onChange={(e) =>
                            setBranding((b) => ({
                              ...b,
                              primary_color: e.target.value,
                            }))
                          }
                          className={cn(
                            'flex-1 h-11 border rounded-xl px-4 text-sm font-mono transition-all duration-200',
                            st(
                              'bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
                              'bg-zinc-900/40 text-white border-zinc-800/60 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20',
                            ),
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sections Editor */}
                <SectionEditor
                  sections={sections}
                  onChange={setSections}
                  st={st}
                />

                {/* Save */}
                <div className="flex justify-end pt-2">
                  <SentinelButton
                    loading={saving}
                    onClick={saveConfig}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Save Configuration
                  </SentinelButton>
                </div>
              </SentinelCard>
            )}

            {/* ---- Documents ---------------------------------------- */}
            {activeTab === 'documents' && (
              <SentinelCard padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      'text-sm font-semibold',
                      st('text-slate-900', 'text-white'),
                    )}
                  >
                    Gated Documents
                  </h3>
                  <SentinelButton
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={addDocument}
                  >
                    Add Document
                  </SentinelButton>
                </div>

                <AnimatePresence mode="popLayout">
                  {documents.map((doc, idx) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onUpdate={(d) => updateDocument(idx, d)}
                      onRemove={() => removeDocument(idx)}
                      st={st}
                    />
                  ))}
                </AnimatePresence>

                {documents.length === 0 && (
                  <SentinelEmptyState
                    icon={FileText}
                    title="No Documents"
                    message="Add compliance documents that visitors can request access to."
                    action={{ label: 'Add Document', onClick: addDocument }}
                  />
                )}

                <div className="flex justify-end pt-2">
                  <SentinelButton
                    loading={saving}
                    onClick={saveConfig}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Save Documents
                  </SentinelButton>
                </div>
              </SentinelCard>
            )}

            {/* ---- FAQ ---------------------------------------------- */}
            {activeTab === 'faq' && (
              <SentinelCard padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      'text-sm font-semibold',
                      st('text-slate-900', 'text-white'),
                    )}
                  >
                    Frequently Asked Questions
                  </h3>
                  <SentinelButton
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={addFaq}
                  >
                    Add FAQ
                  </SentinelButton>
                </div>

                <AnimatePresence mode="popLayout">
                  {faq.map((item, idx) => (
                    <FAQRow
                      key={idx}
                      idx={idx}
                      total={faq.length}
                      item={item}
                      onUpdate={(f) => updateFaq(idx, f)}
                      onRemove={() => removeFaq(idx)}
                      onMove={(dir) => moveFaq(idx, dir)}
                      st={st}
                    />
                  ))}
                </AnimatePresence>

                {faq.length === 0 && (
                  <SentinelEmptyState
                    icon={HelpCircle}
                    title="No FAQs"
                    message="Add commonly asked security and compliance questions."
                    action={{ label: 'Add FAQ', onClick: addFaq }}
                  />
                )}

                <div className="flex justify-end pt-2">
                  <SentinelButton
                    loading={saving}
                    onClick={saveConfig}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Save FAQs
                  </SentinelButton>
                </div>
              </SentinelCard>
            )}

            {/* ---- Subprocessors ------------------------------------ */}
            {activeTab === 'subprocessors' && (
              <SentinelCard padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      'text-sm font-semibold',
                      st('text-slate-900', 'text-white'),
                    )}
                  >
                    Subprocessors
                  </h3>
                  <SentinelButton
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={addSubprocessor}
                  >
                    Add Subprocessor
                  </SentinelButton>
                </div>

                {/* Table header for desktop */}
                {subprocessors.length > 0 && (
                  <div
                    className={cn(
                      'hidden md:grid grid-cols-4 gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wider',
                      st('text-slate-500', 'text-zinc-500'),
                    )}
                  >
                    <span>Name</span>
                    <span>Purpose</span>
                    <span>Location</span>
                    <span>Data Types</span>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {subprocessors.map((sp, idx) => (
                    <SubprocessorRow
                      key={idx}
                      sp={sp}
                      onUpdate={(s) => updateSubprocessor(idx, s)}
                      onRemove={() => removeSubprocessor(idx)}
                      st={st}
                    />
                  ))}
                </AnimatePresence>

                {subprocessors.length === 0 && (
                  <SentinelEmptyState
                    icon={Server}
                    title="No Subprocessors"
                    message="List third-party data processors your organization uses."
                    action={{
                      label: 'Add Subprocessor',
                      onClick: addSubprocessor,
                    }}
                  />
                )}

                <div className="flex justify-end pt-2">
                  <SentinelButton
                    loading={saving}
                    onClick={saveConfig}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Save Subprocessors
                  </SentinelButton>
                </div>
              </SentinelCard>
            )}

            {/* ---- Access Requests ---------------------------------- */}
            {activeTab === 'requests' && (
              <SentinelCard padding="lg" className="space-y-4">
                <h3
                  className={cn(
                    'text-sm font-semibold',
                    st('text-slate-900', 'text-white'),
                  )}
                >
                  Access Requests
                </h3>

                {requests.length === 0 && (
                  <SentinelEmptyState
                    icon={Users}
                    title="No Requests Yet"
                    message="When visitors request access to gated documents, their requests will appear here."
                  />
                )}

                {requests.length > 0 && (
                  <div className="space-y-3">
                    {/* Table header */}
                    <div
                      className={cn(
                        'hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wider',
                        st('text-slate-500', 'text-zinc-500'),
                      )}
                    >
                      <span className="col-span-3">Requester</span>
                      <span className="col-span-2">Company</span>
                      <span className="col-span-3">Document</span>
                      <span className="col-span-2">Status</span>
                      <span className="col-span-2 text-right">Actions</span>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {requests.map((req, idx) => (
                        <motion.div
                          key={req.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.03 }}
                          className={cn(
                            'rounded-xl border p-4 lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center',
                            st(
                              'bg-white border-slate-200',
                              'bg-zinc-800/30 border-zinc-700/40',
                            ),
                          )}
                        >
                          {/* Requester */}
                          <div className="col-span-3 mb-2 lg:mb-0">
                            <div
                              className={cn(
                                'text-sm font-medium',
                                st('text-slate-900', 'text-white'),
                              )}
                            >
                              {req.requester_name || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail
                                className={cn(
                                  'w-3 h-3',
                                  st('text-slate-400', 'text-zinc-500'),
                                )}
                              />
                              <span
                                className={cn(
                                  'text-xs truncate',
                                  st('text-slate-500', 'text-zinc-400'),
                                )}
                              >
                                {req.requester_email}
                              </span>
                            </div>
                          </div>

                          {/* Company */}
                          <div className="col-span-2 mb-2 lg:mb-0">
                            <div className="flex items-center gap-1">
                              <Building2
                                className={cn(
                                  'w-3.5 h-3.5',
                                  st('text-slate-400', 'text-zinc-500'),
                                )}
                              />
                              <span
                                className={cn(
                                  'text-sm',
                                  st('text-slate-700', 'text-zinc-300'),
                                )}
                              >
                                {req.requester_company || '--'}
                              </span>
                            </div>
                          </div>

                          {/* Document */}
                          <div className="col-span-3 mb-2 lg:mb-0">
                            <div className="flex items-center gap-1.5">
                              <FileText
                                className={cn(
                                  'w-3.5 h-3.5 flex-shrink-0',
                                  st('text-slate-400', 'text-zinc-500'),
                                )}
                              />
                              <span
                                className={cn(
                                  'text-sm truncate',
                                  st('text-slate-700', 'text-zinc-300'),
                                )}
                              >
                                {req.document_requested}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="col-span-2 mb-2 lg:mb-0">
                            <RequestStatusBadge status={req.status} />
                            <div
                              className={cn(
                                'text-[10px] mt-1',
                                st('text-slate-400', 'text-zinc-600'),
                              )}
                            >
                              {new Date(req.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            {req.status === 'pending' && (
                              <>
                                <SentinelButton
                                  size="sm"
                                  variant="primary"
                                  loading={actionLoading === req.id}
                                  icon={<Check className="w-3 h-3" />}
                                  onClick={() =>
                                    handleRequestAction(req.id, 'approved')
                                  }
                                >
                                  Approve
                                </SentinelButton>
                                <SentinelButton
                                  size="sm"
                                  variant="danger"
                                  loading={actionLoading === req.id}
                                  icon={<X className="w-3 h-3" />}
                                  onClick={() =>
                                    handleRequestAction(req.id, 'denied')
                                  }
                                >
                                  Deny
                                </SentinelButton>
                              </>
                            )}
                            {req.status !== 'pending' && (
                              <span
                                className={cn(
                                  'text-xs',
                                  st('text-slate-400', 'text-zinc-500'),
                                )}
                              >
                                {req.status === 'approved'
                                  ? 'Granted'
                                  : 'Denied'}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </SentinelCard>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </SentinelPageTransition>
  );
}
