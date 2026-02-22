import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Sparkles,
  Download,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Clock,
  Film,
  Wand2,
  RotateCcw,
  Check,
  X,
  Eye,
  Package,
  Lightbulb,
  Camera,
  Box,
  Clapperboard,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIDEO_PRESETS = [
  {
    id: 'spotlight',
    label: 'Product Spotlight',
    description: 'A cinematic 360-degree showcase of your product with dramatic lighting',
    icon: Camera,
    duration: 5,
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    prompt: 'A cinematic 360-degree rotating product showcase with dramatic studio lighting, dark background, smooth camera movement, professional commercial style.',
  },
  {
    id: 'walkthrough',
    label: 'Feature Walkthrough',
    description: 'Highlight key features one by one with text overlays',
    icon: Lightbulb,
    duration: 8,
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    prompt: 'A professional product feature walkthrough video highlighting key features one by one, clean modern style, smooth transitions between features, informative and engaging.',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle Demo',
    description: 'Show the product in use in a real-world setting',
    icon: Eye,
    duration: 8,
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    prompt: 'A lifestyle product demonstration video showing the product being used naturally in a real-world setting, warm natural lighting, authentic feel, aspirational lifestyle context.',
  },
  {
    id: 'unboxing',
    label: 'Unboxing Experience',
    description: 'A satisfying unboxing reveal of the product',
    icon: Box,
    duration: 10,
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    prompt: 'A satisfying product unboxing reveal video, premium packaging being opened, dramatic reveal moment, close-up details, ASMR-style smooth movements, excitement and anticipation.',
  },
];

const GENERATION_MESSAGES = [
  'Preparing scene...',
  'Composing shots...',
  'Rendering frames...',
  'Adding motion...',
  'Applying effects...',
  'Finalizing video...',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilmStripLoader() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-8 rounded-sm bg-cyan-500/60"
          animate={{
            scaleY: [0.4, 1, 0.4],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            delay: i * 0.15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function PresetCard({ preset, isSelected, isGenerating, onSelect, onGenerate, t }) {
  const Icon = preset.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(preset.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'relative w-full text-left rounded-xl border p-3 transition-all duration-200 overflow-hidden group',
        isSelected
          ? cn('border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.06)]', t('bg-cyan-50/60', 'bg-cyan-500/[0.04]'))
          : cn('hover:border-opacity-100', t('border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50', 'border-white/[0.06] bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60'))
      )}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-300',
          preset.gradient,
          isSelected ? 'opacity-60' : 'group-hover:opacity-50'
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-4 h-4', isSelected ? 'text-cyan-400' : t('text-slate-400', 'text-zinc-400'))} />
            <h3 className={cn('text-sm font-semibold', isSelected ? t('text-slate-900', 'text-white') : t('text-slate-700', 'text-zinc-200'))}>
              {preset.label}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-mono',
              isSelected
                ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                : cn(t('border-slate-200 text-slate-500 bg-slate-50', 'border-white/10 text-zinc-500 bg-white/[0.02]'))
            )}
          >
            <Clock className="w-2.5 h-2.5 mr-1" />
            {preset.duration}s
          </Badge>
        </div>

        <p className={cn('text-xs leading-relaxed mb-3', t('text-slate-500', 'text-zinc-500'))}>
          {preset.description}
        </p>

        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate(preset);
              }}
              disabled={isGenerating}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isGenerating
                  ? cn(t('bg-slate-100 text-slate-400', 'bg-zinc-800 text-zinc-500'), 'cursor-not-allowed')
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                  <CreditCostBadge credits={50} />
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

function VideoPlayer({ videoUrl, thumbnail, onUseAsListing, onDownload, isPlaying, setIsPlaying, t }) {
  const videoRef = useRef(null);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [setIsPlaying]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  return (
    <div className="space-y-3">
      {/* Player container */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden border bg-black group cursor-pointer',
          t('border-slate-200', 'border-white/[0.06]')
        )}
        onClick={togglePlayPause}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnail}
          className="w-full aspect-video object-contain"
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        />

        {/* Play/Pause overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUseAsListing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shadow-lg shadow-cyan-500/15"
        >
          <Save className="w-4 h-4" />
          Use as Listing Video
        </button>
        <button
          type="button"
          onClick={onDownload}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
            t('border-slate-200 bg-white hover:bg-slate-50 text-slate-600', 'border-white/10 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300')
          )}
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GenerationProgress({ statusMessage, elapsedSeconds, t }) {
  const progressPercent = useMemo(() => {
    return Math.min(95, (elapsedSeconds / 60) * 100);
  }, [elapsedSeconds]);

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      t('border-slate-200 bg-white', 'border-white/[0.06] bg-zinc-900/50')
    )}>
      <div className="aspect-video flex flex-col items-center justify-center gap-4 px-6">
        <FilmStripLoader />

        <div className="text-center space-y-1.5">
          <p className={cn('text-sm font-medium', t('text-slate-700', 'text-zinc-200'))}>{statusMessage}</p>
          <p className={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}>
            This may take 30-60 seconds
          </p>
        </div>

        {/* Progress bar */}
        <div className={cn('w-56 h-1.5 rounded-full overflow-hidden', t('bg-slate-200', 'bg-zinc-800'))}>
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <p className={cn('text-[10px] font-mono tabular-nums', t('text-slate-400', 'text-zinc-600'))}>
          {elapsedSeconds}s elapsed
        </p>
      </div>
    </div>
  );
}

function HistoryCard({ video, onPreview, onUse, isActive, t }) {
  return (
    <motion.button
      type="button"
      onClick={() => onPreview(video)}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative rounded-xl border overflow-hidden text-left transition-all duration-200 group',
        isActive
          ? cn('border-cyan-500/40', t('bg-cyan-50/60', 'bg-cyan-500/[0.04]'))
          : cn(t('border-slate-200 bg-white hover:border-slate-300', 'border-white/[0.06] bg-zinc-900/40 hover:border-white/10'))
      )}
    >
      {/* Thumbnail */}
      <div className={cn('relative aspect-video', t('bg-slate-100', 'bg-zinc-950'))}>
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className={cn('w-6 h-6', t('text-slate-300', 'text-zinc-800'))} />
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white border border-white/10">
            {video.duration || '5'}s
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className={cn('text-xs line-clamp-1', t('text-slate-500', 'text-zinc-400'))}>
          {video.preset_label || video.prompt?.slice(0, 60) || 'Generated video'}
        </p>
        <p className={cn('text-[10px] mt-1', t('text-slate-400', 'text-zinc-600'))}>
          {video.created_at
            ? new Date(video.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Recently'}
        </p>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ListingVideoStudio({ product, details, listing, onUpdate, channel }) {
  const { t } = useTheme();

  // State
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState(GENERATION_MESSAGES[0]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [videoHistory, setVideoHistory] = useState([]);
  const [previewingHistoryVideo, setPreviewingHistoryVideo] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const statusIntervalRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  // Pre-fill custom prompt with product context
  useEffect(() => {
    if (product && !customPrompt) {
      const ctx = [
        product.name && `Product: ${product.name}`,
        product.description && product.description.slice(0, 120),
      ]
        .filter(Boolean)
        .join('. ');
      setCustomPrompt(ctx ? `${ctx}.` : '');
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load video history for this product
  const loadVideoHistory = useCallback(async () => {
    if (!product?.id) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('product_listing_videos')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        // Table may not exist yet -- silently ignore
        console.warn('[ListingVideoStudio] Could not load history:', fetchError.message);
        return;
      }
      setVideoHistory(data || []);
    } catch {
      // non-critical
    }
  }, [product?.id]);

  useEffect(() => {
    loadVideoHistory();
  }, [loadVideoHistory]);

  // Cycle through status messages during generation
  const startStatusCycle = useCallback(() => {
    let idx = 0;
    setStatusMessage(GENERATION_MESSAGES[0]);
    setElapsedSeconds(0);

    statusIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % GENERATION_MESSAGES.length;
      setStatusMessage(GENERATION_MESSAGES[idx]);
    }, 6000);

    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopStatusCycle = useCallback(() => {
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStatusCycle();
  }, [stopStatusCycle]);

  // ---------------------------------------------------------------------------
  // Generation logic
  // ---------------------------------------------------------------------------

  const buildPrompt = useCallback(
    (preset) => {
      const parts = [];
      if (preset) {
        parts.push(preset.prompt);
      }
      if (product?.name) {
        parts.push(`Product: ${product.name}.`);
      }
      if (product?.description) {
        parts.push(product.description.slice(0, 200));
      }
      if (details?.material) {
        parts.push(`Material: ${details.material}.`);
      }
      if (details?.color) {
        parts.push(`Color: ${details.color}.`);
      }
      return parts.join(' ');
    },
    [product, details]
  );

  const generateVideo = useCallback(
    async (prompt, duration, presetLabel) => {
      setIsGenerating(true);
      setGeneratedVideo(null);
      setPreviewingHistoryVideo(null);
      setError(null);
      startStatusCycle();

      try {
        const imageUrl =
          product?.featured_image?.url ||
          product?.featured_image ||
          listing?.hero_image_url ||
          null;

        const { data, error: fnError } = await supabase.functions.invoke('generate-video', {
          body: {
            prompt,
            image_url: imageUrl,
            duration: duration || 5,
          },
        });

        if (fnError) throw fnError;

        if (!data?.videoUrl && !data?.url) {
          throw new Error('No video URL returned from generation');
        }

        const videoUrl = data.videoUrl || data.url;
        const thumbnailUrl = data.thumbnail_url || data.thumbnailUrl || null;

        const videoRecord = {
          url: videoUrl,
          thumbnail_url: thumbnailUrl,
          prompt,
          preset_label: presetLabel || 'Custom',
          duration: duration || 5,
          created_at: new Date().toISOString(),
        };

        setGeneratedVideo(videoRecord);

        // Persist to history table (best-effort)
        try {
          await supabase.from('product_listing_videos').insert({
            product_id: product.id,
            company_id: listing?.company_id,
            channel: channel || 'generic',
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            prompt,
            preset_label: presetLabel || 'Custom',
            duration: duration || 5,
          });
          loadVideoHistory();
        } catch {
          // non-critical
        }

        toast.success('Video generated successfully');
      } catch (err) {
        console.error('[ListingVideoStudio] generation error:', err);
        setError(err.message || 'Video generation failed. Please try again.');
        toast.error(err.message || 'Failed to generate video');
      } finally {
        setIsGenerating(false);
        stopStatusCycle();
      }
    },
    [product, listing, channel, startStatusCycle, stopStatusCycle, loadVideoHistory]
  );

  const handlePresetGenerate = useCallback(
    (preset) => {
      const prompt = buildPrompt(preset);
      generateVideo(prompt, preset.duration, preset.label);
    },
    [buildPrompt, generateVideo]
  );

  const handleCustomGenerate = useCallback(() => {
    if (!customPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    generateVideo(customPrompt, 5, null);
  }, [customPrompt, generateVideo]);

  const handleEnhancePrompt = useCallback(async () => {
    if (!customPrompt.trim()) {
      toast.error('Enter a prompt first');
      return;
    }
    setIsEnhancing(true);
    try {
      const { data, error: enhanceError } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: customPrompt,
          use_case: 'product_video',
          style: 'cinematic',
          product_name: product?.name,
          product_type: product?.type,
          product_description: product?.description || product?.short_description,
          product_tags: product?.tags,
          product_category: product?.category,
        },
      });

      if (enhanceError) throw enhanceError;

      if (data?.enhanced_prompt) {
        setCustomPrompt(data.enhanced_prompt);
        toast.success('Prompt enhanced');
      } else {
        toast.info('Could not enhance prompt');
      }
    } catch (err) {
      console.error('[ListingVideoStudio] enhance error:', err);
      toast.error('Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  }, [customPrompt, product]);

  // ---------------------------------------------------------------------------
  // Listing save
  // ---------------------------------------------------------------------------

  const handleUseAsListingVideo = useCallback(
    async (videoUrl) => {
      if (!onUpdate) return;
      try {
        await onUpdate({ video_url: videoUrl });
        toast.success('Video saved to listing');
      } catch {
        toast.error('Failed to save video to listing');
      }
    },
    [onUpdate]
  );

  // ---------------------------------------------------------------------------
  // Download
  // ---------------------------------------------------------------------------

  const handleDownload = useCallback(async (videoUrl) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listing-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Video downloaded');
    } catch {
      toast.error('Download failed');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // History preview
  // ---------------------------------------------------------------------------

  const handlePreviewHistoryVideo = useCallback((video) => {
    setPreviewingHistoryVideo(video);
    setGeneratedVideo(null);
    setIsPlaying(false);
  }, []);

  // Decide which video to show in player
  const activeVideo = previewingHistoryVideo || generatedVideo;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-3', t('', ''))}>
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className={cn('text-base font-semibold', t('text-slate-900', 'text-zinc-100'))}>Video Studio</h3>
            <p className={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}>
              AI-powered video generation for your listing
            </p>
          </div>
        </div>

        {videoHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
              showHistory
                ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                : cn(t('border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-white', 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 bg-zinc-900/50'))
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            History ({videoHistory.length})
            {showHistory ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Video preview/player -- shown when a video is active */}
      <AnimatePresence mode="wait">
        {(activeVideo || isGenerating) && (
          <motion.div
            key={isGenerating ? 'generating' : activeVideo?.url || 'player'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {isGenerating ? (
              <GenerationProgress
                statusMessage={statusMessage}
                elapsedSeconds={elapsedSeconds}
                t={t}
              />
            ) : activeVideo ? (
              <VideoPlayer
                videoUrl={activeVideo.url || activeVideo.video_url}
                thumbnail={activeVideo.thumbnail_url}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                onUseAsListing={() =>
                  handleUseAsListingVideo(activeVideo.url || activeVideo.video_url)
                }
                onDownload={() =>
                  handleDownload(activeVideo.url || activeVideo.video_url)
                }
                t={t}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {error && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (selectedPreset) {
                  const preset = VIDEO_PRESETS.find((p) => p.id === selectedPreset);
                  if (preset) handlePresetGenerate(preset);
                } else if (customPrompt.trim()) {
                  handleCustomGenerate();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Presets */}
      <div className="space-y-3">
        <Label className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
          Video Templates
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VIDEO_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={selectedPreset === preset.id}
              isGenerating={isGenerating}
              onSelect={setSelectedPreset}
              onGenerate={handlePresetGenerate}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div
        className={cn(
          'rounded-xl border p-4 space-y-4',
          t('border-slate-200 bg-white', 'border-white/[0.06] bg-zinc-900/40')
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <Label className={cn('text-sm font-semibold', t('text-slate-700', 'text-zinc-200'))}>Custom Prompt</Label>
          </div>
          <button
            type="button"
            onClick={handleEnhancePrompt}
            disabled={isEnhancing || !customPrompt.trim()}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isEnhancing || !customPrompt.trim()
                ? cn(t('text-slate-400', 'text-zinc-600'), 'cursor-not-allowed')
                : 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20'
            )}
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Enhance with AI
              </>
            )}
          </button>
        </div>

        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Describe the video you want to create for this product..."
          className={cn(
            'min-h-[100px] text-sm resize-none rounded-xl',
            t(
              'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500/40 focus:ring-cyan-500/20',
              'bg-zinc-950/60 border-white/[0.06] text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:ring-cyan-500/20'
            )
          )}
          maxLength={1000}
        />

        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-mono tabular-nums', t('text-slate-400', 'text-zinc-600'))}>
            {customPrompt.length}/1000
          </span>
          <button
            type="button"
            onClick={handleCustomGenerate}
            disabled={isGenerating || !customPrompt.trim()}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isGenerating || !customPrompt.trim()
                ? cn(t('bg-slate-100 text-slate-400', 'bg-zinc-800 text-zinc-600'), 'cursor-not-allowed')
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/15'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Generate Video
                <CreditCostBadge credits={50} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video History */}
      <AnimatePresence>
        {showHistory && videoHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3 overflow-hidden"
          >
            <Label className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
              Previously Generated
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {videoHistory.map((video) => (
                <HistoryCard
                  key={video.id}
                  video={video}
                  isActive={previewingHistoryVideo?.id === video.id}
                  onPreview={handlePreviewHistoryVideo}
                  onUse={() =>
                    handleUseAsListingVideo(video.video_url || video.url)
                  }
                  t={t}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current listing video indicator */}
      {listing?.video_url && !isGenerating && !activeVideo && (
        <div className={cn(
          'rounded-xl border p-4',
          t('border-slate-200 bg-white', 'border-white/[0.06] bg-zinc-900/40')
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 text-cyan-400" />
            <span className={cn('text-sm font-medium', t('text-slate-700', 'text-zinc-200'))}>Current Listing Video</span>
          </div>
          <video
            src={listing.video_url}
            controls
            className="w-full rounded-xl aspect-video object-contain bg-black"
            playsInline
          />
        </div>
      )}
    </div>
  );
}
