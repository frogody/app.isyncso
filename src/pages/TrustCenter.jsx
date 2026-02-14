import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Globe, Eye, Plus, Trash2, Edit3, GripVertical,
  FileText, HelpCircle, ChevronDown, ChevronUp, ExternalLink,
  Link2, X, Loader2, AlertCircle, CheckCircle2, Lock,
  Palette, Upload, Building2, ToggleLeft, ToggleRight,
  Server, Copy, Check,
} from 'lucide-react';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import { SentinelInput } from '@/components/sentinel/ui/SentinelInput';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE = {
  certified: { variant: 'success', label: 'Certified' },
  'audit-ready': { variant: 'success', label: 'Audit-Ready' },
  'in-progress': { variant: 'warning', label: 'In Progress' },
  'not-started': { variant: 'neutral', label: 'Not Started' },
};

const DEFAULT_CONFIG = {
  enabled: false,
  slug: '',
  company_name: '',
  logo_url: '',
  primary_color: '#34d399',
  documents: [],
  faqs: [],
  subprocessors: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrustCenter() {
  const { user } = useUser();
  const { st } = useTheme();

  // State
  const [config, setConfig] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Section editing
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingFaq, setEditingFaq] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  // Temp forms
  const [docForm, setDocForm] = useState({ title: '', file_url: '', gated: false });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [subForm, setSubForm] = useState({ name: '', purpose: '', location: '', dpa_url: '' });

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const [configRes, frameworksRes] = await Promise.all([
        supabase
          .from('trust_center_config')
          .select('*')
          .eq('company_id', user.company_id)
          .single(),
        supabase
          .from('compliance_frameworks')
          .select('id, slug, name, status, category, region')
          .eq('company_id', user.company_id)
          .in('status', ['certified', 'audit-ready']),
      ]);

      if (frameworksRes.error) throw frameworksRes.error;
      setFrameworks(frameworksRes.data || []);

      // Config may not exist yet
      if (configRes.error && configRes.error.code !== 'PGRST116') {
        throw configRes.error;
      }

      if (configRes.data) {
        setConfig({
          ...DEFAULT_CONFIG,
          ...configRes.data,
          documents: configRes.data.documents || [],
          faqs: configRes.data.faqs || [],
          subprocessors: configRes.data.subprocessors || [],
        });
      } else {
        // Initialize with defaults
        setConfig({
          ...DEFAULT_CONFIG,
          company_name: user?.company?.name || '',
        });
      }
    } catch (err) {
      console.error('Error fetching trust center config:', err);
      setError(err.message || 'Failed to load trust center configuration');
      toast.error('Failed to load trust center data');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, user?.company?.name]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Save Config
  // ---------------------------------------------------------------------------

  const saveConfig = useCallback(
    async (updatedConfig) => {
      if (!user?.company_id) {
        toast.error('No company associated with your account');
        return;
      }

      setSaving(true);

      try {
        const payload = {
          company_id: user.company_id,
          enabled: updatedConfig.enabled,
          slug: updatedConfig.slug?.trim() || null,
          company_name: updatedConfig.company_name?.trim() || null,
          logo_url: updatedConfig.logo_url?.trim() || null,
          primary_color: updatedConfig.primary_color || '#34d399',
          documents: updatedConfig.documents || [],
          faqs: updatedConfig.faqs || [],
          subprocessors: updatedConfig.subprocessors || [],
        };

        // Upsert by company_id
        const { data, error: upsertError } = await supabase
          .from('trust_center_config')
          .upsert(payload, { onConflict: 'company_id' })
          .select()
          .single();

        if (upsertError) throw upsertError;

        setConfig({
          ...DEFAULT_CONFIG,
          ...data,
          documents: data.documents || [],
          faqs: data.faqs || [],
          subprocessors: data.subprocessors || [],
        });
        toast.success('Trust center saved');
      } catch (err) {
        console.error('Error saving trust center config:', err);
        toast.error(err.message || 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [user?.company_id]
  );

  // ---------------------------------------------------------------------------
  // Config field update helper
  // ---------------------------------------------------------------------------

  const updateField = useCallback(
    (field, value) => {
      setConfig((prev) => {
        const updated = { ...prev, [field]: value };
        return updated;
      });
    },
    []
  );

  const handleToggleEnabled = useCallback(() => {
    const updated = { ...config, enabled: !config.enabled };
    setConfig(updated);
    saveConfig(updated);
  }, [config, saveConfig]);

  // ---------------------------------------------------------------------------
  // Document CRUD
  // ---------------------------------------------------------------------------

  const addDocument = useCallback(() => {
    if (!docForm.title.trim() || !docForm.file_url.trim()) {
      toast.error('Title and URL are required');
      return;
    }
    const newDoc = {
      id: crypto.randomUUID(),
      title: docForm.title.trim(),
      file_url: docForm.file_url.trim(),
      gated: docForm.gated,
    };
    const updated = {
      ...config,
      documents: editingDoc
        ? config.documents.map((d) => (d.id === editingDoc ? { ...newDoc, id: editingDoc } : d))
        : [...(config.documents || []), newDoc],
    };
    setConfig(updated);
    saveConfig(updated);
    setDocForm({ title: '', file_url: '', gated: false });
    setEditingDoc(null);
  }, [config, docForm, editingDoc, saveConfig]);

  const removeDocument = useCallback(
    (docId) => {
      const updated = {
        ...config,
        documents: config.documents.filter((d) => d.id !== docId),
      };
      setConfig(updated);
      saveConfig(updated);
    },
    [config, saveConfig]
  );

  const startEditDocument = useCallback((doc) => {
    setEditingDoc(doc.id);
    setDocForm({ title: doc.title, file_url: doc.file_url, gated: doc.gated || false });
  }, []);

  // ---------------------------------------------------------------------------
  // FAQ CRUD
  // ---------------------------------------------------------------------------

  const addFaq = useCallback(() => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    const newFaq = {
      id: crypto.randomUUID(),
      question: faqForm.question.trim(),
      answer: faqForm.answer.trim(),
    };
    const updated = {
      ...config,
      faqs: editingFaq
        ? config.faqs.map((f) => (f.id === editingFaq ? { ...newFaq, id: editingFaq } : f))
        : [...(config.faqs || []), newFaq],
    };
    setConfig(updated);
    saveConfig(updated);
    setFaqForm({ question: '', answer: '' });
    setEditingFaq(null);
  }, [config, faqForm, editingFaq, saveConfig]);

  const removeFaq = useCallback(
    (faqId) => {
      const updated = {
        ...config,
        faqs: config.faqs.filter((f) => f.id !== faqId),
      };
      setConfig(updated);
      saveConfig(updated);
    },
    [config, saveConfig]
  );

  const startEditFaq = useCallback((faq) => {
    setEditingFaq(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer });
  }, []);

  // ---------------------------------------------------------------------------
  // Subprocessor CRUD
  // ---------------------------------------------------------------------------

  const addSubprocessor = useCallback(() => {
    if (!subForm.name.trim() || !subForm.purpose.trim()) {
      toast.error('Name and purpose are required');
      return;
    }
    const newSub = {
      id: crypto.randomUUID(),
      name: subForm.name.trim(),
      purpose: subForm.purpose.trim(),
      location: subForm.location.trim() || null,
      dpa_url: subForm.dpa_url.trim() || null,
    };
    const updated = {
      ...config,
      subprocessors: editingSub
        ? config.subprocessors.map((s) => (s.id === editingSub ? { ...newSub, id: editingSub } : s))
        : [...(config.subprocessors || []), newSub],
    };
    setConfig(updated);
    saveConfig(updated);
    setSubForm({ name: '', purpose: '', location: '', dpa_url: '' });
    setEditingSub(null);
  }, [config, subForm, editingSub, saveConfig]);

  const removeSubprocessor = useCallback(
    (subId) => {
      const updated = {
        ...config,
        subprocessors: config.subprocessors.filter((s) => s.id !== subId),
      };
      setConfig(updated);
      saveConfig(updated);
    },
    [config, saveConfig]
  );

  const startEditSubprocessor = useCallback((sub) => {
    setEditingSub(sub.id);
    setSubForm({
      name: sub.name,
      purpose: sub.purpose,
      location: sub.location || '',
      dpa_url: sub.dpa_url || '',
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Copy URL
  // ---------------------------------------------------------------------------

  const trustUrl = config?.slug
    ? `${window.location.origin}/trust/${config.slug}`
    : null;

  const copyUrl = useCallback(() => {
    if (!trustUrl) return;
    navigator.clipboard.writeText(trustUrl);
    setCopied(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [trustUrl]);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SentinelCardSkeleton className="h-64" />
            <SentinelCardSkeleton className="h-64" />
          </div>
          <SentinelCardSkeleton className="h-48" />
          <SentinelCardSkeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
        <div className="w-full px-4 lg:px-6 py-4">
          <SentinelCard padding="lg" className="max-w-lg mx-auto text-center">
            <AlertCircle className={cn('w-12 h-12 mx-auto mb-4', st('text-red-500', 'text-red-400'))} />
            <h2 className={cn('text-lg font-semibold mb-2', st('text-slate-900', 'text-white'))}>
              Failed to Load Trust Center
            </h2>
            <p className={cn('text-sm mb-4', st('text-slate-500', 'text-zinc-400'))}>{error}</p>
            <SentinelButton onClick={fetchData}>Retry</SentinelButton>
          </SentinelCard>
        </div>
      </SentinelPageTransition>
    );
  }

  if (!config) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-[20px] flex items-center justify-center',
                st('bg-emerald-100', 'bg-emerald-400/10')
              )}
            >
              <Globe className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>
                Trust Center
              </h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                Configure your public compliance trust page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Enable/Disable Toggle */}
            <button
              onClick={handleToggleEnabled}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                config.enabled
                  ? st(
                      'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    )
                  : st(
                      'bg-slate-100 text-slate-500 border border-slate-200',
                      'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    )
              )}
            >
              {config.enabled ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
              {config.enabled ? 'Published' : 'Draft'}
            </button>

            <SentinelButton
              variant="secondary"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Preview'}
            </SentinelButton>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Main Layout: Config + Preview                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className={cn('grid gap-4', showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
          {/* =============== LEFT: Configuration =============== */}
          <div className="space-y-4">
            {/* Configuration Section */}
            <SentinelCard>
              <div className="flex items-center gap-2 mb-4">
                <Palette className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                <h2 className={cn('text-sm font-semibold', st('text-slate-900', 'text-white'))}>
                  Configuration
                </h2>
              </div>

              <div className="space-y-4">
                {/* Slug */}
                <div>
                  <SentinelInput
                    label="URL Slug"
                    placeholder="your-company"
                    value={config.slug || ''}
                    onChange={(e) =>
                      updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                  />
                  {trustUrl && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn('text-[10px] truncate', st('text-slate-400', 'text-zinc-500'))}>
                        {trustUrl}
                      </span>
                      <button onClick={copyUrl} className={cn('text-xs flex items-center gap-1', st('text-emerald-600', 'text-emerald-400'))}>
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Company Name */}
                <SentinelInput
                  label="Company Name"
                  placeholder="Your Company Inc."
                  value={config.company_name || ''}
                  onChange={(e) => updateField('company_name', e.target.value)}
                />

                {/* Logo URL */}
                <SentinelInput
                  label="Logo URL"
                  placeholder="https://..."
                  value={config.logo_url || ''}
                  onChange={(e) => updateField('logo_url', e.target.value)}
                />

                {/* Primary Color */}
                <div>
                  <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.primary_color || '#34d399'}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.primary_color || '#34d399'}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className={cn(
                        'h-11 border rounded-xl px-4 text-sm font-mono w-32 transition-all duration-200',
                        st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
                        st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
                      )}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <SentinelButton loading={saving} onClick={() => saveConfig(config)}>
                    Save Configuration
                  </SentinelButton>
                </div>
              </div>
            </SentinelCard>

            {/* Badges Section */}
            <SentinelCard>
              <div className="flex items-center gap-2 mb-4">
                <Shield className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                <h2 className={cn('text-sm font-semibold', st('text-slate-900', 'text-white'))}>
                  Framework Badges
                </h2>
                <span className={cn('text-[10px] ml-auto', st('text-slate-400', 'text-zinc-500'))}>
                  Auto-populated from certified/audit-ready frameworks
                </span>
              </div>

              {frameworks.length === 0 ? (
                <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                  No certified or audit-ready frameworks yet. Enable frameworks in Compliance Frameworks.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {frameworks.map((fw) => {
                    const cfg = STATUS_BADGE[fw.status] || STATUS_BADGE['not-started'];
                    return (
                      <div
                        key={fw.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border',
                          st('bg-emerald-50/50 border-emerald-200', 'bg-emerald-500/5 border-emerald-500/20')
                        )}
                      >
                        <CheckCircle2 className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                        <span className={cn('text-xs font-medium', st('text-slate-700', 'text-white'))}>
                          {fw.name}
                        </span>
                        <SentinelBadge variant={cfg.variant} size="sm">{cfg.label}</SentinelBadge>
                      </div>
                    );
                  })}
                </div>
              )}
            </SentinelCard>

            {/* Documents Section */}
            <SentinelCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                  <h2 className={cn('text-sm font-semibold', st('text-slate-900', 'text-white'))}>
                    Documents
                  </h2>
                </div>
              </div>

              {/* Existing Documents */}
              {config.documents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {config.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        st('bg-slate-50 border-slate-200', 'bg-zinc-900/40 border-zinc-800/60')
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className={cn('w-4 h-4 flex-shrink-0', st('text-slate-400', 'text-zinc-500'))} />
                        <span className={cn('text-sm truncate', st('text-slate-700', 'text-white'))}>
                          {doc.title}
                        </span>
                        {doc.gated && (
                          <SentinelBadge variant="warning" size="sm">
                            <Lock className="w-2.5 h-2.5 mr-1" />
                            Gated
                          </SentinelBadge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditDocument(doc)}
                          className={cn('p-1.5 rounded-lg transition-colors', st('text-slate-400 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800'))}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeDocument(doc.id)}
                          className={cn('p-1.5 rounded-lg transition-colors', st('text-red-400 hover:bg-red-50', 'text-red-400 hover:bg-red-500/10'))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Document Form */}
              <div className={cn('p-3 rounded-xl border', st('border-dashed border-slate-300', 'border-dashed border-zinc-700'))}>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SentinelInput
                      placeholder="Document title"
                      value={docForm.title}
                      onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <SentinelInput
                      placeholder="File URL (https://...)"
                      value={docForm.file_url}
                      onChange={(e) => setDocForm((f) => ({ ...f, file_url: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docForm.gated}
                        onChange={(e) => setDocForm((f) => ({ ...f, gated: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-400"
                      />
                      <span className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
                        Require email to access
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      {editingDoc && (
                        <SentinelButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingDoc(null);
                            setDocForm({ title: '', file_url: '', gated: false });
                          }}
                        >
                          Cancel
                        </SentinelButton>
                      )}
                      <SentinelButton size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addDocument}>
                        {editingDoc ? 'Update' : 'Add Document'}
                      </SentinelButton>
                    </div>
                  </div>
                </div>
              </div>
            </SentinelCard>

            {/* FAQ Section */}
            <SentinelCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                  <h2 className={cn('text-sm font-semibold', st('text-slate-900', 'text-white'))}>
                    FAQ
                  </h2>
                </div>
              </div>

              {/* Existing FAQs */}
              {config.faqs.length > 0 && (
                <div className="space-y-2 mb-4">
                  {config.faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className={cn(
                        'p-3 rounded-xl border',
                        st('bg-slate-50 border-slate-200', 'bg-zinc-900/40 border-zinc-800/60')
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-medium mb-1', st('text-slate-800', 'text-white'))}>
                            Q: {faq.question}
                          </p>
                          <p className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
                            A: {faq.answer}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditFaq(faq)}
                            className={cn('p-1.5 rounded-lg transition-colors', st('text-slate-400 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800'))}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFaq(faq.id)}
                            className={cn('p-1.5 rounded-lg transition-colors', st('text-red-400 hover:bg-red-50', 'text-red-400 hover:bg-red-500/10'))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add FAQ Form */}
              <div className={cn('p-3 rounded-xl border', st('border-dashed border-slate-300', 'border-dashed border-zinc-700'))}>
                <div className="space-y-3">
                  <SentinelInput
                    placeholder="Question"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))}
                  />
                  <textarea
                    rows={2}
                    placeholder="Answer..."
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm resize-none transition-all duration-200',
                      st('bg-white text-slate-900 border-slate-300 placeholder:text-slate-400', 'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500'),
                      st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    {editingFaq && (
                      <SentinelButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingFaq(null);
                          setFaqForm({ question: '', answer: '' });
                        }}
                      >
                        Cancel
                      </SentinelButton>
                    )}
                    <SentinelButton size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addFaq}>
                      {editingFaq ? 'Update' : 'Add FAQ'}
                    </SentinelButton>
                  </div>
                </div>
              </div>
            </SentinelCard>

            {/* Subprocessors Section */}
            <SentinelCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
                  <h2 className={cn('text-sm font-semibold', st('text-slate-900', 'text-white'))}>
                    Subprocessors
                  </h2>
                </div>
              </div>

              {/* Existing Subprocessors */}
              {config.subprocessors.length > 0 && (
                <div className="space-y-2 mb-4">
                  {config.subprocessors.map((sub) => (
                    <div
                      key={sub.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        st('bg-slate-50 border-slate-200', 'bg-zinc-900/40 border-zinc-800/60')
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium', st('text-slate-800', 'text-white'))}>
                            {sub.name}
                          </span>
                          {sub.location && (
                            <SentinelBadge variant="neutral" size="sm">
                              <Globe className="w-2.5 h-2.5 mr-1" />
                              {sub.location}
                            </SentinelBadge>
                          )}
                        </div>
                        <p className={cn('text-xs mt-0.5', st('text-slate-500', 'text-zinc-400'))}>
                          {sub.purpose}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {sub.dpa_url && (
                          <a
                            href={sub.dpa_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn('p-1.5 rounded-lg transition-colors', st('text-slate-400 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800'))}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => startEditSubprocessor(sub)}
                          className={cn('p-1.5 rounded-lg transition-colors', st('text-slate-400 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800'))}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeSubprocessor(sub.id)}
                          className={cn('p-1.5 rounded-lg transition-colors', st('text-red-400 hover:bg-red-50', 'text-red-400 hover:bg-red-500/10'))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Subprocessor Form */}
              <div className={cn('p-3 rounded-xl border', st('border-dashed border-slate-300', 'border-dashed border-zinc-700'))}>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SentinelInput
                      placeholder="Subprocessor name"
                      value={subForm.name}
                      onChange={(e) => setSubForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <SentinelInput
                      placeholder="Purpose"
                      value={subForm.purpose}
                      onChange={(e) => setSubForm((f) => ({ ...f, purpose: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SentinelInput
                      placeholder="Location (e.g. US, EU)"
                      value={subForm.location}
                      onChange={(e) => setSubForm((f) => ({ ...f, location: e.target.value }))}
                    />
                    <SentinelInput
                      placeholder="DPA URL (https://...)"
                      value={subForm.dpa_url}
                      onChange={(e) => setSubForm((f) => ({ ...f, dpa_url: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingSub && (
                      <SentinelButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSub(null);
                          setSubForm({ name: '', purpose: '', location: '', dpa_url: '' });
                        }}
                      >
                        Cancel
                      </SentinelButton>
                    )}
                    <SentinelButton size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addSubprocessor}>
                      {editingSub ? 'Update' : 'Add Subprocessor'}
                    </SentinelButton>
                  </div>
                </div>
              </div>
            </SentinelCard>
          </div>

          {/* =============== RIGHT: Preview =============== */}
          {showPreview && (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TrustCenterPreview
                  config={config}
                  frameworks={frameworks}
                  st={st}
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </SentinelPageTransition>
  );
}

// ---------------------------------------------------------------------------
// Trust Center Preview
// ---------------------------------------------------------------------------

function TrustCenterPreview({ config, frameworks, st }) {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const brandColor = config.primary_color || '#34d399';

  return (
    <SentinelCard padding="none" className="overflow-hidden sticky top-4">
      {/* Preview Header */}
      <div
        className={cn(
          'px-4 py-2 text-[10px] font-medium uppercase tracking-wider flex items-center justify-between border-b',
          st('bg-slate-100 text-slate-500 border-slate-200', 'bg-zinc-800/60 text-zinc-400 border-zinc-800/60')
        )}
      >
        <span>Preview</span>
        <Eye className="w-3.5 h-3.5" />
      </div>

      {/* Preview Content */}
      <div className={cn('p-6 space-y-6', st('bg-white', 'bg-zinc-950'))}>
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {config.logo_url ? (
            <img
              src={config.logo_url}
              alt={config.company_name}
              className="h-10 mx-auto object-contain"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              <Building2 className="w-6 h-6" style={{ color: brandColor }} />
            </div>
          )}
          <div>
            <h2 className={cn('text-lg font-bold', st('text-slate-900', 'text-white'))}>
              {config.company_name || 'Your Company'}
            </h2>
            <p className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
              Trust Center
            </p>
          </div>
        </div>

        {/* Framework Badges */}
        {frameworks.length > 0 && (
          <div>
            <h3
              className={cn('text-xs font-semibold uppercase tracking-wider mb-3', st('text-slate-500', 'text-zinc-400'))}
            >
              Certifications
            </h3>
            <div className="flex flex-wrap gap-2">
              {frameworks.map((fw) => (
                <div
                  key={fw.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
                  style={{
                    backgroundColor: `${brandColor}10`,
                    borderColor: `${brandColor}30`,
                    color: brandColor,
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {fw.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {config.documents?.length > 0 && (
          <div>
            <h3
              className={cn('text-xs font-semibold uppercase tracking-wider mb-3', st('text-slate-500', 'text-zinc-400'))}
            >
              Documents
            </h3>
            <div className="space-y-1.5">
              {config.documents.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl transition-colors',
                    st('hover:bg-slate-50', 'hover:bg-zinc-900/50')
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileText className={cn('w-4 h-4', st('text-slate-400', 'text-zinc-500'))} />
                    <span className={cn('text-sm', st('text-slate-700', 'text-zinc-200'))}>
                      {doc.title}
                    </span>
                    {doc.gated && (
                      <Lock className={cn('w-3 h-3', st('text-slate-300', 'text-zinc-600'))} />
                    )}
                  </div>
                  <ExternalLink className={cn('w-3.5 h-3.5', st('text-slate-300', 'text-zinc-600'))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {config.faqs?.length > 0 && (
          <div>
            <h3
              className={cn('text-xs font-semibold uppercase tracking-wider mb-3', st('text-slate-500', 'text-zinc-400'))}
            >
              Frequently Asked Questions
            </h3>
            <div className="space-y-1.5">
              {config.faqs.map((faq) => (
                <div
                  key={faq.id}
                  className={cn(
                    'rounded-xl border overflow-hidden',
                    st('border-slate-200', 'border-zinc-800/60')
                  )}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 text-left text-sm font-medium transition-colors',
                      st('text-slate-700 hover:bg-slate-50', 'text-white hover:bg-zinc-900/50')
                    )}
                  >
                    {faq.question}
                    {expandedFaq === faq.id ? (
                      <ChevronUp className={cn('w-4 h-4 flex-shrink-0', st('text-slate-400', 'text-zinc-500'))} />
                    ) : (
                      <ChevronDown className={cn('w-4 h-4 flex-shrink-0', st('text-slate-400', 'text-zinc-500'))} />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedFaq === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={cn(
                            'px-3 pb-3 text-xs leading-relaxed',
                            st('text-slate-500', 'text-zinc-400')
                          )}
                        >
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subprocessors */}
        {config.subprocessors?.length > 0 && (
          <div>
            <h3
              className={cn('text-xs font-semibold uppercase tracking-wider mb-3', st('text-slate-500', 'text-zinc-400'))}
            >
              Subprocessors
            </h3>
            <div className={cn('rounded-xl border overflow-hidden', st('border-slate-200', 'border-zinc-800/60'))}>
              <table className="w-full text-xs">
                <thead>
                  <tr className={cn(st('bg-slate-50', 'bg-zinc-900/50'))}>
                    <th className={cn('text-left px-3 py-2 font-medium', st('text-slate-500', 'text-zinc-400'))}>
                      Name
                    </th>
                    <th className={cn('text-left px-3 py-2 font-medium', st('text-slate-500', 'text-zinc-400'))}>
                      Purpose
                    </th>
                    <th className={cn('text-left px-3 py-2 font-medium', st('text-slate-500', 'text-zinc-400'))}>
                      Location
                    </th>
                    <th className={cn('text-left px-3 py-2 font-medium', st('text-slate-500', 'text-zinc-400'))}>
                      DPA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.subprocessors.map((sub, i) => (
                    <tr
                      key={sub.id}
                      className={cn(
                        i < config.subprocessors.length - 1 && 'border-b',
                        st('border-slate-100', 'border-zinc-800/40')
                      )}
                    >
                      <td className={cn('px-3 py-2 font-medium', st('text-slate-700', 'text-white'))}>
                        {sub.name}
                      </td>
                      <td className={cn('px-3 py-2', st('text-slate-500', 'text-zinc-400'))}>
                        {sub.purpose}
                      </td>
                      <td className={cn('px-3 py-2', st('text-slate-500', 'text-zinc-400'))}>
                        {sub.location || '--'}
                      </td>
                      <td className="px-3 py-2">
                        {sub.dpa_url ? (
                          <a
                            href={sub.dpa_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className={cn(st('text-slate-300', 'text-zinc-600'))}>--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {frameworks.length === 0 &&
          (!config.documents || config.documents.length === 0) &&
          (!config.faqs || config.faqs.length === 0) &&
          (!config.subprocessors || config.subprocessors.length === 0) && (
            <div className="text-center py-8">
              <Globe className={cn('w-10 h-10 mx-auto mb-3 opacity-30', st('text-slate-400', 'text-zinc-500'))} />
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                Add frameworks, documents, FAQs, and subprocessors to see the preview
              </p>
            </div>
          )}
      </div>
    </SentinelCard>
  );
}
