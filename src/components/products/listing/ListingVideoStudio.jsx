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

function PresetCard({ preset, isSelected, isGenerating, onSelect, onGenerate }) {
  const Icon = preset.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(preset.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'relative w-full text-left rounded-2xl border p-5 transition-all duration-200 overflow-hidden group',
        isSelected
          ? 'border-cyan-500/50 bg-cyan-500/[0.04] shadow-[0_0_20px_rgba(6,182,212,0.06)]'
          : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60'
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
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center border',
              isSelected
                ? 'bg-cyan-500/15 border-cyan-500/30'
                : 'bg-white/[0.04] border-white/[0.06]'
            )}
          >
            <Icon className={cn('w-5 h-5', isSelected ? 'text-cyan-400' : 'text-zinc-400')} />
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-mono',
              isSelected
                ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                : 'border-white/10 text-zinc-500 bg-white/[0.02]'
            )}
          >
            <Clock className="w-2.5 h-2.5 mr-1" />
            {preset.duration}s
          </Badge>
        </div>

        <h3 className={cn('text-sm font-semibold mb-1', isSelected ? 'text-white' : 'text-zinc-200')}>
          {preset.label}
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed mb-4">
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
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

function VideoPlayer({ videoUrl, thumbnail, onUseAsListing, onDownload, isPlaying, setIsPlaying }) {
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
        className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black group cursor-pointer"
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
              <div className="w-16 h-16 rounded-full bg-cyan-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Play className="w-7 h-7 text-white ml-1" />
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GenerationProgress({ statusMessage, elapsedSeconds }) {
  const progressPercent = useMemo(() => {
    return Math.min(95, (elapsedSeconds / 60) * 100);
  }, [elapsedSeconds]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
      <div className="aspect-video flex flex-col items-center justify-center gap-5 px-6">
        <FilmStripLoader />

        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium text-zinc-200">{statusMessage}</p>
          <p className="text-xs text-zinc-500">
            This may take 30-60 seconds
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-56 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <p className="text-[10px] text-zinc-600 font-mono tabular-nums">
          {elapsedSeconds}s elapsed
        </p>
      </div>
    </div>
  );
}

function HistoryCard({ video, onPreview, onUse, isActive }) {
  return (
    <motion.button
      type="button"
      onClick={() => onPreview(video)}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative rounded-xl border overflow-hidden text-left transition-all duration-200 group',
        isActive
          ? 'border-cyan-500/40 bg-cyan-500/[0.04]'
          : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/10'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-950">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-6 h-6 text-zinc-800" />
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
        <p className="text-xs text-zinc-400 line-clamp-1">
          {video.preset_label || video.prompt?.slice(0, 60) || 'Generated video'}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Video Studio</h3>
            <p className="text-xs text-zinc-500">
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
                : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 bg-zinc-900/60'
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
        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
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
            />
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div
        className={cn(
          'rounded-2xl border p-5 space-y-4',
          'border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <Label className="text-sm font-semibold text-zinc-200">Custom Prompt</Label>
          </div>
          <button
            type="button"
            onClick={handleEnhancePrompt}
            disabled={isEnhancing || !customPrompt.trim()}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isEnhancing || !customPrompt.trim()
                ? 'text-zinc-600 cursor-not-allowed'
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
            'min-h-[100px] bg-zinc-950/60 border-white/[0.06] text-zinc-200 text-sm',
            'placeholder:text-zinc-600 focus:border-cyan-500/40 focus:ring-cyan-500/20',
            'resize-none rounded-xl'
          )}
          maxLength={1000}
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
            {customPrompt.length}/1000
          </span>
          <button
            type="button"
            onClick={handleCustomGenerate}
            disabled={isGenerating || !customPrompt.trim()}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isGenerating || !customPrompt.trim()
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
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
            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
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
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current listing video indicator */}
      {listing?.video_url && !isGenerating && !activeVideo && (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Check className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-zinc-200">Current Listing Video</span>
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
