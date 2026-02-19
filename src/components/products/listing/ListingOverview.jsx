import React, { useMemo, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

// --- Score Calculation ---

function calculateScores(listing, product) {
  // Images score (max 50)
  const hasHero = !!(listing?.hero_image_url || product?.featured_image);
  const galleryCount = listing?.gallery_urls?.length || product?.gallery?.length || 0;
  const imagesScore = (hasHero ? 30 : 0) + Math.min(galleryCount * 5, 20);

  // Copy score (max 30)
  const hasTitle = !!(listing?.listing_title || listing?.title || product?.name);
  const hasDescription = !!(listing?.listing_description || listing?.description || product?.description);
  const bulletsCount = listing?.bullet_points?.length || 0;
  const copyScore = (hasTitle ? 10 : 0) + (hasDescription ? 10 : 0) + Math.min(bulletsCount * 2, 10);

  // SEO score (max 15)
  const hasSeoTitle = !!listing?.seo_title;
  const hasSeoDescription = !!listing?.seo_description;
  const keywordsCount = listing?.search_keywords?.length || listing?.keywords?.length || 0;
  const seoScore = (hasSeoTitle ? 5 : 0) + (hasSeoDescription ? 5 : 0) + (keywordsCount > 3 ? 5 : 0);

  // Completeness (max 5)
  const requiredFields = [hasHero, hasTitle, hasDescription, bulletsCount >= 3, hasSeoTitle];
  const completeness = requiredFields.every(Boolean) ? 5 : 0;

  const total = imagesScore + copyScore + seoScore + completeness;

  return {
    total,
    images: { score: imagesScore, max: 50, pct: Math.round((imagesScore / 50) * 100) },
    copy: { score: copyScore, max: 30, pct: Math.round((copyScore / 30) * 100) },
    seo: { score: seoScore, max: 15, pct: Math.round((seoScore / 15) * 100) },
    completeness: { score: completeness, max: 5, pct: completeness > 0 ? 100 : 0 },
  };
}

// --- Quality Score Ring (SVG) ---

function QualityRing({ score, size = 180, strokeWidth = 12 }) {
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

  // Color based on score
  const getColor = () => {
    if (score >= 80) return { stroke: '#22d3ee', glow: 'rgba(34, 211, 238, 0.3)' }; // cyan-400
    if (score >= 50) return { stroke: '#60a5fa', glow: 'rgba(96, 165, 250, 0.3)' }; // blue-400
    if (score >= 25) return { stroke: '#fbbf24', glow: 'rgba(251, 191, 36, 0.3)' }; // amber-400
    return { stroke: '#f87171', glow: 'rgba(248, 113, 113, 0.3)' }; // red-400
  };

  const color = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={t('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)')}
          strokeWidth={strokeWidth}
        />
        {/* Glow layer */}
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
        {/* Main arc */}
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
      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-bold tabular-nums', t('text-slate-900', 'text-white'))}>
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
      'rounded-2xl border p-5 transition-all duration-200 group',
      t(
        'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm',
        'bg-zinc-900/50 border-white/5 hover:border-white/10'
      )
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
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

  const scores = useMemo(() => calculateScores(listing, product), [listing, product]);

  // Checklist items
  const checklist = useMemo(() => {
    const hasHero = !!(listing?.hero_image_url || product?.featured_image);
    const hasTitle = !!(listing?.listing_title || listing?.title || product?.name);
    const hasDescription = !!(listing?.listing_description || listing?.description || product?.description);
    const hasBullets = (listing?.bullet_points?.length || 0) >= 3;
    const hasSeoTitle = !!listing?.seo_title;
    const hasSeoDesc = !!listing?.seo_description;

    return [
      { label: 'Hero image (required)', completed: hasHero },
      { label: 'Product title', completed: hasTitle },
      { label: 'Product description', completed: hasDescription },
      { label: 'At least 3 bullet points', completed: hasBullets },
      { label: 'SEO meta title', completed: hasSeoTitle },
      { label: 'SEO meta description', completed: hasSeoDesc },
    ];
  }, [listing, product]);

  const incompleteCount = checklist.filter((item) => !item.completed).length;

  return (
    <div className="space-y-6">
      {/* Quality Score + Breakdown */}
      <div className={cn(
        'rounded-2xl border p-6 lg:p-8',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: Score Ring */}
          <div className="flex flex-col items-center gap-4">
            <QualityRing score={scores.total} />
            <div className="text-center">
              <p className={cn('text-base font-semibold', t('text-slate-900', 'text-white'))}>
                Listing Quality
              </p>
              <p className={cn('text-sm mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                {scores.total >= 80
                  ? 'Excellent - ready to publish'
                  : scores.total >= 50
                    ? 'Good - a few improvements needed'
                    : scores.total >= 25
                      ? 'Fair - needs more content'
                      : 'Getting started'}
              </p>
            </div>
          </div>

          {/* Right: Score Breakdown */}
          <div className="space-y-4">
            <ScoreBar label="Images" pct={scores.images.pct} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
            <ScoreBar label="Copy" pct={scores.copy.pct} color="bg-gradient-to-r from-blue-500 to-blue-400" />
            <ScoreBar label="SEO" pct={scores.seo.pct} color="bg-gradient-to-r from-violet-500 to-violet-400" />
            <ScoreBar label="Complete" pct={scores.completeness.pct} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
          </div>
        </div>
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
        'rounded-2xl border p-6',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <h3 className={cn('text-sm font-semibold mb-4', t('text-slate-900', 'text-white'))}>
          Quick Actions
        </h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {/* Hero: Generate Everything / Progress Tracker */}
          {generatingProgress ? (
            <div className="sm:col-span-3 rounded-2xl overflow-hidden bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <p className="text-sm font-semibold text-white">
                    {generatingProgress.stepLabel || 'Generating...'}
                  </p>
                </div>

                {/* Overall progress bar */}
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${generatingProgress.progress || 0}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full bg-white"
                    />
                  </div>
                  <p className="text-xs text-white/60 tabular-nums">
                    {Math.round(generatingProgress.progress || 0)}% complete
                  </p>
                </div>

                {/* Step indicators */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'copy', label: 'Copy' },
                    { key: 'hero', label: 'Hero Image' },
                    { key: 'gallery', label: 'Gallery' },
                    { key: 'done', label: 'Complete' },
                  ].map((s) => {
                    const steps = ['copy', 'hero', 'gallery', 'done'];
                    const currentIdx = steps.indexOf(generatingProgress.step);
                    const stepIdx = steps.indexOf(s.key);
                    const isDone = stepIdx < currentIdx || generatingProgress.step === 'done';
                    const isActive = s.key === generatingProgress.step && generatingProgress.step !== 'done';

                    return (
                      <div key={s.key} className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                          isDone
                            ? 'bg-white text-cyan-600'
                            : isActive
                              ? 'bg-white/30 text-white ring-2 ring-white/50'
                              : 'bg-white/10 text-white/40'
                        )}>
                          {isDone ? (
                            <Check className="w-4 h-4" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            stepIdx + 1
                          )}
                        </div>
                        <span className={cn(
                          'text-[10px] font-medium',
                          isDone ? 'text-white' : isActive ? 'text-white/80' : 'text-white/40'
                        )}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onGenerateAll}
              disabled={loading}
              className={cn(
                'sm:col-span-3 relative overflow-hidden group rounded-2xl p-5 text-left transition-all duration-300',
                'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
                'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30',
                loading && 'opacity-70 cursor-not-allowed'
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  {loading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    {loading ? 'Generating...' : 'Generate Everything with AI'}
                  </p>
                  <p className="text-sm text-white/70 mt-0.5">
                    Auto-generate title, description, bullets, SEO meta, hero + gallery images
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/60 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          )}

          {/* Secondary: Generate Copy */}
          <button
            onClick={() => onTabChange?.('copywriter')}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              )
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
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
              'flex items-center gap-3 rounded-xl border p-4 transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              )
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
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
              'flex items-center gap-3 rounded-xl border p-4 transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              )
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
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
          'rounded-2xl border p-6',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <div className="flex items-center justify-between mb-3">
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
