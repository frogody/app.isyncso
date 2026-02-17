import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, Building2, AlertTriangle, CheckCircle2, Clock, Plus,
  Search, ExternalLink, Edit3, Trash2, Eye, Globe, Lock, X,
  AlertCircle, ChevronDown, ChevronUp, FileText, StickyNote,
  Shield, Loader2,
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: 'saas', label: 'SaaS' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'data-processor', label: 'Data Processor' },
  { value: 'subprocessor', label: 'Subprocessor' },
  { value: 'other', label: 'Other' },
];

const CRITICALITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'in-review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'conditionally-approved', label: 'Conditionally Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const DATA_ACCESS_OPTIONS = [
  { value: 'pii', label: 'PII' },
  { value: 'phi', label: 'PHI' },
  { value: 'financial', label: 'Financial' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'ip', label: 'IP / Trade Secrets' },
  { value: 'none', label: 'None' },
];

const CERT_STATUS_OPTIONS = [
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'none', label: 'None' },
];

const GDPR_STATUS_OPTIONS = [
  { value: 'compliant', label: 'Compliant' },
  { value: 'pending', label: 'Pending' },
  { value: 'non-compliant', label: 'Non-Compliant' },
];

const CRITICALITY_BADGE = {
  critical: 'error',
  high: 'warning',
  medium: 'neutral',
  low: 'neutral',
};

const CRITICALITY_ACCENT = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-emerald-500',
};

const STATUS_BADGE = {
  'pending-review': 'warning',
  'in-review': 'neutral',
  approved: 'success',
  'conditionally-approved': 'warning',
  rejected: 'error',
  decommissioned: 'neutral',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskScoreColor(score) {
  if (score > 70) return '#f87171';
  if (score >= 40) return '#facc15';
  return '#4ade80';
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label || value || '--';
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function VendorRisk() {
  const { st } = useTheme();

  // Data state
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [saving, setSaving] = useState(false);

  // Detail expand state
  const [expandedId, setExpandedId] = useState(null);

  // Form defaults
  const emptyForm = {
    vendor_name: '',
    vendor_domain: '',
    vendor_logo_url: '',
    category: 'saas',
    criticality: 'medium',
    status: 'pending-review',
    data_access: [],
    soc2_status: 'none',
    iso27001_status: 'none',
    gdpr_status: 'pending',
    risk_score: 50,
    contract_url: '',
    dpa_url: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('No company associated');
      setCompanyId(userData.company_id);

      const { data, error: fetchErr } = await supabase
        .from('vendor_assessments')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setVendors(data || []);
    } catch (err) {
      console.error('[VendorRisk] fetch error:', err);
      setError(err.message || 'Failed to load vendors');
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ---------------------------------------------------------------------------
  // Derived Data
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    let result = vendors;

    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (criticalityFilter !== 'all') {
      result = result.filter((v) => v.criticality === criticalityFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((v) => v.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.vendor_name?.toLowerCase().includes(q) ||
          v.vendor_domain?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [vendors, statusFilter, criticalityFilter, categoryFilter, searchQuery]);

  const stats = useMemo(() => {
    const critical = vendors.filter(
      (v) => v.criticality === 'critical' || v.criticality === 'high'
    ).length;
    const approved = vendors.filter((v) => v.status === 'approved').length;
    const pending = vendors.filter(
      (v) => v.status === 'pending-review' || v.status === 'in-review'
    ).length;
    return { total: vendors.length, critical, approved, pending };
  }, [vendors]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const openAddModal = useCallback(() => {
    setEditingVendor(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((vendor) => {
    setEditingVendor(vendor);
    setForm({
      vendor_name: vendor.vendor_name || '',
      vendor_domain: vendor.vendor_domain || '',
      vendor_logo_url: vendor.vendor_logo_url || '',
      category: vendor.category || 'saas',
      criticality: vendor.criticality || 'medium',
      status: vendor.status || 'pending-review',
      data_access: vendor.data_access || [],
      soc2_status: vendor.soc2_status || 'none',
      iso27001_status: vendor.iso27001_status || 'none',
      gdpr_status: vendor.gdpr_status || 'pending',
      risk_score: vendor.risk_score ?? 50,
      contract_url: vendor.contract_url || '',
      dpa_url: vendor.dpa_url || '',
      notes: vendor.notes || '',
    });
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.vendor_name.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    if (!companyId) {
      toast.error('No company associated with your account');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        vendor_name: form.vendor_name.trim(),
        vendor_domain: form.vendor_domain.trim() || null,
        vendor_logo_url: form.vendor_logo_url.trim() || null,
        category: form.category,
        criticality: form.criticality,
        status: form.status,
        data_access: form.data_access,
        soc2_status: form.soc2_status,
        iso27001_status: form.iso27001_status,
        gdpr_status: form.gdpr_status,
        risk_score: Number(form.risk_score),
        contract_url: form.contract_url.trim() || null,
        dpa_url: form.dpa_url.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingVendor) {
        const { error: updateErr } = await supabase
          .from('vendor_assessments')
          .update(payload)
          .eq('id', editingVendor.id);
        if (updateErr) throw updateErr;
        toast.success('Vendor updated');
      } else {
        const { error: insertErr } = await supabase
          .from('vendor_assessments')
          .insert(payload);
        if (insertErr) throw insertErr;
        toast.success('Vendor added');
      }

      setModalOpen(false);
      setEditingVendor(null);
      setForm(emptyForm);
      await fetchVendors();
    } catch (err) {
      console.error('[VendorRisk] save error:', err);
      toast.error(err.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  }, [form, editingVendor, companyId, fetchVendors]);

  const handleDecommission = useCallback(
    async (vendor) => {
      if (!confirm(`Decommission "${vendor.vendor_name}"? This marks the vendor as inactive.`))
        return;
      try {
        const { error: err } = await supabase
          .from('vendor_assessments')
          .update({ status: 'decommissioned', updated_at: new Date().toISOString() })
          .eq('id', vendor.id);
        if (err) throw err;
        toast.success(`${vendor.vendor_name} decommissioned`);
        await fetchVendors();
      } catch (err) {
        console.error('[VendorRisk] decommission error:', err);
        toast.error('Failed to decommission vendor');
      }
    },
    [fetchVendors]
  );

  const toggleDataAccess = useCallback((value) => {
    setForm((prev) => {
      const current = prev.data_access || [];
      if (value === 'none') {
        return { ...prev, data_access: current.includes('none') ? [] : ['none'] };
      }
      const withoutNone = current.filter((v) => v !== 'none');
      return {
        ...prev,
        data_access: withoutNone.includes(value)
          ? withoutNone.filter((v) => v !== value)
          : [...withoutNone, value],
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SentinelCardSkeleton key={i} className="h-72" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
        <div className="w-full px-4 lg:px-6 py-4">
          <SentinelCard padding="lg" className="max-w-lg mx-auto text-center">
            <AlertCircle className={cn('w-12 h-12 mx-auto mb-4', st('text-red-500', 'text-red-400'))} />
            <h2 className={cn('text-lg font-semibold mb-2', st('text-slate-900', 'text-white'))}>
              Failed to Load Vendors
            </h2>
            <p className={cn('text-sm mb-4', st('text-slate-500', 'text-zinc-400'))}>{error}</p>
            <SentinelButton onClick={fetchVendors}>Retry</SentinelButton>
          </SentinelCard>
        </div>
      </SentinelPageTransition>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-[20px] flex items-center justify-center',
                st('bg-emerald-100', 'bg-emerald-400/10')
              )}
            >
              <ShieldAlert className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>
                Vendor Risk Management
              </h1>
              <p className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
                Assess and monitor third-party vendor security posture
              </p>
            </div>
          </div>
          <SentinelButton icon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
            Add Vendor
          </SentinelButton>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Building2}
            label="Total Vendors"
            value={stats.total}
            subtitle="All tracked vendors"
            delay={0}
            accentColor="emerald"
          />
          <StatCard
            icon={AlertTriangle}
            label="Critical Risk"
            value={stats.critical}
            subtitle="Critical + High vendors"
            delay={0.1}
            accentColor="red"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={stats.approved}
            subtitle="Cleared for use"
            delay={0.2}
            accentColor="green"
          />
          <StatCard
            icon={Clock}
            label="Pending Review"
            value={stats.pending}
            subtitle="Awaiting assessment"
            delay={0.3}
            accentColor="yellow"
          />
        </div>

        {/* Filters */}
        <SentinelCard padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                  st('text-slate-400', 'text-zinc-500')
                )}
              />
              <input
                type="text"
                placeholder="Search by name or domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full h-10 pl-9 pr-4 rounded-full text-sm outline-none transition-colors',
                  st(
                    'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400',
                    'bg-zinc-900/50 border border-zinc-800/60 text-white placeholder-zinc-500 focus:border-emerald-400/50'
                  )
                )}
              />
            </div>

            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS]}
              onChange={setStatusFilter}
              st={st}
            />
            <FilterDropdown
              label="Criticality"
              value={criticalityFilter}
              options={[{ value: 'all', label: 'All' }, ...CRITICALITY_OPTIONS]}
              onChange={setCriticalityFilter}
              st={st}
            />
            <FilterDropdown
              label="Category"
              value={categoryFilter}
              options={[{ value: 'all', label: 'All' }, ...CATEGORY_OPTIONS]}
              onChange={setCategoryFilter}
              st={st}
            />
          </div>
        </SentinelCard>

        {/* Vendor Grid */}
        {filtered.length === 0 ? (
          <SentinelCard>
            <SentinelEmptyState
              icon={Building2}
              title={
                searchQuery || statusFilter !== 'all' || criticalityFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No vendors match your filters'
                  : 'No vendors tracked yet'
              }
              message={
                searchQuery || statusFilter !== 'all' || criticalityFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add your first vendor to begin tracking third-party risk.'
              }
              action={
                !searchQuery && statusFilter === 'all' && criticalityFilter === 'all' && categoryFilter === 'all'
                  ? { label: 'Add Vendor', onClick: openAddModal }
                  : undefined
              }
            />
          </SentinelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((vendor, index) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  index={index}
                  st={st}
                  expanded={expandedId === vendor.id}
                  onToggleExpand={() =>
                    setExpandedId((prev) => (prev === vendor.id ? null : vendor.id))
                  }
                  onEdit={() => openEditModal(vendor)}
                  onDecommission={() => handleDecommission(vendor)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <VendorModal
            form={form}
            setForm={setForm}
            editing={!!editingVendor}
            saving={saving}
            onSave={handleSave}
            onClose={() => {
              setModalOpen(false);
              setEditingVendor(null);
            }}
            toggleDataAccess={toggleDataAccess}
            st={st}
          />
        )}
      </AnimatePresence>
    </SentinelPageTransition>
  );
}

// ---------------------------------------------------------------------------
// Filter Dropdown
// ---------------------------------------------------------------------------

function FilterDropdown({ label, value, options, onChange, st }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 pl-3 pr-8 rounded-full text-sm appearance-none cursor-pointer outline-none transition-colors',
          st(
            'bg-white border border-slate-200 text-slate-700 focus:border-emerald-400',
            'bg-zinc-900/50 border border-zinc-800/60 text-zinc-300 focus:border-emerald-400/50'
          )
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label}: {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          'absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none',
          st('text-slate-400', 'text-zinc-500')
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Score Ring
// ---------------------------------------------------------------------------

function RiskScoreRing({ score, size = 48 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = riskScoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(63,63,70,0.3)"
          strokeWidth={4}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Indicator
// ---------------------------------------------------------------------------

function CertIndicator({ label, status, st }) {
  if (status === 'verified' || status === 'compliant') {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className={cn('text-[10px] font-medium', st('text-slate-600', 'text-zinc-300'))}>{label}</span>
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-yellow-400" />
        <span className={cn('text-[10px] font-medium', st('text-slate-500', 'text-zinc-400'))}>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <X className="w-3.5 h-3.5 text-zinc-500" />
      <span className={cn('text-[10px] font-medium', st('text-slate-400', 'text-zinc-500'))}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vendor Card
// ---------------------------------------------------------------------------

function VendorCard({ vendor, index, st, expanded, onToggleExpand, onEdit, onDecommission }) {
  const critBadge = CRITICALITY_BADGE[vendor.criticality] || 'neutral';
  const critAccent = CRITICALITY_ACCENT[vendor.criticality] || 'bg-zinc-500';
  const statusVariant = STATUS_BADGE[vendor.status] || 'neutral';
  const statusLabel = labelFor(STATUS_OPTIONS, vendor.status);
  const categoryLabel = labelFor(CATEGORY_OPTIONS, vendor.category);
  const riskScore = vendor.risk_score ?? 0;
  const overdue = isOverdue(vendor.next_review_at);
  const findings = Array.isArray(vendor.risk_findings) ? vendor.risk_findings : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <SentinelCard padding="none" className="overflow-hidden h-full flex flex-col">
        {/* Top accent bar */}
        <div className={cn('h-1 w-full', critAccent)} />

        <div className="p-5 flex-1 flex flex-col space-y-3">
          {/* Header: Logo + Name + Risk Ring */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {vendor.vendor_logo_url ? (
                  <img
                    src={vendor.vendor_logo_url}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      st('bg-slate-100', 'bg-zinc-800')
                    )}
                  >
                    <Building2 className={cn('w-4 h-4', st('text-slate-400', 'text-zinc-500'))} />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className={cn('text-sm font-semibold truncate', st('text-slate-900', 'text-white'))}>
                    {vendor.vendor_name}
                  </h3>
                  {vendor.vendor_domain && (
                    <span className={cn('text-[10px] truncate block', st('text-slate-400', 'text-zinc-500'))}>
                      {vendor.vendor_domain}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <RiskScoreRing score={riskScore} size={44} />
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SentinelBadge variant="neutral" size="sm">
              {categoryLabel}
            </SentinelBadge>
            <SentinelBadge variant={critBadge} size="sm">
              {vendor.criticality?.charAt(0).toUpperCase() + vendor.criticality?.slice(1)}
            </SentinelBadge>
            <SentinelBadge variant={statusVariant} size="sm">
              {statusLabel}
            </SentinelBadge>
          </div>

          {/* Data Access Tags */}
          {vendor.data_access?.length > 0 && vendor.data_access[0] !== 'none' && (
            <div className="flex flex-wrap gap-1">
              {vendor.data_access.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider',
                    tag === 'pii' || tag === 'phi'
                      ? st(
                          'bg-red-50 text-red-600 border border-red-200',
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        )
                      : st(
                          'bg-slate-100 text-slate-600 border border-slate-200',
                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        )
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Certification Indicators */}
          <div className="flex items-center gap-3">
            <CertIndicator label="SOC 2" status={vendor.soc2_status} st={st} />
            <CertIndicator label="ISO 27001" status={vendor.iso27001_status} st={st} />
            <CertIndicator label="GDPR" status={vendor.gdpr_status} st={st} />
          </div>

          {/* Dates */}
          <div className="flex-1" />
          <div
            className={cn(
              'flex items-center justify-between text-[10px]',
              st('text-slate-400', 'text-zinc-500')
            )}
          >
            <span>Assessed: {formatDate(vendor.last_assessment_at)}</span>
            <span className={overdue ? 'text-red-400 font-medium' : ''}>
              {overdue ? 'Overdue: ' : 'Next: '}
              {formatDate(vendor.next_review_at)}
            </span>
          </div>

          {/* Expanded Detail */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    'pt-3 mt-1 border-t space-y-3',
                    st('border-slate-100', 'border-zinc-800/60')
                  )}
                >
                  {/* Risk Findings */}
                  {findings.length > 0 && (
                    <div>
                      <span
                        className={cn(
                          'text-[10px] font-medium uppercase tracking-wider',
                          st('text-slate-500', 'text-zinc-400')
                        )}
                      >
                        Risk Findings ({findings.length})
                      </span>
                      <ul className="mt-1.5 space-y-1">
                        {findings.map((f, i) => (
                          <li
                            key={i}
                            className={cn(
                              'text-xs px-2.5 py-1.5 rounded-lg',
                              st('bg-slate-50 text-slate-700', 'bg-zinc-800/50 text-zinc-300')
                            )}
                          >
                            {typeof f === 'string' ? f : f.description || f.title || JSON.stringify(f)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notes */}
                  {vendor.notes && (
                    <div>
                      <span
                        className={cn(
                          'text-[10px] font-medium uppercase tracking-wider',
                          st('text-slate-500', 'text-zinc-400')
                        )}
                      >
                        Notes
                      </span>
                      <p
                        className={cn(
                          'text-xs mt-1 leading-relaxed',
                          st('text-slate-600', 'text-zinc-400')
                        )}
                      >
                        {vendor.notes}
                      </p>
                    </div>
                  )}

                  {/* Document Links */}
                  {(vendor.contract_url || vendor.dpa_url) && (
                    <div className="flex flex-wrap gap-2">
                      {vendor.contract_url && (
                        <a
                          href={vendor.contract_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                            st(
                              'text-emerald-600 border-emerald-200 hover:bg-emerald-50',
                              'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                            )
                          )}
                        >
                          <FileText className="w-3 h-3" />
                          Contract
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {vendor.dpa_url && (
                        <a
                          href={vendor.dpa_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                            st(
                              'text-blue-600 border-blue-200 hover:bg-blue-50',
                              'text-blue-400 border-blue-500/30 hover:bg-blue-500/10'
                            )
                          )}
                        >
                          <Lock className="w-3 h-3" />
                          DPA
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Assessment History */}
                  <div
                    className={cn(
                      'flex items-center justify-between text-[10px]',
                      st('text-slate-400', 'text-zinc-500')
                    )}
                  >
                    <span>Created: {formatDate(vendor.created_at)}</span>
                    <span>Updated: {formatDate(vendor.updated_at)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div
            className={cn(
              'flex items-center gap-1 pt-2 border-t',
              st('border-slate-100', 'border-zinc-800/60')
            )}
          >
            <SentinelButton
              size="sm"
              variant="ghost"
              icon={expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              onClick={onToggleExpand}
            >
              {expanded ? 'Collapse' : 'Details'}
            </SentinelButton>
            <SentinelButton
              size="sm"
              variant="ghost"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={onEdit}
            >
              Edit
            </SentinelButton>
            {vendor.status !== 'decommissioned' && (
              <SentinelButton
                size="sm"
                variant="danger"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={onDecommission}
              >
                Decommission
              </SentinelButton>
            )}
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Vendor Modal
// ---------------------------------------------------------------------------

function VendorModal({ form, setForm, editing, saving, onSave, onClose, toggleDataAccess, st }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className={cn(
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px] border shadow-xl',
            st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between p-6 border-b',
              st('border-slate-200', 'border-zinc-800/60')
            )}
          >
            <h2 className={cn('text-lg font-semibold', st('text-slate-900', 'text-white'))}>
              {editing ? 'Edit Vendor' : 'Add Vendor'}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-full transition-colors',
                st('text-slate-400 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800')
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Name + Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SentinelInput
                label="Vendor Name"
                placeholder="e.g. Acme Corp"
                value={form.vendor_name}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
              />
              <SentinelInput
                label="Domain"
                placeholder="e.g. acme.com"
                value={form.vendor_domain}
                onChange={(e) => setForm((f) => ({ ...f, vendor_domain: e.target.value }))}
              />
            </div>

            {/* Category + Criticality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Category"
                value={form.category}
                options={CATEGORY_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                st={st}
              />
              <SelectField
                label="Criticality"
                value={form.criticality}
                options={CRITICALITY_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, criticality: v }))}
                st={st}
              />
            </div>

            {/* Data Access Multi-Select */}
            <div>
              <label
                className={cn(
                  'block text-xs font-medium uppercase tracking-wider mb-2',
                  st('text-slate-500', 'text-zinc-400')
                )}
              >
                Data Access
              </label>
              <div className="flex flex-wrap gap-2">
                {DATA_ACCESS_OPTIONS.map((opt) => {
                  const selected = (form.data_access || []).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleDataAccess(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        selected
                          ? st(
                              'bg-emerald-50 text-emerald-700 border-emerald-200',
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            )
                          : st(
                              'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                              'bg-zinc-900/40 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                            )
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance Statuses */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField
                label="SOC 2 Status"
                value={form.soc2_status}
                options={CERT_STATUS_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, soc2_status: v }))}
                st={st}
              />
              <SelectField
                label="ISO 27001 Status"
                value={form.iso27001_status}
                options={CERT_STATUS_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, iso27001_status: v }))}
                st={st}
              />
              <SelectField
                label="GDPR Status"
                value={form.gdpr_status}
                options={GDPR_STATUS_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, gdpr_status: v }))}
                st={st}
              />
            </div>

            {/* Risk Score Slider */}
            <div>
              <label
                className={cn(
                  'block text-xs font-medium uppercase tracking-wider mb-1.5',
                  st('text-slate-500', 'text-zinc-400')
                )}
              >
                Risk Score
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={form.risk_score}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, risk_score: Number(e.target.value) }))
                  }
                  className="flex-1 accent-emerald-400"
                />
                <div
                  className="w-12 h-8 rounded-lg flex items-center justify-center text-sm font-bold tabular-nums"
                  style={{
                    color: riskScoreColor(form.risk_score),
                    backgroundColor: `${riskScoreColor(form.risk_score)}15`,
                  }}
                >
                  {form.risk_score}
                </div>
              </div>
              <div
                className={cn(
                  'flex justify-between text-[10px] mt-1',
                  st('text-slate-400', 'text-zinc-500')
                )}
              >
                <span>Low risk</span>
                <span>High risk</span>
              </div>
            </div>

            {/* Contract / DPA URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SentinelInput
                label="Contract URL"
                placeholder="https://..."
                value={form.contract_url}
                onChange={(e) => setForm((f) => ({ ...f, contract_url: e.target.value }))}
              />
              <SentinelInput
                label="DPA URL"
                placeholder="https://..."
                value={form.dpa_url}
                onChange={(e) => setForm((f) => ({ ...f, dpa_url: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div>
              <label
                className={cn(
                  'block text-xs font-medium uppercase tracking-wider mb-1.5',
                  st('text-slate-500', 'text-zinc-400')
                )}
              >
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Additional notes about this vendor..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={cn(
                  'w-full border rounded-xl px-4 py-3 text-sm resize-none transition-all duration-200',
                  st(
                    'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400',
                    'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500'
                  ),
                  st(
                    'focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
                    'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20'
                  )
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className={cn(
              'flex items-center justify-end gap-3 p-6 border-t',
              st('border-slate-200', 'border-zinc-800/60')
            )}
          >
            <SentinelButton variant="secondary" onClick={onClose}>
              Cancel
            </SentinelButton>
            <SentinelButton loading={saving} onClick={onSave}>
              {editing ? 'Update Vendor' : 'Add Vendor'}
            </SentinelButton>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Select Field
// ---------------------------------------------------------------------------

function SelectField({ label, value, options, onChange, st }) {
  return (
    <div>
      <label
        className={cn(
          'block text-xs font-medium uppercase tracking-wider mb-1.5',
          st('text-slate-500', 'text-zinc-400')
        )}
      >
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-11 border rounded-xl px-4 text-sm appearance-none cursor-pointer transition-all duration-200',
            st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
            st(
              'focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
              'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20'
            )
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
            st('text-slate-400', 'text-zinc-500')
          )}
        />
      </div>
    </div>
  );
}
