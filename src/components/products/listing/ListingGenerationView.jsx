import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  Sparkles,
  PenTool,
  ImageIcon,
  Video,
  Trophy,
  ArrowRight,
  Brain,
  Search,
  Clock,
  Film,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import confetti from 'canvas-confetti';

// ---------------------------------------------------------------------------
// Phase Progress Bar (5-step horizontal stepper)
// ---------------------------------------------------------------------------

const PHASES = [
  { key: 'copy', label: 'Copy', icon: PenTool },
  { key: 'hero', label: 'Hero', icon: ImageIcon },
  { key: 'gallery', label: 'Gallery', icon: ImageIcon },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'done', label: 'Done', icon: Trophy },
];

function PhaseProgressBar({ progress }) {
  const { t } = useTheme();
  const currentPhase = progress?.phase || 'copy';
  const phaseKeys = PHASES.map((p) => p.key);
  const currentIdx = phaseKeys.indexOf(currentPhase);
  const elapsed = progress?.startTime ? Math.floor((Date.now() - progress.startTime) / 1000) : 0;
  const [elapsedSec, setElapsedSec] = useState(elapsed);

  useEffect(() => {
    if (!progress?.startTime || progress?.phase === 'done') return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - progress.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [progress?.startTime, progress?.phase]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      'rounded-2xl border p-5',
      t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
    )}>
      {/* Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
            {progress?.phase === 'done' ? 'Generation Complete' : 'AI Generation in Progress'}
          </span>
        </div>
        <div className={cn('flex items-center gap-1.5 text-xs font-medium tabular-nums', t('text-slate-500', 'text-zinc-500'))}>
          <Clock className="w-3.5 h-3.5" />
          {formatTime(elapsedSec)}
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const isDone = idx < currentIdx || currentPhase === 'done';
          const isActive = phase.key === currentPhase && currentPhase !== 'done';
          const isFuture = idx > currentIdx && currentPhase !== 'done';

          return (
            <React.Fragment key={phase.key}>
              {idx > 0 && (
                <div className={cn(
                  'flex-1 h-0.5 rounded-full transition-all duration-500',
                  isDone || (isActive && idx === currentIdx)
                    ? 'bg-cyan-400'
                    : t('bg-slate-100', 'bg-white/[0.06]')
                )} />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                    isDone
                      ? 'bg-cyan-500/15 text-cyan-400'
                      : isActive
                        ? 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-400/30'
                        : cn(t('bg-slate-50 text-slate-300', 'bg-white/[0.04] text-zinc-600'))
                  )}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </motion.div>
                <span className={cn(
                  'text-[10px] font-medium',
                  isDone ? 'text-cyan-400' : isActive ? t('text-slate-700', 'text-white') : t('text-slate-400', 'text-zinc-600')
                )}>
                  {phase.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className={cn('h-1.5 rounded-full overflow-hidden mt-4', t('bg-slate-100', 'bg-white/[0.06]'))}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress?.progress || 0}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
        />
      </div>
      <p className={cn('text-xs mt-2', t('text-slate-500', 'text-zinc-500'))}>
        {progress?.stepLabel || 'Starting...'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy Reveal Section
// ---------------------------------------------------------------------------

function CopyRevealSection({ copy }) {
  const { t } = useTheme();
  const [visibleTitle, setVisibleTitle] = useState('');
  const titleRef = useRef(null);

  // Typewriter effect for title
  useEffect(() => {
    if (!copy?.title) return;
    setVisibleTitle('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleTitle(copy.title.slice(0, i));
      if (i >= copy.title.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [copy?.title]);

  if (!copy) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border p-6 space-y-5',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <PenTool className="w-4 h-4 text-cyan-400" />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
          AI-Generated Copy
        </span>
      </div>

      {/* Title with typewriter */}
      <h2 className={cn('text-2xl font-bold leading-tight', t('text-slate-900', 'text-white'))}>
        {visibleTitle}
        {visibleTitle.length < (copy.title?.length || 0) && (
          <span className="inline-block w-0.5 h-6 bg-cyan-400 ml-0.5 animate-pulse" />
        )}
      </h2>

      {/* Tagline */}
      {copy.shortTagline && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={cn('text-sm italic', t('text-slate-500', 'text-zinc-400'))}
        >
          "{copy.shortTagline}"
        </motion.p>
      )}

      {/* Description (HTML) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className={cn('text-sm leading-relaxed prose prose-sm max-w-none', t('text-slate-600 prose-slate', 'text-zinc-400 prose-invert'))}
        dangerouslySetInnerHTML={{ __html: copy.description }}
      />

      {/* Bullet points - staggered */}
      {copy.bulletPoints?.length > 0 && (
        <div className="space-y-2">
          <p className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
            Key Features
          </p>
          {copy.bulletPoints.map((bullet, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + idx * 0.15, duration: 0.3 }}
              className={cn('flex items-start gap-2.5 text-sm', t('text-slate-700', 'text-zinc-300'))}
            >
              <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span dangerouslySetInnerHTML={{ __html: typeof bullet === 'string' ? bullet : bullet.text || '' }} />
            </motion.div>
          ))}
        </div>
      )}

      {/* SEO Keywords as pills */}
      {copy.searchKeywords?.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <p className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
              SEO Keywords
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {copy.searchKeywords.map((kw, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.2 + idx * 0.08, type: 'spring', damping: 20 }}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg font-medium',
                  t('bg-cyan-50 text-cyan-700', 'bg-cyan-500/10 text-cyan-400')
                )}
              >
                {typeof kw === 'string' ? kw : kw.keyword || kw.text || ''}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Reasoning */}
      {copy.reasoning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          className={cn(
            'flex items-start gap-3 rounded-xl p-4 border',
            t('bg-cyan-50/50 border-cyan-100', 'bg-cyan-500/[0.05] border-cyan-500/10')
          )}
        >
          <Brain className={cn('w-4 h-4 flex-shrink-0 mt-0.5', t('text-cyan-600', 'text-cyan-400'))} />
          <div>
            <p className={cn('text-xs font-semibold mb-1', t('text-cyan-700', 'text-cyan-400'))}>
              AI Reasoning
            </p>
            <p className={cn('text-xs leading-relaxed', t('text-cyan-600', 'text-cyan-400/80'))}>
              {copy.reasoning}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Hero Image Section
// ---------------------------------------------------------------------------

function HeroImageSection({ heroImageUrl, isLoading }) {
  const { t } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}
    >
      <div className="p-4 pb-2 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-cyan-400" />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
          Hero Image
        </span>
      </div>

      <div className="px-4 pb-4">
        {heroImageUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative rounded-xl overflow-hidden shadow-lg shadow-cyan-500/10"
          >
            <img
              src={heroImageUrl}
              alt="Hero product shot"
              className="w-full h-80 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
          </motion.div>
        ) : isLoading ? (
          <div className={cn(
            'w-full h-80 rounded-xl animate-pulse flex items-center justify-center',
            t('bg-slate-100', 'bg-white/[0.04]')
          )}>
            <div className="text-center space-y-2">
              <Loader2 className={cn('w-8 h-8 animate-spin mx-auto', t('text-slate-300', 'text-zinc-600'))} />
              <p className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>Creating studio shot...</p>
            </div>
          </div>
        ) : null}
        <p className={cn('text-xs mt-2 text-center', t('text-slate-400', 'text-zinc-600'))}>
          Studio-quality hero shot on white background
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Gallery Section
// ---------------------------------------------------------------------------

function GallerySection({ galleryImages = [], galleryTotal = 4, isLoading }) {
  const { t } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border p-5',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
            Gallery Images
          </span>
        </div>
        <span className={cn('text-xs font-medium tabular-nums', t('text-slate-400', 'text-zinc-500'))}>
          {galleryImages.length} of {galleryTotal} ready
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: galleryTotal }).map((_, idx) => {
          const img = galleryImages[idx];

          if (img) {
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200, delay: idx * 0.05 }}
                className="relative aspect-square rounded-xl overflow-hidden shadow-md"
              >
                <img
                  src={img.url}
                  alt={img.description || `Gallery ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] text-white/80 font-medium">{img.description}</p>
                </div>
              </motion.div>
            );
          }

          // Shimmer placeholder
          return (
            <div
              key={idx}
              className={cn(
                'aspect-square rounded-xl overflow-hidden',
                isLoading ? 'animate-pulse' : '',
                t('bg-slate-100', 'bg-white/[0.04]')
              )}
            >
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className={cn('w-5 h-5 animate-spin', t('text-slate-300', 'text-zinc-600'))} />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className={cn('w-6 h-6', t('text-slate-200', 'text-zinc-700'))} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Video Section
// ---------------------------------------------------------------------------

function VideoSection({ videoUrl, isLoading }) {
  const { t } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border p-5',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-4 h-4 text-cyan-400" />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
          Product Video
        </span>
      </div>

      {videoUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative rounded-xl overflow-hidden"
        >
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl"
            poster={videoUrl.replace(/\.[^.]+$/, '.jpg')}
          />
        </motion.div>
      ) : isLoading ? (
        <div className={cn(
          'w-full h-48 rounded-xl flex flex-col items-center justify-center gap-3',
          t('bg-slate-50', 'bg-white/[0.02]')
        )}>
          {/* Film strip animation */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                className={cn('w-8 h-6 rounded', t('bg-slate-200', 'bg-white/[0.08]'))}
              />
            ))}
          </div>
          <p className={cn('text-xs', t('text-slate-400', 'text-zinc-500'))}>
            Generating cinematic product video...
          </p>
        </div>
      ) : (
        <div className={cn(
          'w-full h-32 rounded-xl flex items-center justify-center',
          t('bg-slate-50', 'bg-white/[0.02]')
        )}>
          <p className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>
            Video generation skipped
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Quality Score Ring (reused pattern from ListingOverview)
// ---------------------------------------------------------------------------

function QualityRingSmall({ score, size = 120 }) {
  const { t } = useTheme();
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  const color = score >= 80 ? '#22d3ee' : score >= 50 ? '#60a5fa' : score >= 25 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={t('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)')} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold tabular-nums', t('text-slate-900', 'text-white'))}>{score}</span>
        <span className={cn('text-[10px] font-medium', t('text-slate-500', 'text-zinc-500'))}>/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grand Finale
// ---------------------------------------------------------------------------

function GrandFinale({ progress, listing, product, onNavigateToPublish }) {
  const { t } = useTheme();
  const confettiFired = useRef(false);

  // Fire confetti once
  useEffect(() => {
    if (progress?.phase === 'done' && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => {
          confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 } });
        }, 300);
      }, 400);
    }
  }, [progress?.phase]);

  // Calculate simple quality score
  const score = useMemo(() => {
    let s = 0;
    if (progress?.copy?.title) s += 15;
    if (progress?.copy?.description) s += 15;
    if ((progress?.copy?.bulletPoints?.length || 0) >= 3) s += 10;
    if (progress?.copy?.seoTitle) s += 5;
    if (progress?.copy?.seoDescription) s += 5;
    if (progress?.heroImageUrl) s += 20;
    const galleryCount = progress?.galleryImages?.length || 0;
    s += Math.min(galleryCount * 5, 20);
    if (progress?.videoUrl) s += 10;
    return Math.min(s, 100);
  }, [progress]);

  if (progress?.phase !== 'done') return null;

  const heroImage = progress?.heroImageUrl || listing?.hero_image_url;
  const galleryImages = progress?.galleryImages || [];
  const title = progress?.copy?.title || listing?.listing_title || product?.name || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}
    >
      {/* Score Header */}
      <div className={cn(
        'p-6 flex items-center gap-6 border-b',
        t('border-slate-100', 'border-white/5')
      )}>
        <QualityRingSmall score={score} />
        <div>
          <p className={cn('text-lg font-bold', t('text-slate-900', 'text-white'))}>
            Your listing is ready!
          </p>
          <p className={cn('text-sm mt-0.5', t('text-slate-500', 'text-zinc-400'))}>
            {score >= 80
              ? 'Excellent quality - ready to publish'
              : score >= 50
                ? 'Good quality - review before publishing'
                : 'Basic listing - consider adding more content'}
          </p>
        </div>
      </div>

      {/* Preview: Hero + Gallery Row */}
      <div className="p-6 space-y-4">
        {heroImage && (
          <img
            src={heroImage}
            alt={title}
            className={cn('w-full h-64 object-cover rounded-xl border', t('border-slate-200', 'border-white/10'))}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {galleryImages.map((img, idx) => (
              <div key={idx} className={cn('aspect-square rounded-lg overflow-hidden border', t('border-slate-200', 'border-white/10'))}>
                <img src={img.url} alt={img.description} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            ))}
          </div>
        )}

        {/* Title + Description preview */}
        <div>
          <h3 className={cn('text-lg font-semibold', t('text-slate-900', 'text-white'))}>
            {title}
          </h3>
          {progress?.copy?.description && (
            <div
              className={cn('text-sm leading-relaxed mt-2 line-clamp-3', t('text-slate-600', 'text-zinc-400'))}
              dangerouslySetInnerHTML={{ __html: progress.copy.description }}
            />
          )}
        </div>

        {/* Video thumbnail */}
        {progress?.videoUrl && (
          <div className="relative rounded-xl overflow-hidden">
            <video src={progress.videoUrl} className="w-full h-40 object-cover rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className={cn('p-6 border-t', t('border-slate-100', 'border-white/5'))}>
        <button
          onClick={onNavigateToPublish}
          className="w-full relative overflow-hidden group flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
        >
          <span>Review & Publish</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Export: ListingGenerationView
// ---------------------------------------------------------------------------

export default function ListingGenerationView({ progress, listing, product, onNavigateToPublish }) {
  if (!progress) return null;

  const isPhaseActive = (phase) => progress.phase === phase;
  const isPhaseDone = (phase) => {
    const order = ['copy', 'hero', 'gallery', 'video', 'done'];
    return order.indexOf(progress.phase) > order.indexOf(phase);
  };

  return (
    <div className="space-y-4">
      {/* Always show progress bar */}
      <PhaseProgressBar progress={progress} />

      {/* Copy section - show when copy arrives */}
      <AnimatePresence>
        {(progress.copy) && (
          <CopyRevealSection copy={progress.copy} />
        )}
      </AnimatePresence>

      {/* Hero image - show during/after hero phase */}
      <AnimatePresence>
        {(isPhaseActive('hero') || isPhaseDone('hero')) && (
          <HeroImageSection
            heroImageUrl={progress.heroImageUrl}
            isLoading={isPhaseActive('hero') && !progress.heroImageUrl}
          />
        )}
      </AnimatePresence>

      {/* Gallery - show during/after gallery phase */}
      <AnimatePresence>
        {(isPhaseActive('gallery') || isPhaseDone('gallery')) && (
          <GallerySection
            galleryImages={progress.galleryImages || []}
            galleryTotal={progress.galleryTotal || 4}
            isLoading={isPhaseActive('gallery')}
          />
        )}
      </AnimatePresence>

      {/* Video - show during/after video phase */}
      <AnimatePresence>
        {(isPhaseActive('video') || isPhaseDone('video')) && (
          <VideoSection
            videoUrl={progress.videoUrl}
            isLoading={isPhaseActive('video') && !progress.videoUrl}
          />
        )}
      </AnimatePresence>

      {/* Grand Finale */}
      <AnimatePresence>
        {progress.phase === 'done' && (
          <GrandFinale
            progress={progress}
            listing={listing}
            product={product}
            onNavigateToPublish={onNavigateToPublish}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
