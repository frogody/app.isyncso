import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  PenTool,
  ImageIcon,
  Check,
  Circle,
  ShoppingBag,
  Store,
  Globe,
  Clock,
  ArrowRight,
  Loader2,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { supabase } from '@/api/supabaseClient';
import ListingGenerationView from './ListingGenerationView';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

// --- Quality Score Ring (SVG) ---

function QualityRing({ score, size = 140, strokeWidth = 10 }) {
  const { t } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  const targetOffset = circumference - (score / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const getColor = () => {
    if (score >= 80) return { stroke: '#22d3ee', glow: 'rgba(34, 211, 238, 0.3)' };
    if (score >= 50) return { stroke: '#60a5fa', glow: 'rgba(96, 165, 250, 0.3)' };
    if (score >= 25) return { stroke: '#fbbf24', glow: 'rgba(251, 191, 36, 0.3)' };
    return { stroke: '#f87171', glow: 'rgba(248, 113, 113, 0.3)' };
  };

  const color = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={t('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)')}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.glow}
          strokeWidth={strokeWidth + 6}
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold tabular-nums', t('text-slate-900', 'text-white'))}>
          {score}
        </span>
        <span className={cn('text-xs font-medium mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
          / 100
        </span>
      </div>
    </div>
  );
}

// --- Score Breakdown Bar ---

function ScoreBar({ label, pct, color }) {
  const { t } = useTheme();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', t('text-slate-600', 'text-zinc-400'))}>{label}</span>
        <span className={cn('text-xs font-semibold tabular-nums', t('text-slate-800', 'text-zinc-200'))}>{pct}%</span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden', t('bg-slate-100', 'bg-white/[0.06]'))}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  );
}

// --- Channel Status Card ---

function ChannelCard({ channel, listing, onAction }) {
  const { t } = useTheme();

  const channelConfig = {
    shopify: { icon: ShoppingBag, label: 'Shopify', color: 'text-green-400', bg: 'bg-green-500/10' },
    bolcom: { icon: Store, label: 'bol.com', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    generic: { icon: Globe, label: 'Generic', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  };

  const config = channelConfig[channel] || channelConfig.generic;
  const Icon = config.icon;

  const status = listing?.status || 'draft';
  const statusConfig = {
    draft: { label: 'Draft', bg: t('bg-slate-100', 'bg-zinc-800'), text: t('text-slate-600', 'text-zinc-400') },
    ready: { label: 'Ready', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    published: { label: 'Published', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  };
  const st = statusConfig[status] || statusConfig.draft;

  const lastUpdated = listing?.updated_at
    ? new Date(listing.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all duration-200 group',
      t(
        'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm',
        'bg-zinc-900/50 border-white/5 hover:border-white/10'
      )
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <p className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>{config.label}</p>
            {lastUpdated && (
              <p className={cn('text-xs mt-0.5 flex items-center gap-1', t('text-slate-400', 'text-zinc-500'))}>
                <Clock className="w-3 h-3" />
                {lastUpdated}
              </p>
            )}
          </div>
        </div>
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', st.bg, st.text)}>
          {st.label}
        </span>
      </div>

      <button
        onClick={() => onAction(channel)}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          listing
            ? t(
                'bg-slate-50 text-slate-700 hover:bg-slate-100',
                'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
              )
            : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
        )}
      >
        {listing ? 'Update Listing' : 'Create Listing'}
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

// --- Checklist Item ---

function ChecklistItem({ label, completed }) {
  const { t } = useTheme();
  return (
    <div className="flex items-center gap-3 py-2">
      {completed ? (
        <div className="w-5 h-5 rounded-full bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-cyan-400" />
        </div>
      ) : (
        <Circle className={cn('w-5 h-5 flex-shrink-0', t('text-slate-300', 'text-zinc-600'))} />
      )}
      <span className={cn(
        'text-sm',
        completed
          ? t('text-slate-500 line-through', 'text-zinc-500 line-through')
          : t('text-slate-700', 'text-zinc-300')
      )}>
        {label}
      </span>
    </div>
  );
}

// --- Main Component ---

export default function ListingOverview({ product, details, listing, onGenerateAll, onTabChange, loading, generatingProgress }) {
  const { t } = useTheme();

  const [auditData, setAuditData] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // Run AI audit automatically when listing changes
  const runAudit = useCallback(async () => {
    if (!listing?.listing_title && !listing?.listing_description && !listing?.hero_image_url) {
      setAuditData(null);
      return;
    }

    setAuditing(true);
    setAuditError(null);
    try {
      const { data, error } = await supabase.functions.invoke('audit-listing', {
        body: {
          listing_title: listing?.listing_title || '',
          short_tagline: listing?.short_tagline || '',
          listing_description: listing?.listing_description || '',
          bullet_points: listing?.bullet_points || [],
          seo_title: listing?.seo_title || '',
          seo_description: listing?.seo_description || '',
          search_keywords: listing?.search_keywords || [],
          hero_image_url: listing?.hero_image_url || null,
          gallery_urls: listing?.gallery_urls || [],
          video_url: listing?.video_url || null,
          video_reference_frames: listing?.video_reference_frames || [],
          product_name: product?.name || '',
          product_brand: product?.brand || '',
          product_category: product?.category || details?.category || '',
          channel: listing?.channel || 'General marketplace',
        },
      });
      if (error) throw error;
      setAuditData(data);
    } catch (err) {
      console.error('[ListingOverview] Audit failed:', err);
      setAuditError('Audit failed. Click to retry.');
    } finally {
      setAuditing(false);
    }
  }, [listing, product, details]);

  // Auto-run audit on mount if listing has content
  useEffect(() => {
    if (listing?.listing_title || listing?.listing_description || listing?.hero_image_url) {
      runAudit();
    }
  }, [listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract audit scores for the bars
  // categories comes back as an array: [{ name: "Title & Tagline", score: 60, ... }, ...]
  const auditScores = useMemo(() => {
    if (!auditData) return null;
    const cats = auditData.categories || [];
    const findScore = (name) => {
      if (Array.isArray(cats)) {
        const cat = cats.find(c => c.name === name);
        return cat?.score ?? 0;
      }
      // Fallback if categories is an object
      return cats[name] ?? 0;
    };
    return {
      overall: auditData.overall_score ?? auditData.score ?? 0,
      title: findScore('Title & Tagline'),
      bullets: findScore('Bullet Points'),
      description: findScore('Description'),
      visual: findScore('Visual Content'),
      seo: findScore('SEO & Discoverability'),
      conversion: findScore('Conversion Readiness'),
    };
  }, [auditData]);

  // Checklist — only listing-specific fields
  const checklist = useMemo(() => {
    const title = listing?.listing_title || '';
    const desc = listing?.listing_description || '';
    const bullets = listing?.bullet_points || [];

    return [
      { label: 'AI-generated hero image', completed: !!listing?.hero_image_url },
      { label: 'Listing title (20+ characters)', completed: title.length >= 20 },
      { label: 'Listing description (100+ characters)', completed: desc.length >= 100 },
      { label: 'At least 3 bullet points', completed: bullets.length >= 3 },
      { label: 'Gallery images (3+)', completed: (listing?.gallery_urls?.length || 0) >= 3 },
      { label: 'SEO meta title', completed: !!(listing?.seo_title) },
      { label: 'SEO meta description', completed: !!(listing?.seo_description) },
      { label: 'Search keywords (4+)', completed: (listing?.search_keywords?.length || 0) >= 4 },
      { label: 'Product video', completed: !!listing?.video_url },
    ];
  }, [listing]);

  const incompleteCount = checklist.filter((item) => !item.completed).length;

  // If generating, show the immersive generation view instead
  if (generatingProgress) {
    return (
      <ListingGenerationView
        progress={generatingProgress}
        listing={listing}
        product={product}
        onNavigateToPublish={() => onTabChange?.('publish')}
      />
    );
  }

  const overallScore = auditScores?.overall ?? 0;
  const hasAudit = !!auditScores;
  const hasListingContent = !!(listing?.listing_title || listing?.listing_description || listing?.hero_image_url);

  return (
    <div className="space-y-4">
      {/* Quality Score + Breakdown */}
      <div className={cn(
        'rounded-xl border p-4 lg:p-6',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          {/* Left: Score Ring */}
          <div className="flex flex-col items-center gap-4">
            {auditing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                <p className={cn('text-sm', t('text-slate-500', 'text-zinc-500'))}>
                  Running deep AI audit...
                </p>
              </div>
            ) : hasAudit ? (
              <>
                <QualityRing score={overallScore} />
                <div className="text-center">
                  <p className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                    Listing Quality
                  </p>
                  <p className={cn('text-sm mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                    {overallScore >= 80
                      ? 'Excellent - ready to publish'
                      : overallScore >= 60
                        ? 'Good - a few improvements needed'
                        : overallScore >= 40
                          ? 'Fair - needs attention'
                          : overallScore > 0
                            ? 'Needs significant improvement'
                            : 'Getting started'}
                  </p>
                  <button
                    onClick={runAudit}
                    className={cn(
                      'mt-2 flex items-center gap-1.5 mx-auto text-xs font-medium transition-colors',
                      t('text-slate-400 hover:text-slate-600', 'text-zinc-500 hover:text-zinc-300')
                    )}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-audit
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                {auditError ? (
                  <>
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                    <button
                      onClick={runAudit}
                      className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
                    >
                      {auditError}
                    </button>
                  </>
                ) : hasListingContent ? (
                  <button
                    onClick={runAudit}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20'
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    Run AI Quality Audit
                  </button>
                ) : (
                  <>
                    <QualityRing score={0} />
                    <div className="text-center">
                      <p className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                        Listing Quality
                      </p>
                      <p className={cn('text-sm mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                        Generate content to get started
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Score Breakdown */}
          <div className="space-y-3">
            {hasAudit ? (
              <>
                <ScoreBar label="Title & Tagline" pct={auditScores.title} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
                <ScoreBar label="Bullet Points" pct={auditScores.bullets} color="bg-gradient-to-r from-blue-500 to-blue-400" />
                <ScoreBar label="Description" pct={auditScores.description} color="bg-gradient-to-r from-indigo-500 to-indigo-400" />
                <ScoreBar label="Visual Content" pct={auditScores.visual} color="bg-gradient-to-r from-violet-500 to-violet-400" />
                <ScoreBar label="SEO & Discoverability" pct={auditScores.seo} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
                <ScoreBar label="Conversion Readiness" pct={auditScores.conversion} color="bg-gradient-to-r from-amber-500 to-amber-400" />
              </>
            ) : (
              <>
                <ScoreBar label="Title & Tagline" pct={0} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
                <ScoreBar label="Bullet Points" pct={0} color="bg-gradient-to-r from-blue-500 to-blue-400" />
                <ScoreBar label="Description" pct={0} color="bg-gradient-to-r from-indigo-500 to-indigo-400" />
                <ScoreBar label="Visual Content" pct={0} color="bg-gradient-to-r from-violet-500 to-violet-400" />
                <ScoreBar label="SEO & Discoverability" pct={0} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
                <ScoreBar label="Conversion Readiness" pct={0} color="bg-gradient-to-r from-amber-500 to-amber-400" />
              </>
            )}
          </div>
        </div>

        {/* AI Summary */}
        {auditData?.summary && (
          <div className={cn(
            'mt-4 pt-4 border-t text-sm leading-relaxed',
            t('border-slate-100 text-slate-600', 'border-white/5 text-zinc-400')
          )}>
            {auditData.summary}
          </div>
        )}

        {/* Top Priorities */}
        {auditData?.top_priorities?.length > 0 && (
          <div className={cn(
            'mt-4 pt-4 border-t',
            t('border-slate-100', 'border-white/5')
          )}>
            <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', t('text-red-500', 'text-red-400'))}>
              Top Priorities
            </p>
            <ol className="space-y-1.5">
              {auditData.top_priorities.slice(0, 5).map((p, i) => (
                <li key={i} className={cn('text-sm flex gap-2', t('text-slate-600', 'text-zinc-400'))}>
                  <span className={cn('text-xs font-bold mt-0.5 flex-shrink-0', t('text-slate-400', 'text-zinc-600'))}>{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Channel Status Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <ChannelCard
          channel="shopify"
          listing={listing?.channel === 'shopify' ? listing : null}
          onAction={() => onTabChange?.('copywriter')}
        />
        <ChannelCard
          channel="bolcom"
          listing={listing?.channel === 'bolcom' ? listing : null}
          onAction={() => onTabChange?.('copywriter')}
        />
        <ChannelCard
          channel="generic"
          listing={listing?.channel === 'generic' ? listing : null}
          onAction={() => onTabChange?.('copywriter')}
        />
      </div>

      {/* Quick Actions */}
      <div className={cn(
        'rounded-xl border p-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <h3 className={cn('text-sm font-semibold mb-3', t('text-slate-900', 'text-white'))}>
          Quick Actions
        </h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {/* Hero: Generate Everything */}
          <button
              onClick={onGenerateAll}
              disabled={loading}
              className={cn(
                'sm:col-span-3 relative overflow-hidden group rounded-xl p-4 text-left transition-all duration-300',
                'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
                'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30',
                loading && 'opacity-70 cursor-not-allowed'
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  {loading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-white flex items-center gap-2">
                    {loading ? 'Generating...' : 'Generate Everything with AI'}
                    {!loading && <CreditCostBadge credits={15} size="md" />}
                  </p>
                  <p className="text-sm text-white/70 mt-0.5">
                    AI copy, hero image, gallery, product video - the complete listing
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/60 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

          {/* Secondary: Generate Copy */}
          <button
            onClick={() => onTabChange?.('copywriter')}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              )
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              t('bg-blue-50', 'bg-blue-500/10')
            )}>
              <PenTool className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-left">
              <p className={cn('text-sm font-medium', t('text-slate-800', 'text-zinc-200'))}>
                Generate Copy Only
              </p>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Title, description, bullets
              </p>
            </div>
          </button>

          {/* Secondary: Generate Images */}
          <button
            onClick={() => onTabChange?.('images')}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              )
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              t('bg-violet-50', 'bg-violet-500/10')
            )}>
              <ImageIcon className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-left">
              <p className={cn('text-sm font-medium', t('text-slate-800', 'text-zinc-200'))}>
                Generate Images Only
              </p>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Hero, gallery, lifestyle
              </p>
            </div>
          </button>

          {/* Secondary: SEO Optimize */}
          <button
            onClick={() => onTabChange?.('copywriter')}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              )
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              t('bg-emerald-50', 'bg-emerald-500/10')
            )}>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-left">
              <p className={cn('text-sm font-medium', t('text-slate-800', 'text-zinc-200'))}>
                SEO Optimize
              </p>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Meta titles, descriptions, keywords
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Missing Items Checklist */}
      {incompleteCount > 0 && (
        <div className={cn(
          'rounded-xl border p-4',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
              Listing Checklist
            </h3>
            <span className={cn('text-xs font-medium px-2 py-1 rounded-lg', t('bg-slate-100 text-slate-600', 'bg-white/[0.06] text-zinc-400'))}>
              {checklist.filter((i) => i.completed).length}/{checklist.length} complete
            </span>
          </div>
          <div className={cn(
            'divide-y',
            t('divide-slate-100', 'divide-white/5')
          )}>
            {checklist.map((item, idx) => (
              <ChecklistItem key={idx} label={item.label} completed={item.completed} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
