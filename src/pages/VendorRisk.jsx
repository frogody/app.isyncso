import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, AlertTriangle, CheckCircle2, Clock, Plus,
  Search, Filter, ExternalLink, Edit3, Trash2, Eye,
  ShieldCheck, ShieldAlert, Globe, Lock, X, Loader2,
  AlertCircle, ChevronDown,
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
// Constants & Helpers
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: 'saas', label: 'SaaS' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'data-processor', label: 'Data Processor' },
  { value: 'subprocessor', label: 'Subprocessor' },
];

const CRITICALITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const DATA_ACCESS_OPTIONS = [
  { value: 'pii', label: 'PII' },
  { value: 'phi', label: 'PHI' },
  { value: 'financial', label: 'Financial' },
  { value: 'none', label: 'None' },
];

const CERT_STATUS_OPTIONS = [
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'none', label: 'None' },
];

const CRITICALITY_COLORS = {
  critical: { badge: 'error', ring: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400' },
  high: { badge: 'warning', ring: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400' },
  medium: { badge: 'warning', ring: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400' },
  low: { badge: 'success', ring: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
};

const STATUS_BADGE_MAP = {
  approved: 'success',
  'pending-review': 'warning',
  'under-review': 'neutral',
  rejected: 'error',
  decommissioned: 'neutral',
};

function calculateRiskScore(vendor) {
  let score = 0;

  // Criticality base (0-40)
  const critScores = { critical: 40, high: 30, medium: 20, low: 10 };
  score += critScores[vendor.criticality] || 20;

  // Data access types (0-30)
  const accessTypes = vendor.data_access || [];
  if (accessTypes.includes('phi')) score += 15;
  if (accessTypes.includes('pii')) score += 10;
  if (accessTypes.includes('financial')) score += 5;

  // Missing certifications (0-30)
  if (vendor.soc2_status !== 'verified') score += 10;
  if (vendor.iso_status !== 'verified') score += 10;
  if (vendor.gdpr_status !== 'verified') score += 10;

  return Math.min(100, Math.max(0, score));
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorRisk() {
  const { user } = useUser();
  const { st } = useTheme();

  // State
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const emptyForm = {
    name: '',
    domain: '',
    logo_url: '',
    category: 'saas',
    criticality: 'medium',
    status: 'pending-review',
    data_access: [],
    soc2_status: 'none',
    iso_status: 'none',
    gdpr_status: 'none',
    contract_url: '',
    dpa_url: '',
    notes: '',
    risk_score: null,
    owner: '',
    last_assessment_date: '',
    next_review_date: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchVendors = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('vendor_assessments')
        .select('*')
        .eq('company_id', user.company_id)
        .order('risk_score', { ascending: false });

      if (fetchError) throw fetchError;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendor assessments:', err);
      setError(err.message || 'Failed to load vendors');
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ---------------------------------------------------------------------------
  // Derived Data
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    let result = vendors;
    if (criticalityFilter !== 'all') {
      result = result.filter((v) => v.criticality === criticalityFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name?.toLowerCase().includes(q) ||
          v.domain?.toLowerCase().includes(q) ||
          v.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [vendors, criticalityFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const criticalHigh = vendors.filter(
      (v) => v.criticality === 'critical' || v.criticality === 'high'
    ).length;
    const approved = vendors.filter((v) => v.status === 'approved').length;
    const pendingReview = vendors.filter(
      (v) => v.status === 'pending-review' || v.status === 'under-review'
    ).length;
    return {
      total: vendors.length,
      criticalHigh,
      approved,
      pendingReview,
    };
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
      name: vendor.name || '',
      domain: vendor.domain || '',
      logo_url: vendor.logo_url || '',
      category: vendor.category || 'saas',
      criticality: vendor.criticality || 'medium',
      status: vendor.status || 'pending-review',
      data_access: vendor.data_access || [],
      soc2_status: vendor.soc2_status || 'none',
      iso_status: vendor.iso_status || 'none',
      gdpr_status: vendor.gdpr_status || 'none',
      contract_url: vendor.contract_url || '',
      dpa_url: vendor.dpa_url || '',
      notes: vendor.notes || '',
      risk_score: vendor.risk_score,
      owner: vendor.owner || '',
      last_assessment_date: vendor.last_assessment_date || '',
      next_review_date: vendor.next_review_date || '',
    });
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    if (!user?.company_id) {
      toast.error('No company associated with your account');
      return;
    }

    setSaving(true);

    try {
      const computedScore =
        form.risk_score !== null && form.risk_score !== ''
          ? Number(form.risk_score)
          : calculateRiskScore(form);

      const payload = {
        company_id: user.company_id,
        name: form.name.trim(),
        domain: form.domain.trim() || null,
        logo_url: form.logo_url.trim() || null,
        category: form.category,
        criticality: form.criticality,
        status: form.status,
        data_access: form.data_access,
        soc2_status: form.soc2_status,
        iso_status: form.iso_status,
        gdpr_status: form.gdpr_status,
        contract_url: form.contract_url.trim() || null,
        dpa_url: form.dpa_url.trim() || null,
        notes: form.notes.trim() || null,
        risk_score: computedScore,
        owner: form.owner.trim() || null,
        last_assessment_date: form.last_assessment_date || null,
        next_review_date: form.next_review_date || null,
      };

      if (editingVendor) {
        const { error: updateError } = await supabase
          .from('vendor_assessments')
          .update(payload)
          .eq('id', editingVendor.id);
        if (updateError) throw updateError;
        toast.success('Vendor updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('vendor_assessments')
          .insert(payload);
        if (insertError) throw insertError;
        toast.success('Vendor added successfully');
      }

      setModalOpen(false);
      setEditingVendor(null);
      setForm(emptyForm);
      await fetchVendors();
    } catch (err) {
      console.error('Error saving vendor:', err);
      toast.error(err.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  }, [form, editingVendor, user?.company_id, fetchVendors]);

  const handleDecommission = useCallback(
    async (vendor) => {
      if (!confirm(`Decommission "${vendor.name}"? This will mark the vendor as inactive.`)) return;

      try {
        const { error: updateError } = await supabase
          .from('vendor_assessments')
          .update({ status: 'decommissioned' })
          .eq('id', vendor.id);
        if (updateError) throw updateError;
        toast.success(`${vendor.name} decommissioned`);
        await fetchVendors();
      } catch (err) {
        console.error('Error decommissioning vendor:', err);
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
  // Loading State
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
  // Error State
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
              <Building2 className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>
                Vendor Risk
              </h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                {stats.total} vendor{stats.total !== 1 ? 's' : ''} tracked
              </p>
            </div>
          </div>

          <SentinelButton icon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
            Add Vendor
          </SentinelButton>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Stat Cards                                                        */}
        {/* ----------------------------------------------------------------- */}
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
            label="Critical / High"
            value={stats.criticalHigh}
            subtitle="Require close monitoring"
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
            value={stats.pendingReview}
            subtitle="Awaiting assessment"
            delay={0.3}
            accentColor="yellow"
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Filters                                                           */}
        {/* ----------------------------------------------------------------- */}
        <SentinelCard padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Search
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                  st('text-slate-400', 'text-zinc-500')
                )}
              />
              <input
                type="text"
                placeholder="Search vendors..."
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

            {/* Criticality Filter */}
            <FilterDropdown
              label="Criticality"
              value={criticalityFilter}
              options={[{ value: 'all', label: 'All' }, ...CRITICALITY_OPTIONS]}
              onChange={setCriticalityFilter}
              st={st}
            />

            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS]}
              onChange={setStatusFilter}
              st={st}
            />
          </div>
        </SentinelCard>

        {/* ----------------------------------------------------------------- */}
        {/* Vendor Grid                                                       */}
        {/* ----------------------------------------------------------------- */}
        {filtered.length === 0 ? (
          <SentinelCard padding="lg" className="text-center">
            <Building2 className={cn('w-12 h-12 mx-auto mb-3 opacity-40', st('text-slate-400', 'text-zinc-500'))} />
            <p className={cn('text-sm', st('text-slate-500', 'text-zinc-400'))}>
              {searchQuery || criticalityFilter !== 'all' || statusFilter !== 'all'
                ? 'No vendors match your filters'
                : 'No vendors tracked yet. Add your first vendor to get started.'}
            </p>
            {!searchQuery && criticalityFilter === 'all' && statusFilter === 'all' && (
              <SentinelButton className="mt-4" icon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
                Add Vendor
              </SentinelButton>
            )}
          </SentinelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vendor, index) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                index={index}
                st={st}
                onEdit={() => openEditModal(vendor)}
                onDecommission={() => handleDecommission(vendor)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Add / Edit Modal                                                    */}
      {/* ------------------------------------------------------------------- */}
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

  let strokeColor = '#4ade80'; // emerald
  if (score >= 70) strokeColor = '#f87171'; // red
  else if (score >= 50) strokeColor = '#fb923c'; // orange
  else if (score >= 30) strokeColor = '#facc15'; // yellow

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
          stroke={strokeColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span
        className="absolute text-xs font-bold tabular-nums"
        style={{ color: strokeColor }}
      >
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Indicator
// ---------------------------------------------------------------------------

function CertIndicator({ label, status, st }) {
  if (status === 'verified') {
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

function VendorCard({ vendor, index, st, onEdit, onDecommission }) {
  const crit = CRITICALITY_COLORS[vendor.criticality] || CRITICALITY_COLORS.medium;
  const statusVariant = STATUS_BADGE_MAP[vendor.status] || 'neutral';
  const statusLabel =
    STATUS_OPTIONS.find((s) => s.value === vendor.status)?.label || vendor.status;
  const categoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === vendor.category)?.label || vendor.category;
  const riskScore = vendor.risk_score ?? calculateRiskScore(vendor);
  const overdue = isOverdue(vendor.next_review_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <SentinelCard padding="none" className="overflow-hidden h-full flex flex-col">
        {/* Top accent bar */}
        <div className={cn('h-1 w-full', crit.ring === 'text-red-400' ? 'bg-red-500' : crit.ring === 'text-orange-400' ? 'bg-orange-500' : crit.ring === 'text-yellow-400' ? 'bg-yellow-500' : 'bg-emerald-500')} />

        <div className="p-5 flex-1 flex flex-col space-y-3">
          {/* Header: Name + Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {vendor.logo_url ? (
                  <img
                    src={vendor.logo_url}
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
                    {vendor.name}
                  </h3>
                  {vendor.domain && (
                    <span className={cn('text-[10px] truncate block', st('text-slate-400', 'text-zinc-500'))}>
                      {vendor.domain}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <RiskScoreRing score={riskScore} size={44} />
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SentinelBadge variant="neutral" size="sm">{categoryLabel}</SentinelBadge>
            <SentinelBadge variant={crit.badge} size="sm">
              {vendor.criticality?.charAt(0).toUpperCase() + vendor.criticality?.slice(1)}
            </SentinelBadge>
            <SentinelBadge variant={statusVariant} size="sm">{statusLabel}</SentinelBadge>
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
                      ? st('bg-red-50 text-red-600 border border-red-200', 'bg-red-500/10 text-red-400 border border-red-500/20')
                      : st('bg-slate-100 text-slate-600 border border-slate-200', 'bg-zinc-800 text-zinc-400 border border-zinc-700')
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
            <CertIndicator label="ISO" status={vendor.iso_status} st={st} />
            <CertIndicator label="GDPR" status={vendor.gdpr_status} st={st} />
          </div>

          {/* Dates */}
          <div className="flex-1" />
          <div className={cn('flex items-center justify-between text-[10px]', st('text-slate-400', 'text-zinc-500'))}>
            <span>Assessed: {formatDate(vendor.last_assessment_date)}</span>
            <span className={overdue ? 'text-red-400 font-medium' : ''}>
              {overdue ? 'Overdue: ' : 'Next: '}
              {formatDate(vendor.next_review_date)}
            </span>
          </div>

          {/* Actions */}
          <div
            className={cn(
              'flex items-center gap-1 pt-2 border-t',
              st('border-slate-100', 'border-zinc-800/60')
            )}
          >
            <SentinelButton size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />}>
              Review
            </SentinelButton>
            <SentinelButton size="sm" variant="ghost" icon={<Edit3 className="w-3.5 h-3.5" />} onClick={onEdit}>
              Edit
            </SentinelButton>
            {vendor.status !== 'decommissioned' && (
              <SentinelButton size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDecommission}>
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
  const autoScore = calculateRiskScore(form);
  const useAutoScore = form.risk_score === null || form.risk_score === '';

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
          <div className={cn('flex items-center justify-between p-6 border-b', st('border-slate-200', 'border-zinc-800/60'))}>
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
            {/* Row 1: Name + Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SentinelInput
                label="Vendor Name"
                placeholder="e.g. Acme Corp"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <SentinelInput
                label="Domain"
                placeholder="e.g. acme.com"
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              />
            </div>

            {/* Row 2: Logo URL */}
            <SentinelInput
              label="Logo URL"
              placeholder="https://..."
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
            />

            {/* Row 3: Category + Criticality */}
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

            {/* Row 4: Status */}
            <SelectField
              label="Status"
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              st={st}
            />

            {/* Data Access Multi-Select */}
            <div>
              <label className={cn('block text-xs font-medium uppercase tracking-wider mb-2', st('text-slate-500', 'text-zinc-400'))}>
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

            {/* Certification Statuses */}
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
                value={form.iso_status}
                options={CERT_STATUS_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, iso_status: v }))}
                st={st}
              />
              <SelectField
                label="GDPR Status"
                value={form.gdpr_status}
                options={CERT_STATUS_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, gdpr_status: v }))}
                st={st}
              />
            </div>

            {/* URLs */}
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

            {/* Owner + Risk Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SentinelInput
                label="Owner"
                placeholder="e.g. security@company.com"
                value={form.owner}
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              />
              <div>
                <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                  Risk Score
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder={`Auto: ${autoScore}`}
                    value={form.risk_score ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        risk_score: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                    className={cn(
                      'w-full h-11 border rounded-xl px-4 text-sm transition-all duration-200',
                      st('bg-white text-slate-900 border-slate-300 placeholder:text-slate-400', 'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500'),
                      st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
                    )}
                  />
                  {!useAutoScore && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, risk_score: null }))}
                      className={cn('text-xs whitespace-nowrap', st('text-emerald-600', 'text-emerald-400'))}
                    >
                      Use auto
                    </button>
                  )}
                </div>
                <p className={cn('text-[10px] mt-1', st('text-slate-400', 'text-zinc-500'))}>
                  Auto-calculated: {autoScore} (leave empty to use)
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                  Last Assessment Date
                </label>
                <input
                  type="date"
                  value={form.last_assessment_date}
                  onChange={(e) => setForm((f) => ({ ...f, last_assessment_date: e.target.value }))}
                  className={cn(
                    'w-full h-11 border rounded-xl px-4 text-sm transition-all duration-200',
                    st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
                    st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
                  )}
                />
              </div>
              <div>
                <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                  Next Review Date
                </label>
                <input
                  type="date"
                  value={form.next_review_date}
                  onChange={(e) => setForm((f) => ({ ...f, next_review_date: e.target.value }))}
                  className={cn(
                    'w-full h-11 border rounded-xl px-4 text-sm transition-all duration-200',
                    st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
                    st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Additional notes about this vendor..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={cn(
                  'w-full border rounded-xl px-4 py-3 text-sm resize-none transition-all duration-200',
                  st('bg-white text-slate-900 border-slate-300 placeholder:text-slate-400', 'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500'),
                  st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={cn('flex items-center justify-end gap-3 p-6 border-t', st('border-slate-200', 'border-zinc-800/60'))}>
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
// Select Field (Styled)
// ---------------------------------------------------------------------------

function SelectField({ label, value, options, onChange, st }) {
  return (
    <div>
      <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-11 border rounded-xl px-4 text-sm appearance-none cursor-pointer transition-all duration-200',
            st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
            st('focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20', 'focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20')
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
