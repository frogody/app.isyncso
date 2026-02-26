import React, { useState, useCallback, useMemo, useRef } from 'react';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Sparkles,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Loader2,
  Star,
  Trash2,
  Check,
  ChevronUp,
  ChevronDown,
  Crown,
  ZoomIn,
  X,
  Copy,
  Layers,
  Monitor,
  Info,
  Camera,
  Sofa,
  UtensilsCrossed,
  Briefcase,
  TreePine,
  Dumbbell,
  Bath,
  Minimize2,
  Lightbulb,
  Grid3X3,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

// Helper: save a generated image to the library (generated_content table)
async function saveToLibrary(url, { supabaseClient, companyId, userId, productId, productName, label, prompt = '' }) {
  try {
    await supabaseClient.from('generated_content').insert({
      company_id: companyId,
      created_by: userId,
      content_type: 'image',
      status: 'completed',
      url,
      thumbnail_url: url,
      name: `${productName || 'Product'} - ${label}`,
      generation_config: {
        source: 'listing_image_studio',
        label,
        prompt: prompt?.substring?.(0, 500) || '',
        product_id: productId,
      },
      product_context: { product_id: productId },
      tags: ['product_listing', label.toLowerCase().replace(/\s+/g, '_')],
    });
  } catch (err) {
    console.warn('[ListingImageStudio:saveToLibrary] Failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCENE_PRESETS = [
  { id: 'kitchen',      label: 'Kitchen Counter',   icon: UtensilsCrossed, prompt: 'on a clean modern kitchen countertop with natural morning light streaming through the window, marble surface, lifestyle photography' },
  { id: 'office',       label: 'Office Desk',       icon: Briefcase,       prompt: 'on a minimalist office desk setup with a laptop and coffee cup nearby, warm ambient light, professional workspace photography' },
  { id: 'outdoor',      label: 'Outdoor Garden',    icon: TreePine,        prompt: 'in a lush green garden setting with natural sunlight filtering through leaves, outdoor lifestyle photography, bokeh background' },
  { id: 'studio',       label: 'Studio Setup',      icon: Camera,          prompt: 'in a professional photography studio with softbox lighting, clean gradient background, commercial product photography' },
  { id: 'living_room',  label: 'Living Room',       icon: Sofa,            prompt: 'on a modern living room coffee table, cozy interior with warm lighting, neutral tones, lifestyle home photography' },
  { id: 'bathroom',     label: 'Bathroom Shelf',    icon: Bath,            prompt: 'on a clean white bathroom shelf, spa-like atmosphere with soft towels and green plant accent, wellness photography' },
  { id: 'gym',          label: 'Gym / Fitness',     icon: Dumbbell,        prompt: 'in a modern gym or fitness studio environment, energetic atmosphere, clean equipment visible in background, sports photography' },
  { id: 'minimalist',   label: 'Minimalist White',  icon: Minimize2,       prompt: 'on a pure white surface with soft shadow, minimal clean aesthetic, high-key lighting, editorial product photography' },
];

const PLATFORM_SPECS = {
  shopify:  { width: 2048, height: 2048, label: 'Shopify',  note: 'Square format recommended' },
  bolcom:   { width: 2400, height: 2400, label: 'bol.com',  note: 'White background preferred' },
  generic:  { width: 1024, height: 1024, label: 'Generic',  note: 'Original resolution kept' },
};

// ---------------------------------------------------------------------------
// Shimmer loading placeholder
// ---------------------------------------------------------------------------

function ShimmerCard({ className }) {
  const { t } = useTheme();
  return (
    <div className={cn(
      'rounded-2xl overflow-hidden',
      t('bg-slate-100', 'bg-white/[0.03]'),
      className
    )}>
      <div className="relative aspect-square overflow-hidden">
        <div className={cn(
          'absolute inset-0 animate-pulse',
          t('bg-slate-200', 'bg-white/5')
        )} />
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
          style={{ animationDuration: '1.5s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
        />
      </div>
      <div className="p-3 space-y-2">
        <div className={cn('h-3 rounded-full w-2/3', t('bg-slate-200', 'bg-white/5'))} />
        <div className={cn('h-2 rounded-full w-1/3', t('bg-slate-100', 'bg-white/[0.03]'))} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image preview modal
// ---------------------------------------------------------------------------

function ImagePreviewModal({ image, onClose }) {
  const { t } = useTheme();
  if (!image) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          'relative max-w-4xl w-full rounded-2xl overflow-hidden border shadow-2xl',
          t('bg-white border-slate-200', 'bg-zinc-950 border-white/10')
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={cn(
            'absolute top-3 right-3 z-10 p-2 rounded-full transition-colors',
            t('bg-white/80 hover:bg-white text-slate-600', 'bg-black/50 hover:bg-black/70 text-white')
          )}
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={image}
          alt="Preview"
          className="w-full max-h-[80vh] object-contain"
         loading="lazy" decoding="async" />
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Single gallery image card
// ---------------------------------------------------------------------------

function GalleryImageCard({
  url,
  index,
  isHero,
  isFavorite,
  onSetHero,
  onToggleFavorite,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onPreview,
}) {
  const { t } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'group relative rounded-2xl overflow-hidden border transition-all duration-200',
        isHero
          ? 'ring-2 ring-cyan-400/60 border-cyan-500/30'
          : t('border-slate-200 hover:border-slate-300', 'border-white/5 hover:border-white/10')
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hero badge */}
      {isHero && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
          <Crown className="w-3 h-3" />
          Hero
        </div>
      )}

      {/* Favorite badge */}
      {isFavorite && !isHero && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-bold">
          <Star className="w-3 h-3 fill-current" />
        </div>
      )}

      {/* Image */}
      <div
        className="aspect-square cursor-pointer overflow-hidden"
        onClick={() => onPreview(url)}
      >
        <img
          src={url}
          alt={`Gallery image ${index + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Hover overlay with actions */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end justify-center p-3"
          >
            <div className="flex items-center gap-1.5">
              {!isHero && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSetHero(); }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-cyan-500/30 backdrop-blur-sm text-white transition-colors"
                  title="Set as hero"
                >
                  <Crown className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={cn(
                  'p-1.5 rounded-lg backdrop-blur-sm transition-colors',
                  isFavorite
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-white/10 hover:bg-amber-500/20 text-white'
                )}
                title="Toggle favorite"
              >
                <Star className={cn('w-3.5 h-3.5', isFavorite && 'fill-current')} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(url); }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors"
                title="Preview"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {canMoveUp && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}
              {canMoveDown && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 backdrop-blur-sm text-white transition-colors"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ListingImageStudio({ product, details, listing, onUpdate, channel }) {
  const { t } = useTheme();
  const { user } = useUser();

  // State
  const [heroPrompt, setHeroPrompt] = useState('');
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [generatedHero, setGeneratedHero] = useState(null);

  const [selectedScene, setSelectedScene] = useState(null);
  const [customScenePrompt, setCustomScenePrompt] = useState('');
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [lifestyleImages, setLifestyleImages] = useState([]);

  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchImages, setBatchImages] = useState([]);

  const [previewImage, setPreviewImage] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  // Derive gallery from listing + generated images
  const galleryUrls = useMemo(() => {
    return listing?.gallery_urls || [];
  }, [listing?.gallery_urls]);

  const heroImageUrl = useMemo(() => {
    return listing?.hero_image_url || product?.featured_image?.url || product?.featured_image || null;
  }, [listing?.hero_image_url, product?.featured_image]);

  // Collect all product reference images
  const productReferenceImages = useMemo(() => {
    const images = [];
    const featured = product?.featured_image?.url || product?.featured_image;
    if (featured) images.push(featured);
    if (product?.gallery && Array.isArray(product.gallery)) {
      product.gallery.forEach((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !images.includes(url)) images.push(url);
      });
    }
    if (product?.gallery_images && Array.isArray(product.gallery_images)) {
      product.gallery_images.forEach((url) => {
        if (url && !images.includes(url)) images.push(url);
      });
    }
    return images;
  }, [product]);

  // -----------------------------------------------------------------------
  // Image generation helper
  // -----------------------------------------------------------------------

  const generateImage = useCallback(async (prompt, useCase = 'product_scene') => {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt,
        product_name: product?.name,
        product_images: productReferenceImages,
        use_case: productReferenceImages.length > 0 ? useCase : 'marketing_creative',
        style: 'photorealistic',
        aspect_ratio: '1:1',
        width: 1024,
        height: 1024,
        company_id: user?.company_id,
        user_id: user?.id,
        reference_image_url: productReferenceImages[0] || null,
        is_physical_product: true,
        product_context: {
          name: product?.name,
          description: product?.description || product?.short_description,
          type: 'physical',
        },
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.details || data.error);
    if (!data?.url) throw new Error('No image URL returned');

    return data.url;
  }, [product, productReferenceImages, user]);

  // -----------------------------------------------------------------------
  // Hero Image Generation
  // -----------------------------------------------------------------------

  const handleGenerateHero = useCallback(async () => {
    setIsGeneratingHero(true);
    setGeneratedHero(null);
    try {
      const basePrompt = heroPrompt.trim() ||
        `Professional product photography of ${product?.name || 'the product'} on a clean white background, studio lighting, sharp detail, commercial e-commerce hero shot`;

      const url = await generateImage(basePrompt, 'product_variation');
      setGeneratedHero(url);
      toast.success('Hero image generated');
      saveToLibrary(url, { supabaseClient: supabase, companyId: user?.company_id, userId: user?.id, productId: product?.id, productName: product?.name, label: 'Hero Image', prompt: basePrompt });
    } catch (err) {
      console.error('[ListingImageStudio] Hero generation error:', err);
      toast.error(err.message || 'Failed to generate hero image');
    } finally {
      setIsGeneratingHero(false);
    }
  }, [heroPrompt, product?.name, generateImage]);

  const handleApplyHero = useCallback(async () => {
    if (!generatedHero) return;
    try {
      await onUpdate({ hero_image_url: generatedHero });
      toast.success('Hero image applied');
    } catch (err) {
      toast.error('Failed to save hero image');
    }
  }, [generatedHero, onUpdate]);

  // -----------------------------------------------------------------------
  // Lifestyle Scene Generation
  // -----------------------------------------------------------------------

  const handleGenerateScene = useCallback(async (preset) => {
    setSelectedScene(preset.id);
    setIsGeneratingScene(true);
    try {
      const prompt = `${product?.name || 'Product'} ${preset.prompt}`;
      const url = await generateImage(prompt, 'product_scene');
      setLifestyleImages((prev) => [{ url, scene: preset.label, createdAt: Date.now() }, ...prev]);
      toast.success(`${preset.label} scene generated`);
      saveToLibrary(url, { supabaseClient: supabase, companyId: user?.company_id, userId: user?.id, productId: product?.id, productName: product?.name, label: preset.label, prompt });
    } catch (err) {
      console.error('[ListingImageStudio] Scene generation error:', err);
      toast.error(err.message || 'Scene generation failed');
    } finally {
      setIsGeneratingScene(false);
      setSelectedScene(null);
    }
  }, [product?.name, generateImage]);

  const handleGenerateCustomScene = useCallback(async () => {
    if (!customScenePrompt.trim()) {
      toast.error('Enter a scene description');
      return;
    }
    setIsGeneratingScene(true);
    try {
      const prompt = `${product?.name || 'Product'} ${customScenePrompt.trim()}`;
      const url = await generateImage(prompt, 'product_scene');
      setLifestyleImages((prev) => [{ url, scene: 'Custom', createdAt: Date.now() }, ...prev]);
      setCustomScenePrompt('');
      toast.success('Custom scene generated');
      saveToLibrary(url, { supabaseClient: supabase, companyId: user?.company_id, userId: user?.id, productId: product?.id, productName: product?.name, label: 'Custom Scene', prompt });
    } catch (err) {
      console.error('[ListingImageStudio] Custom scene error:', err);
      toast.error(err.message || 'Scene generation failed');
    } finally {
      setIsGeneratingScene(false);
    }
  }, [customScenePrompt, product?.name, generateImage]);

  // -----------------------------------------------------------------------
  // Batch Generation
  // -----------------------------------------------------------------------

  const handleBatchGenerate = useCallback(async () => {
    setIsGeneratingBatch(true);
    setBatchProgress(0);
    setBatchImages([]);

    const prompts = [
      `${product?.name || 'Product'} on clean white background, studio lighting, hero product shot`,
      `${product?.name || 'Product'} in lifestyle setting, modern home interior, warm natural light`,
      `${product?.name || 'Product'} close-up detail shot, macro photography, texture and material detail visible`,
      `${product?.name || 'Product'} in flat-lay composition with complementary accessories, top-down view, styled photography`,
    ];

    const results = [];
    for (let i = 0; i < prompts.length; i++) {
      try {
        setBatchProgress(((i) / prompts.length) * 100);
        const url = await generateImage(prompts[i], i === 0 ? 'product_variation' : 'product_scene');
        results.push({ url, prompt: prompts[i], index: i });
        const labels = ['Hero Shot', 'Lifestyle Setting', 'Close-up Detail', 'Flat-lay Composition'];
        saveToLibrary(url, { supabaseClient: supabase, companyId: user?.company_id, userId: user?.id, productId: product?.id, productName: product?.name, label: labels[i] || `Batch ${i + 1}`, prompt: prompts[i] });
      } catch (err) {
        console.error(`[ListingImageStudio] Batch item ${i} failed:`, err);
        results.push({ url: null, prompt: prompts[i], index: i, error: err.message });
      }
    }

    setBatchProgress(100);
    setBatchImages(results.filter((r) => r.url));

    const successCount = results.filter((r) => r.url).length;
    if (successCount === prompts.length) {
      toast.success(`All ${prompts.length} variants generated`);
    } else if (successCount > 0) {
      toast.info(`${successCount}/${prompts.length} variants generated`);
    } else {
      toast.error('Batch generation failed');
    }

    setIsGeneratingBatch(false);
  }, [product?.name, generateImage]);

  // -----------------------------------------------------------------------
  // Gallery management
  // -----------------------------------------------------------------------

  const handleAddToGallery = useCallback(async (url) => {
    const currentUrls = listing?.gallery_urls || [];
    if (currentUrls.includes(url)) {
      toast.info('Image already in gallery');
      return;
    }
    try {
      await onUpdate({ gallery_urls: [...currentUrls, url] });
      toast.success('Added to gallery');
    } catch (err) {
      toast.error('Failed to add to gallery');
    }
  }, [listing?.gallery_urls, onUpdate]);

  const handleRemoveFromGallery = useCallback(async (index) => {
    const currentUrls = [...(listing?.gallery_urls || [])];
    currentUrls.splice(index, 1);
    try {
      await onUpdate({ gallery_urls: currentUrls });
      toast.success('Removed from gallery');
    } catch (err) {
      toast.error('Failed to remove');
    }
  }, [listing?.gallery_urls, onUpdate]);

  const handleMoveImage = useCallback(async (index, direction) => {
    const currentUrls = [...(listing?.gallery_urls || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentUrls.length) return;
    [currentUrls[index], currentUrls[targetIndex]] = [currentUrls[targetIndex], currentUrls[index]];
    try {
      await onUpdate({ gallery_urls: currentUrls });
    } catch (err) {
      toast.error('Failed to reorder');
    }
  }, [listing?.gallery_urls, onUpdate]);

  const handleSetGalleryHero = useCallback(async (url) => {
    try {
      await onUpdate({ hero_image_url: url });
      toast.success('Hero image updated');
    } catch (err) {
      toast.error('Failed to set hero');
    }
  }, [onUpdate]);

  const handleToggleFavorite = useCallback((url) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  const handleAddSelectedToGallery = useCallback(async () => {
    const selectedUrls = [...favorites];
    if (selectedUrls.length === 0) {
      toast.info('No images selected');
      return;
    }
    const currentUrls = listing?.gallery_urls || [];
    const newUrls = selectedUrls.filter((u) => !currentUrls.includes(u));
    if (newUrls.length === 0) {
      toast.info('Selected images already in gallery');
      return;
    }
    try {
      await onUpdate({ gallery_urls: [...currentUrls, ...newUrls] });
      setFavorites(new Set());
      toast.success(`${newUrls.length} image(s) added to gallery`);
    } catch (err) {
      toast.error('Failed to add images');
    }
  }, [favorites, listing?.gallery_urls, onUpdate]);

  const handleDownload = useCallback(async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product?.name || 'image'}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch {
      toast.error('Download failed');
    }
  }, [product?.name]);

  // -----------------------------------------------------------------------
  // Platform specs for current channel
  // -----------------------------------------------------------------------

  const platformSpec = PLATFORM_SPECS[channel] || PLATFORM_SPECS.generic;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">

      {/* ================= 1. HERO IMAGE GENERATOR ================= */}
      <section className={cn(
        'rounded-xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        {/* Section header */}
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          t('border-slate-100', 'border-white/5')
        )}>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-500" />
            <div>
              <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                Hero Image
              </h3>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                AI-enhanced product hero shot for your listing
              </p>
            </div>
          </div>
          {heroImageUrl && (
            <span className={cn(
              'text-[10px] font-medium px-2.5 py-1 rounded-full',
              t('bg-cyan-50 text-cyan-600', 'bg-cyan-500/10 text-cyan-400')
            )}>
              Current hero set
            </span>
          )}
        </div>

        <div className="p-4">
          {/* Before / After row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Original */}
            <div>
              <p className={cn('text-xs font-medium mb-2 uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
                Original
              </p>
              <div className={cn(
                'aspect-square rounded-xl overflow-hidden border',
                t('border-slate-200 bg-slate-50', 'border-white/5 bg-white/[0.02]')
              )}>
                {heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt="Current hero"
                    className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => setPreviewImage(heroImageUrl)}
                  loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <ImageIcon className={cn('w-12 h-12 mb-2', t('text-slate-300', 'text-zinc-700'))} />
                    <p className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>No hero image</p>
                  </div>
                )}
              </div>
            </div>

            {/* Generated */}
            <div>
              <p className={cn('text-xs font-medium mb-2 uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
                AI Generated
              </p>
              <div className={cn(
                'aspect-square rounded-xl overflow-hidden border relative',
                t('border-slate-200 bg-slate-50', 'border-white/5 bg-white/[0.02]')
              )}>
                {isGeneratingHero ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                      <Sparkles className="w-4 h-4 text-cyan-300 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                    <p className={cn('text-xs font-medium', t('text-slate-600', 'text-zinc-300'))}>
                      Generating hero image...
                    </p>
                    <p className={cn('text-[10px]', t('text-slate-400', 'text-zinc-600'))}>
                      This may take 10-30 seconds
                    </p>
                  </div>
                ) : generatedHero ? (
                  <>
                    <img
                      src={generatedHero}
                      alt="Generated hero"
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => setPreviewImage(generatedHero)}
                    loading="lazy" decoding="async" />
                    {/* Actions overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <button
                        onClick={handleApplyHero}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Apply as Hero
                      </button>
                      <button
                        onClick={() => handleDownload(generatedHero)}
                        className={cn(
                          'p-2 rounded-xl transition-colors',
                          t('bg-white/80 hover:bg-white text-slate-600', 'bg-black/50 hover:bg-black/70 text-white')
                        )}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAddToGallery(generatedHero)}
                        className={cn(
                          'p-2 rounded-xl transition-colors',
                          t('bg-white/80 hover:bg-white text-slate-600', 'bg-black/50 hover:bg-black/70 text-white')
                        )}
                        title="Add to gallery"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Wand2 className={cn('w-12 h-12 mb-2', t('text-slate-300', 'text-zinc-700'))} />
                    <p className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>Generate a hero image below</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prompt + generate */}
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                placeholder={`Describe the perfect hero image for ${product?.name || 'your product'}... (Leave empty for auto-generated prompt)`}
                rows={2}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30',
                  t(
                    'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
                    'bg-white/[0.03] border-white/5 text-white placeholder:text-zinc-600'
                  )
                )}
              />
            </div>
            <button
              onClick={handleGenerateHero}
              disabled={isGeneratingHero}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all self-end',
                'bg-cyan-500 hover:bg-cyan-400 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGeneratingHero ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate
              <CreditCostBadge credits={12} />
            </button>
          </div>
        </div>
      </section>

      {/* ================= 2. LIFESTYLE SCENE GENERATOR ================= */}
      <section className={cn(
        'rounded-xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          t('border-slate-100', 'border-white/5')
        )}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <div>
              <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                Lifestyle Scenes
              </h3>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Place your product in real-world environments
              </p>
            </div>
          </div>
          {lifestyleImages.length > 0 && (
            <span className={cn(
              'text-[10px] font-medium px-2.5 py-1 rounded-full',
              t('bg-blue-50 text-blue-600', 'bg-blue-500/10 text-blue-400')
            )}>
              {lifestyleImages.length} generated
            </span>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Scene preset buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCENE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isActive = selectedScene === preset.id && isGeneratingScene;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleGenerateScene(preset)}
                  disabled={isGeneratingScene}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left text-sm transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isActive
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : cn(
                          t(
                            'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                            'bg-white/[0.02] border-white/5 text-zinc-300 hover:border-white/10 hover:bg-white/[0.04]'
                          )
                        )
                  )}
                >
                  {isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                  ) : (
                    <Icon className={cn('w-4 h-4 flex-shrink-0', t('text-slate-400', 'text-zinc-500'))} />
                  )}
                  <span className="font-medium text-xs">{preset.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom prompt */}
          <div className="flex gap-3">
            <input
              type="text"
              value={customScenePrompt}
              onChange={(e) => setCustomScenePrompt(e.target.value)}
              placeholder="Or describe a custom scene..."
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                t(
                  'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
                  'bg-white/[0.03] border-white/5 text-white placeholder:text-zinc-600'
                )
              )}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomScene()}
            />
            <button
              onClick={handleGenerateCustomScene}
              disabled={isGeneratingScene || !customScenePrompt.trim()}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all',
                'bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGeneratingScene && !selectedScene ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              Generate
            </button>
          </div>

          {/* Generated lifestyle images grid */}
          {lifestyleImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
                  Generated Scenes
                </p>
                {favorites.size > 0 && (
                  <button
                    onClick={handleAddSelectedToGallery}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Add {favorites.size} to Gallery
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {lifestyleImages.map((img, i) => (
                    <motion.div
                      key={img.url}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200',
                        favorites.has(img.url)
                          ? 'ring-2 ring-amber-400/50 border-amber-500/30'
                          : t('border-slate-200 hover:border-slate-300', 'border-white/5 hover:border-white/10')
                      )}
                    >
                      <div
                        className="aspect-square overflow-hidden"
                        onClick={() => setPreviewImage(img.url)}
                      >
                        <img
                          src={img.url}
                          alt={img.scene}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      {/* Scene label */}
                      <div className={cn(
                        'px-3 py-2 flex items-center justify-between',
                        t('bg-white', 'bg-zinc-900/80')
                      )}>
                        <span className={cn('text-[11px] font-medium', t('text-slate-600', 'text-zinc-400'))}>
                          {img.scene}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(img.url); }}
                            className={cn(
                              'p-1 rounded-md transition-colors',
                              favorites.has(img.url)
                                ? 'text-amber-400'
                                : t('text-slate-400 hover:text-slate-600', 'text-zinc-600 hover:text-zinc-300')
                            )}
                          >
                            <Star className={cn('w-3.5 h-3.5', favorites.has(img.url) && 'fill-current')} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToGallery(img.url); }}
                            className={cn(
                              'p-1 rounded-md transition-colors',
                              t('text-slate-400 hover:text-cyan-500', 'text-zinc-600 hover:text-cyan-400')
                            )}
                            title="Add to gallery"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(img.url); }}
                            className={cn(
                              'p-1 rounded-md transition-colors',
                              t('text-slate-400 hover:text-slate-600', 'text-zinc-600 hover:text-zinc-300')
                            )}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= 3. BATCH GENERATE ================= */}
      <section className={cn(
        'rounded-xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          t('border-slate-100', 'border-white/5')
        )}>
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-violet-500" />
            <div>
              <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                Batch Generate
              </h3>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Create 4 unique variants at once -- hero, lifestyle, detail, and flat-lay
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <button
            onClick={handleBatchGenerate}
            disabled={isGeneratingBatch}
            className={cn(
              'flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
              'bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isGeneratingBatch ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating {Math.round(batchProgress)}%...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate 4 Variants
              </>
            )}
          </button>

          {/* Progress bar */}
          {isGeneratingBatch && (
            <div className={cn(
              'w-full h-2 rounded-full overflow-hidden',
              t('bg-slate-100', 'bg-white/5')
            )}>
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${batchProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {/* Loading placeholders */}
          {isGeneratingBatch && batchImages.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <ShimmerCard key={i} />
              ))}
            </div>
          )}

          {/* Batch results */}
          {batchImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
                  Variants
                </p>
                {favorites.size > 0 && (
                  <button
                    onClick={handleAddSelectedToGallery}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Add {favorites.size} to Gallery
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {batchImages.map((img) => (
                    <motion.div
                      key={img.url}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200',
                        favorites.has(img.url)
                          ? 'ring-2 ring-amber-400/50 border-amber-500/30'
                          : t('border-slate-200 hover:border-slate-300', 'border-white/5 hover:border-white/10')
                      )}
                    >
                      <div
                        className="aspect-square overflow-hidden"
                        onClick={() => setPreviewImage(img.url)}
                      >
                        <img
                          src={img.url}
                          alt={`Variant ${img.index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className={cn(
                        'px-3 py-2 flex items-center justify-between',
                        t('bg-white', 'bg-zinc-900/80')
                      )}>
                        <span className={cn('text-[11px] font-medium', t('text-slate-600', 'text-zinc-400'))}>
                          Variant {img.index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(img.url); }}
                            className={cn(
                              'p-1 rounded-md transition-colors',
                              favorites.has(img.url)
                                ? 'text-amber-400'
                                : t('text-slate-400 hover:text-slate-600', 'text-zinc-600 hover:text-zinc-300')
                            )}
                          >
                            <Star className={cn('w-3.5 h-3.5', favorites.has(img.url) && 'fill-current')} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToGallery(img.url); }}
                            className={cn(
                              'p-1 rounded-md transition-colors',
                              t('text-slate-400 hover:text-cyan-500', 'text-zinc-600 hover:text-cyan-400')
                            )}
                            title="Add to gallery"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(img.url); }}
                            className={cn(
                              'p-1 rounded-md transition-colors',
                              t('text-slate-400 hover:text-slate-600', 'text-zinc-600 hover:text-zinc-300')
                            )}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= 4. GALLERY MANAGER ================= */}
      <section className={cn(
        'rounded-xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          t('border-slate-100', 'border-white/5')
        )}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <div>
              <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                Gallery Manager
              </h3>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Organize and reorder your listing images
              </p>
            </div>
          </div>
          <span className={cn(
            'text-[10px] font-medium px-2.5 py-1 rounded-full',
            t('bg-slate-100 text-slate-500', 'bg-white/5 text-zinc-500')
          )}>
            {galleryUrls.length} image{galleryUrls.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-4">
          {galleryUrls.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <AnimatePresence mode="popLayout">
                {galleryUrls.map((url, index) => (
                  <GalleryImageCard
                    key={`${url}-${index}`}
                    url={url}
                    index={index}
                    isHero={url === heroImageUrl}
                    isFavorite={favorites.has(url)}
                    onSetHero={() => handleSetGalleryHero(url)}
                    onToggleFavorite={() => handleToggleFavorite(url)}
                    onDelete={() => handleRemoveFromGallery(index)}
                    onMoveUp={() => handleMoveImage(index, -1)}
                    onMoveDown={() => handleMoveImage(index, 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < galleryUrls.length - 1}
                    onPreview={setPreviewImage}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className={cn(
              'flex flex-col items-center justify-center py-8 rounded-xl border border-dashed',
              t('border-slate-200', 'border-white/5')
            )}>
              <ImageIcon className={cn('w-10 h-10 mb-3', t('text-slate-300', 'text-zinc-700'))} />
              <p className={cn('text-sm font-medium', t('text-slate-500', 'text-zinc-400'))}>
                No gallery images yet
              </p>
              <p className={cn('text-xs mt-1', t('text-slate-400', 'text-zinc-600'))}>
                Generate images above, then add them to the gallery
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================= 5. PLATFORM EXPORT INFO ================= */}
      <section className={cn(
        'rounded-xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className={cn(
          'px-4 py-3 border-b',
          t('border-slate-100', 'border-white/5')
        )}>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
                Platform Export Info
              </h3>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Target dimensions per sales channel
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(PLATFORM_SPECS).map(([key, spec]) => {
              const isActive = channel === key;
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-lg border p-3 transition-all duration-200',
                    isActive
                      ? cn(
                          'ring-1',
                          t('bg-cyan-50/50 border-cyan-200 ring-cyan-200', 'bg-cyan-500/5 border-cyan-500/20 ring-cyan-500/20')
                        )
                      : t('border-slate-200 bg-slate-50/50', 'border-white/5 bg-white/[0.02]')
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'text-xs font-semibold uppercase tracking-wider',
                      isActive
                        ? 'text-cyan-500'
                        : t('text-slate-500', 'text-zinc-500')
                    )}>
                      {spec.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className={cn('text-lg font-bold', t('text-slate-900', 'text-white'))}>
                    {spec.width} x {spec.height}
                    <span className={cn('text-xs font-normal ml-1', t('text-slate-400', 'text-zinc-600'))}>px</span>
                  </p>
                  <p className={cn('text-[11px] mt-1', t('text-slate-400', 'text-zinc-600'))}>
                    {spec.note}
                  </p>
                </div>
              );
            })}
          </div>

          <div className={cn(
            'flex items-center gap-2 mt-3 px-3 py-2 rounded-lg',
            t('bg-slate-50 border border-slate-100', 'bg-white/[0.02] border border-white/5')
          )}>
            <Info className={cn('w-4 h-4 flex-shrink-0', t('text-slate-400', 'text-zinc-500'))} />
            <p className={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}>
              All images will be auto-resized to the target platform dimensions on publish. Original resolution files are preserved.
            </p>
          </div>
        </div>
      </section>

      {/* ================= IMAGE PREVIEW MODAL ================= */}
      <AnimatePresence>
        {previewImage && (
          <ImagePreviewModal
            image={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </AnimatePresence>

      {/* Shimmer animation keyframes via inline style */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
