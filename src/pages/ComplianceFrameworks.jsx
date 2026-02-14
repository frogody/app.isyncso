import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, ShieldCheck, ShieldAlert, Layers, CheckCircle2,
  ChevronRight, Calendar, Globe, Lock, Brain, Server,
  BookOpen, Target, Loader2, AlertCircle, Search, Plus,
  Clock, BarChart3, ExternalLink,
} from 'lucide-react';
import {
  SentinelCard,
  SentinelCardSkeleton,
  SentinelButton,
  SentinelBadge,
  SentinelInput,
  SentinelPageTransition,
  StatCard,
  SentinelEmptyState,
} from '@/components/sentinel/ui';
import { MOTION_VARIANTS } from '@/tokens/sentinel';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const REGION_CONFIG = {
  EU:     { label: 'EU',     icon: Globe,  variant: 'primary' },
  US:     { label: 'US',     icon: Globe,  variant: 'neutral' },
  global: { label: 'Global', icon: Globe,  variant: 'neutral' },
  Global: { label: 'Global', icon: Globe,  variant: 'neutral' },
};

const CATEGORY_CONFIG = {
  security:        { label: 'Security',       icon: Lock,   variant: 'warning' },
  privacy:         { label: 'Privacy',        icon: Shield, variant: 'primary' },
  'ai-governance': { label: 'AI Governance',  icon: Brain,  variant: 'gpai' },
  resilience:      { label: 'Resilience',     icon: Server, variant: 'neutral' },
};

const STATUS_CONFIG = {
  'not-started': { label: 'Not Started', variant: 'neutral',  dot: ['bg-slate-300', 'bg-zinc-600'] },
  'in-progress': { label: 'In Progress', variant: 'warning',  dot: ['bg-yellow-400', 'bg-yellow-400'] },
  'audit-ready': { label: 'Audit-Ready', variant: 'primary',  dot: ['bg-emerald-400', 'bg-emerald-400'] },
  certified:     { label: 'Certified',   variant: 'success',  dot: ['bg-emerald-500', 'bg-emerald-500'] },
};

const FRAMEWORK_ICONS = {
  'eu-ai-act':  Brain,
  'gdpr':       Lock,
  'iso-27001':  ShieldCheck,
  'soc-2':      ShieldAlert,
  'nist-csf':   Shield,
  'dora':       Server,
  'nis2':       Globe,
  'hipaa':      Lock,
  'pci-dss':    Lock,
};

function getFrameworkIcon(slug) {
  return FRAMEWORK_ICONS[slug] || BookOpen;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComplianceFrameworks() {
  const { user } = useUser();
  const { st } = useTheme();

  // State
  const [templates, setTemplates] = useState([]);
  const [companyFrameworks, setCompanyFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enablingSlug, setEnablingSlug] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const templatesRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const [templatesRes, companyRes] = await Promise.all([
        supabase
          .from('compliance_frameworks')
          .select('*')
          .is('company_id', null)
          .order('name'),
        supabase
          .from('compliance_frameworks')
          .select('*, compliance_controls(id, status)')
          .eq('company_id', user.company_id),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (companyRes.error) throw companyRes.error;

      setTemplates(templatesRes.data || []);
      setCompanyFrameworks(companyRes.data || []);
    } catch (err) {
      console.error('Error fetching compliance frameworks:', err);
      setError(err.message || 'Failed to load frameworks');
      toast.error('Failed to load compliance frameworks');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Derived Data
  // ---------------------------------------------------------------------------

  const enabledSlugs = useMemo(() => {
    const set = new Set();
    companyFrameworks.forEach((fw) => set.add(fw.slug));
    return set;
  }, [companyFrameworks]);

  const enrichedCompanyFrameworks = useMemo(() => {
    return companyFrameworks.map((fw) => {
      const controls = fw.compliance_controls || [];
      const implemented = controls.filter(
        (c) => c.status === 'implemented' || c.status === 'compliant' || c.status === 'passed'
      ).length;
      const total = controls.length;
      return {
        ...fw,
        controlsImplemented: implemented,
        controlsTotal: total,
        progressPercent: total > 0 ? Math.round((implemented / total) * 100) : 0,
      };
    });
  }, [companyFrameworks]);

  const availableTemplates = useMemo(() => {
    return templates.filter((t) => !enabledSlugs.has(t.slug));
  }, [templates, enabledSlugs]);

  // Filter company frameworks by search
  const filteredFrameworks = useMemo(() => {
    if (!searchQuery.trim()) return enrichedCompanyFrameworks;
    const q = searchQuery.toLowerCase();
    return enrichedCompanyFrameworks.filter(
      (fw) =>
        fw.name?.toLowerCase().includes(q) ||
        fw.slug?.toLowerCase().includes(q) ||
        fw.description?.toLowerCase().includes(q) ||
        fw.category?.toLowerCase().includes(q) ||
        fw.region?.toLowerCase().includes(q)
    );
  }, [enrichedCompanyFrameworks, searchQuery]);

  // Filter available templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return availableTemplates;
    const q = searchQuery.toLowerCase();
    return availableTemplates.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [availableTemplates, searchQuery]);

  // Stats (from company frameworks only)
  const stats = useMemo(() => {
    const total = enrichedCompanyFrameworks.length;
    const inProgress = enrichedCompanyFrameworks.filter((fw) => fw.status === 'in-progress').length;
    const auditReady = enrichedCompanyFrameworks.filter((fw) => fw.status === 'audit-ready').length;
    const certified = enrichedCompanyFrameworks.filter((fw) => fw.status === 'certified').length;
    return { total, inProgress, auditReady, certified };
  }, [enrichedCompanyFrameworks]);

  // ---------------------------------------------------------------------------
  // Enable Framework
  // ---------------------------------------------------------------------------

  const handleEnableFramework = useCallback(
    async (template) => {
      if (!user?.company_id) {
        toast.error('No company associated with your account');
        return;
      }

      setEnablingSlug(template.slug);

      try {
        // 1. Insert the framework for this company
        const { data: newFramework, error: fwError } = await supabase
          .from('compliance_frameworks')
          .insert({
            company_id: user.company_id,
            slug: template.slug,
            name: template.name,
            description: template.description,
            version: template.version,
            category: template.category || 'security',
            region: template.region || 'global',
            enabled: true,
            status: 'not-started',
            total_controls: template.total_controls || 0,
            icon: template.icon,
            color: template.color,
          })
          .select()
          .single();

        if (fwError) throw fwError;

        // 2. Copy all template controls to the company
        const { data: templateControls, error: ctrlFetchError } = await supabase
          .from('compliance_controls')
          .select('*')
          .eq('framework_id', template.id)
          .is('company_id', null);

        if (ctrlFetchError) throw ctrlFetchError;

        if (templateControls && templateControls.length > 0) {
          const controlsToInsert = templateControls.map((ctrl) => ({
            company_id: user.company_id,
            framework_id: newFramework.id,
            control_ref: ctrl.control_ref,
            title: ctrl.title,
            description: ctrl.description,
            category: ctrl.category,
            severity: ctrl.severity || 'medium',
            status: 'not-implemented',
            automated: ctrl.automated || false,
            evidence_count: 0,
          }));

          const { error: ctrlInsertError } = await supabase
            .from('compliance_controls')
            .insert(controlsToInsert);

          if (ctrlInsertError) throw ctrlInsertError;
        }

        toast.success(`${template.name} enabled successfully`);
        await fetchData();
      } catch (err) {
        console.error('Error enabling framework:', err);
        toast.error(err.message || 'Failed to enable framework');
      } finally {
        setEnablingSlug(null);
      }
    },
    [user?.company_id, fetchData]
  );

  const scrollToTemplates = useCallback(() => {
    templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          <SentinelCardSkeleton className="h-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              Failed to Load Frameworks
            </h2>
            <p className={cn('text-sm mb-4', st('text-slate-500', 'text-zinc-400'))}>{error}</p>
            <SentinelButton onClick={fetchData}>Retry</SentinelButton>
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
      <div className="w-full px-4 lg:px-6 py-4 space-y-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-[20px] flex items-center justify-center',
                st('bg-emerald-100', 'bg-emerald-400/10')
              )}
            >
              <Shield className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>
                Compliance Frameworks
              </h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                Manage regulatory frameworks, track controls, and monitor certification progress
              </p>
            </div>
          </div>

          <SentinelButton
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={scrollToTemplates}
          >
            Enable Framework
          </SentinelButton>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Layers}
            label="Total Frameworks"
            value={stats.total}
            subtitle="Enabled for your company"
            delay={0}
            accentColor="emerald"
          />
          <StatCard
            icon={Clock}
            label="In Progress"
            value={stats.inProgress}
            subtitle="Currently implementing"
            delay={0.05}
            accentColor="yellow"
          />
          <StatCard
            icon={Target}
            label="Audit Ready"
            value={stats.auditReady}
            subtitle="Ready for assessment"
            delay={0.1}
            accentColor="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Certified"
            value={stats.certified}
            subtitle="Fully compliant"
            delay={0.15}
            accentColor="green"
          />
        </div>

        {/* ── Search Bar ──────────────────────────────────────── */}
        <SentinelInput
          variant="search"
          placeholder="Search frameworks by name, category, or region..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* ── Active Company Frameworks Grid ──────────────────── */}
        {filteredFrameworks.length > 0 && (
          <div>
            <h2 className={cn('text-sm font-semibold uppercase tracking-wider mb-3', st('text-slate-500', 'text-zinc-400'))}>
              Active Frameworks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFrameworks.map((fw, index) => (
                <FrameworkCard key={fw.id} framework={fw} index={index} st={st} />
              ))}
            </div>
          </div>
        )}

        {filteredFrameworks.length === 0 && enrichedCompanyFrameworks.length === 0 && (
          <SentinelCard padding="none">
            <SentinelEmptyState
              icon={Shield}
              title="No Frameworks Enabled"
              message="Enable a compliance framework from the templates below to start tracking your compliance posture."
              action={{ label: 'Browse Templates', onClick: scrollToTemplates }}
            />
          </SentinelCard>
        )}

        {filteredFrameworks.length === 0 && enrichedCompanyFrameworks.length > 0 && searchQuery && (
          <SentinelCard padding="lg" className="text-center">
            <Search className={cn('w-10 h-10 mx-auto mb-3 opacity-30', st('text-slate-400', 'text-zinc-500'))} />
            <p className={cn('text-sm', st('text-slate-500', 'text-zinc-400'))}>
              No active frameworks match "{searchQuery}"
            </p>
          </SentinelCard>
        )}

        {/* ── Available Templates Section ─────────────────────── */}
        <div ref={templatesRef}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className={cn('w-4 h-4', st('text-slate-400', 'text-zinc-500'))} />
            <h2 className={cn('text-sm font-semibold uppercase tracking-wider', st('text-slate-500', 'text-zinc-400'))}>
              Available Templates
            </h2>
            {availableTemplates.length > 0 && (
              <SentinelBadge variant="neutral" size="sm">
                {availableTemplates.length}
              </SentinelBadge>
            )}
          </div>

          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index}
                  enabling={enablingSlug === template.slug}
                  onEnable={() => handleEnableFramework(template)}
                  st={st}
                />
              ))}
            </div>
          ) : availableTemplates.length === 0 ? (
            <SentinelCard padding="lg" className="text-center">
              <CheckCircle2 className={cn('w-10 h-10 mx-auto mb-3 opacity-40', st('text-emerald-500', 'text-emerald-400'))} />
              <p className={cn('text-sm font-medium mb-1', st('text-slate-700', 'text-zinc-300'))}>
                All frameworks enabled
              </p>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                You have enabled every available template framework.
              </p>
            </SentinelCard>
          ) : (
            <SentinelCard padding="lg" className="text-center">
              <Search className={cn('w-10 h-10 mx-auto mb-3 opacity-30', st('text-slate-400', 'text-zinc-500'))} />
              <p className={cn('text-sm', st('text-slate-500', 'text-zinc-400'))}>
                No available templates match "{searchQuery}"
              </p>
            </SentinelCard>
          )}
        </div>
      </div>
    </SentinelPageTransition>
  );
}

// ---------------------------------------------------------------------------
// Framework Card (active company framework)
// ---------------------------------------------------------------------------

function FrameworkCard({ framework, index, st }) {
  const fw = framework;
  const Icon = getFrameworkIcon(fw.slug);
  const regionCfg = REGION_CONFIG[fw.region] || REGION_CONFIG.global;
  const categoryCfg = CATEGORY_CONFIG[fw.category] || CATEGORY_CONFIG.security;
  const statusCfg = STATUS_CONFIG[fw.status] || STATUS_CONFIG['not-started'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <SentinelCard padding="none" className="overflow-hidden h-full flex flex-col">
        {/* Top accent bar */}
        <div
          className={cn(
            'h-1 w-full',
            fw.status === 'certified'
              ? st('bg-emerald-500', 'bg-emerald-500')
              : fw.status === 'audit-ready'
                ? st('bg-emerald-400', 'bg-emerald-400')
                : fw.status === 'in-progress'
                  ? st('bg-yellow-400', 'bg-yellow-500')
                  : st('bg-slate-200', 'bg-zinc-800')
          )}
        />

        <div className="p-5 flex-1 flex flex-col space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
                  st('bg-emerald-100 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/20')
                )}
              >
                <Icon className={cn('w-5 h-5', st('text-emerald-600', 'text-emerald-400'))} />
              </div>
              <div className="min-w-0">
                <h3 className={cn('text-sm font-semibold truncate', st('text-slate-900', 'text-white'))}>
                  {fw.name}
                </h3>
                {fw.version && (
                  <SentinelBadge variant="neutral" size="sm" className="mt-1">
                    v{fw.version}
                  </SentinelBadge>
                )}
              </div>
            </div>

            {/* Status badge */}
            <SentinelBadge variant={statusCfg.variant} size="sm">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full mr-1.5 inline-block',
                  st(statusCfg.dot[0], statusCfg.dot[1])
                )}
              />
              {statusCfg.label}
            </SentinelBadge>
          </div>

          {/* Description */}
          {fw.description && (
            <p className={cn('text-xs leading-relaxed line-clamp-2', st('text-slate-500', 'text-zinc-400'))}>
              {fw.description}
            </p>
          )}

          {/* Region + Category badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SentinelBadge variant={regionCfg.variant} size="sm">
              <regionCfg.icon className="w-3 h-3 mr-1" />
              {regionCfg.label}
            </SentinelBadge>
            <SentinelBadge variant={categoryCfg.variant} size="sm">
              <categoryCfg.icon className="w-3 h-3 mr-1" />
              {categoryCfg.label}
            </SentinelBadge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={cn('text-[11px] font-medium', st('text-slate-500', 'text-zinc-400'))}>
                Controls: {fw.controlsImplemented} / {fw.controlsTotal}
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold tabular-nums',
                  fw.progressPercent >= 80
                    ? st('text-emerald-600', 'text-emerald-400')
                    : fw.progressPercent >= 40
                      ? st('text-yellow-600', 'text-yellow-400')
                      : st('text-slate-500', 'text-zinc-400')
                )}
              >
                {fw.progressPercent}%
              </span>
            </div>
            <div className={cn('h-2 rounded-full overflow-hidden', st('bg-slate-100', 'bg-zinc-800/50'))}>
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  fw.progressPercent >= 80
                    ? st('bg-emerald-400', 'bg-emerald-500')
                    : fw.progressPercent >= 40
                      ? st('bg-yellow-400', 'bg-yellow-500')
                      : st('bg-slate-300', 'bg-zinc-600')
                )}
                initial={{ width: 0 }}
                animate={{ width: `${fw.progressPercent}%` }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Target date */}
          {fw.target_date && (
            <div className="flex items-center gap-2">
              <Calendar className={cn('w-3.5 h-3.5', st('text-slate-400', 'text-zinc-500'))} />
              <span className={cn('text-[11px] font-medium', st('text-slate-500', 'text-zinc-400'))}>
                Target: {formatDate(fw.target_date)}
              </span>
            </div>
          )}

          {/* Certified date */}
          {fw.certified_at && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className={cn('w-3.5 h-3.5', st('text-emerald-500', 'text-emerald-400'))} />
              <span className={cn('text-[11px] font-medium', st('text-emerald-600', 'text-emerald-400'))}>
                Certified: {formatDate(fw.certified_at)}
              </span>
            </div>
          )}

          {/* Spacer to push button to bottom */}
          <div className="flex-1" />

          {/* Footer actions */}
          <div
            className="flex items-center justify-end pt-3 border-t border-dashed"
            style={{ borderColor: st('rgb(226 232 240)', 'rgb(63 63 70 / 0.4)') }}
          >
            <Link to={createPageUrl(`ComplianceControls?framework_id=${fw.id}`)}>
              <SentinelButton size="sm" variant="secondary" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                View Controls
              </SentinelButton>
            </Link>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Template Card (available to enable)
// ---------------------------------------------------------------------------

function TemplateCard({ template, index, enabling, onEnable, st }) {
  const t = template;
  const Icon = getFrameworkIcon(t.slug);
  const regionCfg = REGION_CONFIG[t.region] || REGION_CONFIG.global;
  const categoryCfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.security;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <SentinelCard padding="none" className="overflow-hidden h-full flex flex-col">
        {/* Subtle top bar for templates */}
        <div className={cn('h-1 w-full', st('bg-slate-200', 'bg-zinc-800'))} />

        <div className="p-5 flex-1 flex flex-col space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
                st('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')
              )}
            >
              <Icon className={cn('w-5 h-5', st('text-slate-500', 'text-zinc-400'))} />
            </div>
            <div className="min-w-0">
              <h3 className={cn('text-sm font-semibold truncate', st('text-slate-900', 'text-white'))}>
                {t.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                {t.version && (
                  <SentinelBadge variant="neutral" size="sm">
                    v{t.version}
                  </SentinelBadge>
                )}
                {t.total_controls > 0 && (
                  <SentinelBadge variant="neutral" size="sm">
                    {t.total_controls} controls
                  </SentinelBadge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {t.description && (
            <p className={cn('text-xs leading-relaxed line-clamp-3', st('text-slate-500', 'text-zinc-400'))}>
              {t.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SentinelBadge variant={regionCfg.variant} size="sm">
              <regionCfg.icon className="w-3 h-3 mr-1" />
              {regionCfg.label}
            </SentinelBadge>
            <SentinelBadge variant={categoryCfg.variant} size="sm">
              <categoryCfg.icon className="w-3 h-3 mr-1" />
              {categoryCfg.label}
            </SentinelBadge>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Enable button */}
          <div
            className="flex items-center justify-end pt-3 border-t border-dashed"
            style={{ borderColor: st('rgb(226 232 240)', 'rgb(63 63 70 / 0.4)') }}
          >
            <SentinelButton
              size="sm"
              icon={enabling ? undefined : <ShieldCheck className="w-3.5 h-3.5" />}
              loading={enabling}
              onClick={onEnable}
              disabled={enabling}
            >
              {enabling ? 'Enabling...' : 'Enable Framework'}
            </SentinelButton>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}
