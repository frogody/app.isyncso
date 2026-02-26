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
  ExternalLink,
  Lightbulb,
  Target,
  Clapperboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeHTML } from '@/components/ui/SafeHTML';
import { useTheme } from '@/contexts/GlobalThemeContext';
import confetti from 'canvas-confetti';

// ---------------------------------------------------------------------------
// Phase Progress Bar (7-step horizontal stepper)
// ---------------------------------------------------------------------------

const PHASES = [
  { key: 'research', label: 'Research', icon: Search },
  { key: 'copy', label: 'Copy', icon: PenTool },
  { key: 'hero', label: 'Hero', icon: ImageIcon },
  { key: 'gallery', label: 'Gallery', icon: ImageIcon },
  { key: 'videoframes', label: 'Frames', icon: Clapperboard },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'done', label: 'Done', icon: Trophy },
];

function PhaseProgressBar({ progress }) {
  const { t } = useTheme();
  const currentPhase = progress?.phase || 'research';
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
      <div className="flex items-center gap-0.5">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const isDone = idx < currentIdx || currentPhase === 'done';
          const isActive = phase.key === currentPhase && currentPhase !== 'done';
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
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                    isDone
                      ? 'bg-cyan-500/15 text-cyan-400'
                      : isActive
                        ? 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-400/30'
                        : cn(t('bg-slate-50 text-slate-300', 'bg-white/[0.04] text-zinc-600'))
                  )}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </motion.div>
                <span className={cn(
                  'text-[9px] font-medium',
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
// Research Reveal Section
// ---------------------------------------------------------------------------

function ResearchRevealSection({ research }) {
  const { t } = useTheme();
  const [visibleSummary, setVisibleSummary] = useState('');

  // Typing effect for summary
  useEffect(() => {
    if (!research?.summary) return;
    setVisibleSummary('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleSummary(research.summary.slice(0, i));
      if (i >= research.summary.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [research?.summary]);

  if (!research) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border p-6 space-y-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}
    >
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-cyan-400" />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
          AI Research Assistant
        </span>
      </div>

      {/* Summary with typing */}
      <div className={cn('text-sm leading-relaxed', t('text-slate-600', 'text-zinc-400'))}>
        {visibleSummary}
        {visibleSummary.length < (research.summary?.length || 0) && (
          <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
        )}
      </div>

      {/* Value Propositions */}
      {research.valuePropositions?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
            <p className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
              Key Discoveries
            </p>
          </div>
          {research.valuePropositions.slice(0, 6).map((vp, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.12, duration: 0.3 }}
              className={cn(
                'flex items-start gap-2.5 text-sm pl-3 border-l-2 border-cyan-400/40',
                t('text-slate-600', 'text-zinc-300')
              )}
            >
              <span>{vp}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Target Audience */}
      {research.targetAudience && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center gap-2"
        >
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span className={cn(
            'text-xs px-2.5 py-1 rounded-lg font-medium',
            t('bg-cyan-50 text-cyan-700', 'bg-cyan-500/10 text-cyan-400')
          )}>
            {research.targetAudience}
          </span>
        </motion.div>
      )}

      {/* Key Features as pills */}
      {research.keyFeatures?.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-wrap gap-1.5"
        >
          {research.keyFeatures.map((feat, idx) => (
            <span
              key={idx}
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-md font-medium',
                t('bg-slate-100 text-slate-600', 'bg-white/[0.06] text-zinc-400')
              )}
            >
              {typeof feat === 'string' ? feat : feat.name || ''}
            </span>
          ))}
        </motion.div>
      )}

      {/* Sources */}
      {research.sources?.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="flex items-center gap-2"
        >
          <ExternalLink className={cn('w-3 h-3', t('text-slate-300', 'text-zinc-600'))} />
          {research.sources.map((src, idx) => (
            <span key={idx} className={cn('text-[10px]', t('text-slate-400', 'text-zinc-600'))}>
              {src.length > 60 ? src.substring(0, 60) + '...' : src}
            </span>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Copy Reveal Section
// ---------------------------------------------------------------------------

function CopyRevealSection({ copy }) {
  const { t } = useTheme();
  const [visibleTitle, setVisibleTitle] = useState('');

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
          &ldquo;{copy.shortTagline}&rdquo;
        </motion.p>
      )}

      {/* Description (HTML) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className={cn('text-sm leading-relaxed prose prose-sm max-w-none', t('text-slate-600 prose-slate', 'text-zinc-400 prose-invert'))}
      >
        <SafeHTML html={copy.description} />
      </motion.div>

      {/* Bullet points */}
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
              <SafeHTML as="span" html={typeof bullet === 'string' ? bullet : bullet.text || ''} />
            </motion.div>
          ))}
        </div>
      )}

      {/* SEO Keywords */}
      {copy.searchKeywords?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
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
                className={cn('text-xs px-2.5 py-1 rounded-lg font-medium', t('bg-cyan-50 text-cyan-700', 'bg-cyan-500/10 text-cyan-400'))}
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
            <p className={cn('text-xs font-semibold mb-1', t('text-cyan-700', 'text-cyan-400'))}>AI Reasoning</p>
            <p className={cn('text-xs leading-relaxed', t('text-cyan-600', 'text-cyan-400/80'))}>{copy.reasoning}</p>
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
      className={cn('rounded-2xl border overflow-hidden', t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5'))}
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
            <img src={heroImageUrl} alt="Hero product shot" className="w-full h-80 object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
          </motion.div>
        ) : isLoading ? (
          <div className={cn('w-full h-80 rounded-xl animate-pulse flex items-center justify-center', t('bg-slate-100', 'bg-white/[0.04]'))}>
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
      className={cn('rounded-2xl border p-5', t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5'))}
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
                <img src={img.url} alt={img.description || `Gallery ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] text-white/80 font-medium">{img.description}</p>
                </div>
              </motion.div>
            );
          }
          return (
            <div key={idx} className={cn('aspect-square rounded-xl overflow-hidden', isLoading ? 'animate-pulse' : '', t('bg-slate-100', 'bg-white/[0.04]'))}>
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
// Video Frames Section (NEW - 16:9 cinematic reference frames)
// ---------------------------------------------------------------------------

function VideoFramesSection({ videoFrames = [], videoFramesTotal = 2, isLoading }) {
  const { t } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('rounded-2xl border p-5', t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5'))}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-cyan-400" />
          <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
            Video Reference Frames
          </span>
        </div>
        <span className={cn('text-xs font-medium tabular-nums', t('text-slate-400', 'text-zinc-500'))}>
          {videoFrames.length} of {videoFramesTotal} ready
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: videoFramesTotal }).map((_, idx) => {
          const frame = videoFrames[idx];
          if (frame) {
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200, delay: idx * 0.1 }}
                className="relative aspect-video rounded-xl overflow-hidden shadow-md"
              >
                <img src={frame.url} alt={frame.description || `Frame ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
                  <p className="text-[11px] text-white/80 font-medium">{frame.description}</p>
                </div>
                {/* Film frame corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/40 rounded-tl" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/40 rounded-tr" />
                <div className="absolute bottom-8 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/40 rounded-bl" />
                <div className="absolute bottom-8 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/40 rounded-br" />
              </motion.div>
            );
          }
          return (
            <div key={idx} className={cn('aspect-video rounded-xl overflow-hidden', isLoading ? 'animate-pulse' : '', t('bg-slate-100', 'bg-white/[0.04]'))}>
              {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Clapperboard className={cn('w-6 h-6 animate-pulse', t('text-slate-300', 'text-zinc-600'))} />
                  <p className={cn('text-[10px]', t('text-slate-400', 'text-zinc-600'))}>Generating cinematic frame...</p>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className={cn('w-6 h-6', t('text-slate-200', 'text-zinc-700'))} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={cn('text-[10px] mt-2 text-center italic', t('text-slate-400', 'text-zinc-600'))}>
        Cinematic 16:9 reference frames optimized for video generation
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Video Section (Enhanced - with reference frame indicator and embedded player)
// ---------------------------------------------------------------------------

function VideoSection({ videoUrl, isLoading, videoFrames = [] }) {
  const { t } = useTheme();
  const referenceFrame = videoFrames[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('rounded-2xl border p-5', t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5'))}
    >
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-4 h-4 text-cyan-400" />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
          Product Video (Veo 3.1)
        </span>
      </div>

      {/* Reference frame indicator */}
      {referenceFrame && isLoading && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0">
            <img src={referenceFrame} alt="Reference frame" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
            <div className="absolute inset-0 ring-1 ring-inset ring-cyan-400/30 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}>
              Using reference frame for video generation
            </span>
          </div>
        </div>
      )}

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
            playsInline
          />
        </motion.div>
      ) : isLoading ? (
        <div className={cn('w-full h-48 rounded-xl flex flex-col items-center justify-center gap-3', t('bg-slate-50', 'bg-white/[0.02]'))}>
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
            Generating cinematic product video with Veo 3.1...
          </p>
          <p className={cn('text-[10px]', t('text-slate-400', 'text-zinc-600'))}>
            This can take up to 90 seconds
          </p>
        </div>
      ) : (
        <div className={cn('w-full h-32 rounded-xl flex items-center justify-center', t('bg-slate-50', 'bg-white/[0.02]'))}>
          <p className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>
            Video generation skipped — check Video Studio later
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Quality Score Ring
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
// Grand Finale (Enhanced with research stats + video frames + embedded video)
// ---------------------------------------------------------------------------

function GrandFinale({ progress, listing, product, onNavigateToPublish }) {
  const { t } = useTheme();
  const confettiFired = useRef(false);

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

  const score = useMemo(() => {
    let s = 0;
    if (progress?.research) s += 5;
    if (progress?.copy?.title) s += 15;
    if (progress?.copy?.description) s += 12;
    if ((progress?.copy?.bulletPoints?.length || 0) >= 3) s += 8;
    if (progress?.copy?.seoTitle) s += 5;
    if (progress?.copy?.seoDescription) s += 5;
    if (progress?.heroImageUrl) s += 15;
    const galleryCount = progress?.galleryImages?.length || 0;
    s += Math.min(galleryCount * 5, 20);
    const frameCount = progress?.videoFrames?.length || 0;
    s += Math.min(frameCount * 3, 5);
    if (progress?.videoUrl) s += 10;
    return Math.min(s, 100);
  }, [progress]);

  if (progress?.phase !== 'done') return null;

  const heroImage = progress?.heroImageUrl || listing?.hero_image_url;
  const galleryImages = progress?.galleryImages || [];
  const videoFrames = progress?.videoFrames || [];
  const title = progress?.copy?.title || listing?.listing_title || product?.name || '';
  const sourcesCount = progress?.research?.sources?.length || 0;
  const totalImages = (heroImage ? 1 : 0) + galleryImages.length + videoFrames.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={cn('rounded-2xl border overflow-hidden', t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5'))}
    >
      {/* Score Header */}
      <div className={cn('p-6 flex items-center gap-6 border-b', t('border-slate-100', 'border-white/5'))}>
        <QualityRingSmall score={score} />
        <div className="flex-1">
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
          {/* Generation stats */}
          <div className="flex items-center gap-3 mt-2">
            {sourcesCount > 0 && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', t('bg-cyan-50 text-cyan-600', 'bg-cyan-500/10 text-cyan-400'))}>
                {sourcesCount} source{sourcesCount > 1 ? 's' : ''} researched
              </span>
            )}
            <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', t('bg-blue-50 text-blue-600', 'bg-blue-500/10 text-blue-400'))}>
              {totalImages} image{totalImages !== 1 ? 's' : ''} generated
            </span>
            {progress?.videoUrl && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', t('bg-purple-50 text-purple-600', 'bg-purple-500/10 text-purple-400'))}>
                1 video created
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-6 space-y-4">
        {heroImage && (
          <img src={heroImage} alt={title} className={cn('w-full h-64 object-cover rounded-xl border', t('border-slate-200', 'border-white/10'))} onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
        )}

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {galleryImages.map((img, idx) => (
              <div key={idx} className={cn('aspect-square rounded-lg overflow-hidden border', t('border-slate-200', 'border-white/10'))}>
                <img src={img.url} alt={img.description} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        )}

        {/* Video frames row */}
        {videoFrames.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {videoFrames.map((frame, idx) => (
              <div key={idx} className={cn('aspect-video rounded-lg overflow-hidden border', t('border-slate-200', 'border-white/10'))}>
                <img src={frame.url} alt={frame.description} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        )}

        {/* Title + Description */}
        <div>
          <h3 className={cn('text-lg font-semibold', t('text-slate-900', 'text-white'))}>{title}</h3>
          {progress?.copy?.description && (
            <SafeHTML
              className={cn('text-sm leading-relaxed mt-2 line-clamp-3', t('text-slate-600', 'text-zinc-400'))}
              html={progress.copy.description}
            />
          )}
        </div>

        {/* Embedded video player */}
        {progress?.videoUrl && (
          <div className="relative rounded-xl overflow-hidden">
            <video src={progress.videoUrl} controls playsInline className="w-full rounded-xl" />
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

  const phaseOrder = ['research', 'copy', 'hero', 'gallery', 'videoframes', 'video', 'done'];

  const isPhaseActive = (phase) => progress.phase === phase;
  const isPhaseDone = (phase) => {
    return phaseOrder.indexOf(progress.phase) > phaseOrder.indexOf(phase);
  };

  return (
    <div className="space-y-4">
      {/* Always show progress bar */}
      <PhaseProgressBar progress={progress} />

      {/* Research section */}
      <AnimatePresence>
        {(progress.research) && (
          <ResearchRevealSection research={progress.research} />
        )}
      </AnimatePresence>

      {/* Copy section */}
      <AnimatePresence>
        {(progress.copy) && (
          <CopyRevealSection copy={progress.copy} />
        )}
      </AnimatePresence>

      {/* Hero image */}
      <AnimatePresence>
        {(isPhaseActive('hero') || isPhaseDone('hero')) && (
          <HeroImageSection
            heroImageUrl={progress.heroImageUrl}
            isLoading={isPhaseActive('hero') && !progress.heroImageUrl}
          />
        )}
      </AnimatePresence>

      {/* Gallery */}
      <AnimatePresence>
        {(isPhaseActive('gallery') || isPhaseDone('gallery')) && (
          <GallerySection
            galleryImages={progress.galleryImages || []}
            galleryTotal={progress.galleryTotal || 4}
            isLoading={isPhaseActive('gallery')}
          />
        )}
      </AnimatePresence>

      {/* Video Frames */}
      <AnimatePresence>
        {(isPhaseActive('videoframes') || isPhaseDone('videoframes')) && (
          <VideoFramesSection
            videoFrames={progress.videoFrames || []}
            videoFramesTotal={progress.videoFramesTotal || 2}
            isLoading={isPhaseActive('videoframes')}
          />
        )}
      </AnimatePresence>

      {/* Video */}
      <AnimatePresence>
        {(isPhaseActive('video') || isPhaseDone('video')) && (
          <VideoSection
            videoUrl={progress.videoUrl}
            isLoading={isPhaseActive('video') && !progress.videoUrl}
            videoFrames={progress.videoFrames || []}
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
