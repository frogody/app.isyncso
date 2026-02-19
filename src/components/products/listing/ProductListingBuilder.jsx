import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  PenTool,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
  RefreshCw,
  Store,
  Globe,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

import ListingOverview from './ListingOverview';
import ListingImageStudio from './ListingImageStudio';
import ListingVideoStudio from './ListingVideoStudio';
import ListingPublish from './ListingPublish';
import ListingCopywriter from './ListingCopywriter';

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'copywriter', label: 'AI Copywriter', icon: PenTool },
  { id: 'images', label: 'Image Studio', icon: ImageIcon },
  { id: 'video', label: 'Video Studio', icon: Video },
  { id: 'publish', label: 'Publish', icon: Send },
];

const CHANNELS = [
  { id: 'generic', label: 'All Channels', icon: Globe },
  { id: 'shopify', label: 'Shopify', icon: ShoppingBag },
  { id: 'bolcom', label: 'bol.com', icon: Store },
];

export default function ProductListingBuilder({ product, details, onDetailsUpdate }) {
  const { t } = useTheme();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChannel, setSelectedChannel] = useState('generic');
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(null); // { step, progress, stepLabel }

  // Fetch existing listing from DB when product or channel changes
  const fetchListing = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_listings')
        .select('*')
        .eq('product_id', product.id)
        .eq('channel', selectedChannel)
        .maybeSingle();

      if (error) throw error;
      setListing(data || null);
    } catch (err) {
      console.error('[ProductListingBuilder] fetchListing error:', err);
      toast.error('Failed to load listing data');
    } finally {
      setLoading(false);
    }
  }, [product?.id, selectedChannel]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Upsert listing data back to DB (silent version for orchestration)
  const saveListingSilent = useCallback(async (updates) => {
    if (!product?.id || !user?.company_id) return null;

    try {
      const payload = {
        ...listing,
        ...updates,
        product_id: product.id,
        company_id: user.company_id,
        channel: selectedChannel,
        updated_at: new Date().toISOString(),
      };

      if (!payload.id) delete payload.id;

      const { data, error } = await supabase
        .from('product_listings')
        .upsert(payload, { onConflict: 'product_id,channel' })
        .select()
        .single();

      if (error) throw error;
      setListing(data);
      return data;
    } catch (err) {
      console.error('[ProductListingBuilder] saveListing error:', err);
      throw err;
    }
  }, [listing, product?.id, user?.company_id, selectedChannel]);

  // Upsert listing data back to DB (with toast feedback)
  const saveListing = useCallback(async (updates) => {
    try {
      const data = await saveListingSilent(updates);
      toast.success('Listing saved');
      return data;
    } catch (err) {
      toast.error('Failed to save listing');
      throw err;
    }
  }, [saveListingSilent]);

  // Collect product reference images
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

  // Generate a single image
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

  // Generate all listing content via AI - the main orchestrator
  const handleGenerateAll = useCallback(async () => {
    if (!product?.id || !user?.company_id) return;

    setGenerating(true);
    setActiveTab('overview');

    const startTime = Date.now();
    const toastId = toast.loading('Starting AI generation...');
    let savedListing = listing;

    // Helper to build progress state with live content
    const updateProgress = (updates) => {
      setGeneratingProgress((prev) => ({
        ...prev,
        startTime,
        ...updates,
      }));
    };

    try {
      // --- Step 1: Generate Copy ---
      updateProgress({ phase: 'copy', progress: 5, stepLabel: 'Analyzing product and crafting copy...', copy: null, heroImageUrl: null, galleryImages: [], galleryTotal: 4, videoUrl: null });
      toast.loading('Generating product copy...', { id: toastId });

      const { data: copyData, error: copyError } = await supabase.functions.invoke('generate-listing-copy', {
        body: {
          product_name: product?.name || '',
          product_description: product?.description || '',
          product_category: product?.category || '',
          product_specs: details?.specifications || details || {},
          product_price: product?.price,
          product_currency: product?.currency || 'EUR',
          product_brand: product?.brand || '',
          product_tags: product?.tags || [],
          product_ean: details?.ean || details?.barcode || '',
          channel: selectedChannel || 'generic',
          language: 'EN',
          tone: 'professional',
        },
      });

      if (copyError) throw copyError;

      const ai = copyData?.listing;
      if (!ai) throw new Error('No copy data returned');

      const firstTitle = ai.titles?.[0]
        ? (typeof ai.titles[0] === 'string' ? ai.titles[0] : ai.titles[0].text || '')
        : product?.name || '';

      const allTitles = (ai.titles || []).map((t) => typeof t === 'string' ? t : t.text || '');

      const copyPayload = {
        listing_title: firstTitle,
        listing_description: ai.description || '',
        bullet_points: ai.bullet_points || [],
        seo_title: ai.seo_title || '',
        seo_description: ai.seo_description || '',
        search_keywords: ai.search_keywords || [],
      };

      savedListing = await saveListingSilent(copyPayload);

      // Update progress with live copy content
      updateProgress({
        phase: 'copy',
        progress: 20,
        stepLabel: 'Copy generated!',
        copy: {
          title: firstTitle,
          allTitles,
          description: ai.description || '',
          bulletPoints: ai.bullet_points || [],
          seoTitle: ai.seo_title || '',
          seoDescription: ai.seo_description || '',
          searchKeywords: ai.search_keywords || [],
          shortTagline: ai.short_tagline || '',
          reasoning: ai.reasoning || '',
        },
      });

      // --- Step 2: Generate Hero Image ---
      updateProgress({ phase: 'hero', progress: 25, stepLabel: 'Creating studio hero shot...' });
      toast.loading('Creating hero image...', { id: toastId });

      try {
        const heroPrompt = `Professional e-commerce product photography of ${product?.name || 'the product'} on a clean white background, studio lighting, sharp detail, commercial hero shot, high resolution, centered composition`;
        const heroUrl = await generateImage(heroPrompt, 'product_variation');
        savedListing = await saveListingSilent({ hero_image_url: heroUrl });
        updateProgress({ phase: 'hero', progress: 35, stepLabel: 'Hero image created!', heroImageUrl: heroUrl });
      } catch (imgErr) {
        console.warn('[ProductListingBuilder] Hero image failed:', imgErr.message);
        updateProgress({ phase: 'hero', progress: 35, stepLabel: 'Hero image skipped' });
      }

      // --- Step 3: Generate Gallery Images (4 lifestyle variants) ---
      updateProgress({ phase: 'gallery', progress: 40, stepLabel: 'Generating lifestyle gallery...' });
      toast.loading('Generating lifestyle images...', { id: toastId });

      const galleryScenes = [
        { prompt: `${product?.name || 'Product'} in a modern lifestyle setting, warm natural light, home interior, aspirational photography`, label: 'Lifestyle Setting' },
        { prompt: `${product?.name || 'Product'} close-up detail shot, macro photography, texture and material visible, commercial quality`, label: 'Close-up Detail' },
        { prompt: `${product?.name || 'Product'} in flat-lay composition with complementary accessories, top-down view, styled product photography`, label: 'Flat-lay Composition' },
        { prompt: `${product?.name || 'Product'} in use, lifestyle demonstration, real-world context, authentic feel, soft natural lighting`, label: 'In-use Demo' },
      ];

      const galleryUrls = [];
      for (let i = 0; i < galleryScenes.length; i++) {
        try {
          updateProgress({
            phase: 'gallery',
            progress: 40 + ((i + 1) / galleryScenes.length) * 30,
            stepLabel: `Creating ${galleryScenes[i].label} (${i + 1}/${galleryScenes.length})...`,
          });
          const url = await generateImage(galleryScenes[i].prompt, 'product_scene');
          galleryUrls.push({ url, description: galleryScenes[i].label });

          // Update gallery one at a time for progressive reveal
          updateProgress({
            galleryImages: [...galleryUrls],
          });
        } catch (err) {
          console.warn(`[ProductListingBuilder] Gallery image ${i + 1} failed:`, err.message);
        }
      }

      if (galleryUrls.length > 0) {
        const existingGallery = savedListing?.gallery_urls || [];
        savedListing = await saveListingSilent({
          gallery_urls: [...existingGallery, ...galleryUrls.map((g) => g.url)],
        });
      }

      // --- Step 4: Generate Video ---
      updateProgress({ phase: 'video', progress: 75, stepLabel: 'Generating product video...' });
      toast.loading('Creating product video...', { id: toastId });

      try {
        const videoPrompt = `Cinematic product showcase of ${product?.name || 'the product'}: slow rotating view, studio lighting on clean background, smooth camera movement, professional commercial quality`;
        const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-video', {
          body: {
            prompt: videoPrompt,
            product_name: product?.name,
            reference_image_url: savedListing?.hero_image_url || productReferenceImages[0] || null,
            company_id: user?.company_id,
            user_id: user?.id,
          },
        });

        if (videoError) throw videoError;
        if (videoData?.url) {
          savedListing = await saveListingSilent({ video_url: videoData.url });
          updateProgress({ phase: 'video', progress: 90, stepLabel: 'Video created!', videoUrl: videoData.url });
        } else if (videoData?.status === 'processing') {
          updateProgress({ phase: 'video', progress: 85, stepLabel: 'Video processing in background...' });
        } else {
          updateProgress({ phase: 'video', progress: 85, stepLabel: 'Video generation skipped' });
        }
      } catch (vidErr) {
        console.warn('[ProductListingBuilder] Video generation failed:', vidErr.message);
        updateProgress({ phase: 'video', progress: 85, stepLabel: 'Video skipped' });
      }

      // --- Step 5: Done ---
      updateProgress({ phase: 'done', progress: 100, stepLabel: 'Your listing is ready!' });
      toast.success(
        `Listing complete! ${galleryUrls.length + (savedListing?.hero_image_url ? 1 : 0)} images generated`,
        { id: toastId, duration: 5000 }
      );

      // Re-fetch to sync state
      await fetchListing();

    } catch (err) {
      console.error('[ProductListingBuilder] generateAll error:', err);
      toast.error('Generation failed: ' + (err.message || 'Unknown error'), { id: toastId });
      setGeneratingProgress(null);
    } finally {
      setGenerating(false);
      // Don't auto-clear progress or auto-switch tabs - user stays on Overview with the immersive view
    }
  }, [product, details, user, listing, selectedChannel, saveListingSilent, generateImage, fetchListing, productReferenceImages]);

  // Switch to a specific sub-tab - clear generation view when leaving overview
  const handleTabChange = useCallback((tabId) => {
    if (tabId !== 'overview' && generatingProgress?.phase === 'done') {
      setGeneratingProgress(null);
    }
    setActiveTab(tabId);
  }, [generatingProgress]);

  // Render the active sub-component
  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <ListingOverview
            product={product}
            details={details}
            listing={listing}
            onGenerateAll={handleGenerateAll}
            onTabChange={handleTabChange}
            loading={generating}
            generatingProgress={generatingProgress}
          />
        );
      case 'copywriter':
        return (
          <ListingCopywriter
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      case 'images':
        return (
          <ListingImageStudio
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      case 'video':
        return (
          <ListingVideoStudio
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      case 'publish':
        return (
          <ListingPublish
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
            onNavigate={handleTabChange}
          />
        );
      default:
        return null;
    }
  }, [activeTab, product, details, listing, generating, generatingProgress, handleGenerateAll, handleTabChange, saveListing, selectedChannel]);

  return (
    <div className="space-y-6">
      {/* Header: Sub-nav + Channel Selector */}
      <div className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border p-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        {/* Sub-navigation pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                    : cn(
                        t('text-slate-500 hover:text-slate-800 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-white/5')
                      )
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Channel selector pills */}
        <div className={cn(
          'flex items-center gap-1 rounded-xl border p-1',
          t('border-slate-200 bg-slate-50', 'border-white/5 bg-white/[0.02]')
        )}>
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isActive = selectedChannel === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  isActive
                    ? cn(
                        'shadow-sm',
                        t('bg-white text-slate-900', 'bg-zinc-800 text-white')
                      )
                    : t('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {channel.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className={cn(
          'flex items-center justify-center py-20 rounded-2xl border',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <Loader2 className={cn('w-8 h-8 animate-spin', t('text-slate-400', 'text-zinc-500'))} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
