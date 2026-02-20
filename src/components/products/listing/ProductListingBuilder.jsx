import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  BarChart3,
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

import ListingPreview from './ListingPreview';
import ListingOverview from './ListingOverview';
import ListingImageStudio from './ListingImageStudio';
import ListingVideoStudio from './ListingVideoStudio';
import ListingPublish from './ListingPublish';
import ListingCopywriter from './ListingCopywriter';

// Helper: save a generated image to the library (generated_content table)
async function saveToLibrary(url, { companyId, userId, productId, productName, label, type = 'image', prompt = '' }) {
  try {
    await supabase.from('generated_content').insert({
      company_id: companyId,
      created_by: userId,
      content_type: type,
      status: 'completed',
      url,
      thumbnail_url: url,
      name: `${productName || 'Product'} - ${label}`,
      generation_config: {
        source: 'product_listing',
        label,
        prompt: prompt?.substring?.(0, 500) || '',
        product_id: productId,
      },
      product_context: { product_id: productId },
      tags: ['product_listing', label.toLowerCase().replace(/\s+/g, '_')],
    });
  } catch (err) {
    console.warn('[saveToLibrary] Failed:', err.message);
  }
}

// Helper: sync generated images back to the product record (gallery + featured_image)
// Uses onProductUpdate callback if available so the parent state is refreshed too
async function syncImagesToProduct(productId, { heroUrl, galleryImageObjects, existingGallery = [] }, onProductUpdate) {
  if (!productId) return;
  const updates = {};

  // Set hero as featured_image (structured object matching ProductImageUploader format)
  if (heroUrl) {
    updates.featured_image = { url: heroUrl, alt: 'AI-generated hero image', type: 'image/png' };
  }

  // Append gallery images to product's gallery array (structured objects, deduped by url)
  if (galleryImageObjects?.length > 0) {
    const existing = Array.isArray(existingGallery) ? existingGallery : [];
    const existingUrls = new Set(existing.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean));
    const newImages = galleryImageObjects.filter(img => !existingUrls.has(img.url));
    updates.gallery = [...existing, ...newImages];
  }

  if (Object.keys(updates).length > 0) {
    try {
      if (onProductUpdate) {
        // Use parent callback — updates DB + refreshes parent state (ProductDetail)
        await onProductUpdate(updates);
      } else {
        await supabase.from('products').update(updates).eq('id', productId);
      }
    } catch (err) {
      console.warn('[syncImagesToProduct] Failed:', err.message);
    }
  }
}

const SUB_TABS = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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

export default function ProductListingBuilder({ product, details, onDetailsUpdate, onProductUpdate }) {
  const { t } = useTheme();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState('preview');
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

  // Auto-sync: when listing has images that aren't in product.gallery, push them
  useEffect(() => {
    if (!listing || !product?.id || !onProductUpdate) return;

    const existingGallery = Array.isArray(product?.gallery) ? product.gallery : [];
    const existingUrls = new Set(existingGallery.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean));

    // Check hero
    const heroUrl = listing.hero_image_url;
    const featuredUrl = typeof product?.featured_image === 'string'
      ? product.featured_image
      : product?.featured_image?.url || null;
    const heroMissing = heroUrl && heroUrl !== featuredUrl;

    // Check gallery
    const listingGallery = Array.isArray(listing.gallery_urls) ? listing.gallery_urls : [];
    const missingImages = listingGallery.filter(url => url && !existingUrls.has(url));

    if (!heroMissing && missingImages.length === 0) return;

    const updates = {};
    if (heroMissing) {
      updates.featured_image = { url: heroUrl, alt: 'AI-generated hero image', type: 'image/png' };
    }
    if (missingImages.length > 0) {
      const newImages = missingImages.map((url, i) => ({
        url,
        alt: `AI-generated image ${i + 1}`,
        type: 'image/png',
      }));
      updates.gallery = [...existingGallery, ...newImages];
    }

    onProductUpdate(updates).catch(err =>
      console.warn('[auto-sync] Failed to sync listing images to product:', err.message)
    );
  }, [listing?.hero_image_url, listing?.gallery_urls, product?.id]);

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

  // Generate a single image via NanoBanana Pro
  const generateImage = useCallback(async (prompt, useCase = 'product_scene') => {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt,
        product_name: product?.name,
        product_images: productReferenceImages,
        use_case: productReferenceImages.length > 0 ? useCase : 'marketing_creative',
        model_key: 'nano-banana-pro',
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

  // Generate a single image with custom aspect ratio (for video frames)
  const generateImageWide = useCallback(async (prompt, useCase = 'product_scene') => {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt,
        product_name: product?.name,
        product_images: productReferenceImages,
        use_case: productReferenceImages.length > 0 ? useCase : 'marketing_creative',
        model_key: 'nano-banana-pro',
        style: 'photorealistic',
        aspect_ratio: '16:9',
        width: 1280,
        height: 720,
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

  // Generate all listing content via AI - the main 7-phase orchestrator
  const handleGenerateAll = useCallback(async () => {
    if (!product?.id || !user?.company_id) return;

    setGenerating(true);
    setActiveTab('analytics');

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
      // ═══════════════════════════════════════════════════════════════
      // Phase 1: RESEARCH — Investigate the product via Tavily + LLM
      // ═══════════════════════════════════════════════════════════════
      updateProgress({
        phase: 'research', progress: 2, stepLabel: 'Researching product...',
        research: null, copy: null, heroImageUrl: null, galleryImages: [], galleryTotal: 4,
        videoFrames: [], videoFramesTotal: 2, videoUrl: null,
      });
      toast.loading('AI is researching your product...', { id: toastId });

      let researchData = null;
      let researchContext = null;

      try {
        const { data: rData, error: rError } = await supabase.functions.invoke('research-product', {
          body: {
            productDescription: `${product?.name || ''} ${product?.description || ''}`.trim(),
            extractedEan: details?.ean || details?.barcode || '',
            supplierName: product?.brand || '',
            modelNumber: details?.model_number || details?.sku || '',
          },
        });

        if (rError) throw rError;

        researchData = rData?.product || rData;

        const specs = researchData?.specifications || [];
        const valueProps = specs.map((s) => `${s.name}: ${s.value}`).filter(Boolean);
        const keyFeatures = specs.slice(0, 8).map((s) => s.name).filter(Boolean);

        researchContext = {
          findings: researchData?.description || researchData?.tagline || '',
          valuePropositions: valueProps,
          targetAudience: researchData?.category ? `Consumers interested in ${researchData.category}` : 'General consumers',
          competitorInsights: researchData?.sourceUrl ? `Market data sourced from ${researchData.sourceUrl}` : '',
          keyFeatures,
        };

        updateProgress({
          phase: 'research', progress: 10, stepLabel: 'Research complete!',
          research: {
            summary: researchData?.description || researchData?.tagline || 'Product analyzed from catalog data',
            valuePropositions: valueProps,
            targetAudience: researchContext.targetAudience,
            competitorInsights: researchContext.competitorInsights,
            keyFeatures,
            sources: researchData?.sourceUrl ? [researchData.sourceUrl] : [],
          },
        });
      } catch (researchErr) {
        console.warn('[ProductListingBuilder] Research failed, using catalog data:', researchErr.message);
        researchContext = {
          findings: product?.description || '',
          valuePropositions: [],
          targetAudience: product?.category ? `Consumers interested in ${product.category}` : 'General consumers',
          competitorInsights: '',
          keyFeatures: [],
        };
        updateProgress({
          phase: 'research', progress: 10, stepLabel: 'Using catalog data',
          research: {
            summary: product?.description || 'Using existing product catalog data',
            valuePropositions: [],
            targetAudience: researchContext.targetAudience,
            competitorInsights: '',
            keyFeatures: [],
            sources: [],
          },
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // Phase 2: COPY — Generate research-informed listing copy
      // ═══════════════════════════════════════════════════════════════
      updateProgress({ phase: 'copy', progress: 12, stepLabel: 'Crafting research-informed copy...' });
      toast.loading('Writing product copy...', { id: toastId });

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
          research_context: researchContext,
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

      updateProgress({
        phase: 'copy', progress: 22, stepLabel: 'Copy generated!',
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

      // ═══════════════════════════════════════════════════════════════
      // Build rich product context for image/video prompts
      // ═══════════════════════════════════════════════════════════════
      const productName = product?.name || 'the product';
      const productBrand = product?.brand || researchData?.brand || '';
      const productCategory = product?.category || researchData?.category || '';
      const productDesc = product?.description || product?.short_description || '';
      const keySpecs = researchContext?.keyFeatures?.slice(0, 4)?.join(', ') || '';
      const brandPrefix = productBrand ? `${productBrand} ` : '';
      const productIdentity = `${brandPrefix}${productName}`.trim();
      const materialHints = keySpecs ? ` Key features: ${keySpecs}.` : '';

      // ═══════════════════════════════════════════════════════════════
      // Phase 3: HERO IMAGE — Studio product shot
      // ═══════════════════════════════════════════════════════════════
      updateProgress({ phase: 'hero', progress: 25, stepLabel: 'Creating studio hero shot...' });
      toast.loading('Creating hero image...', { id: toastId });

      try {
        const heroPrompt = [
          `Generate a professional e-commerce hero photograph of the ${productIdentity}.`,
          productDesc ? `Product description: ${productDesc.substring(0, 200)}.` : '',
          `The product must look EXACTLY like the reference image(s) provided — preserve every detail of shape, color, material finish, branding, and proportions.`,
          `Setting: Pure white seamless backdrop with soft gradient shadow beneath the product.`,
          `Lighting: Three-point studio setup — large softbox key light at 45 degrees camera-left, fill card camera-right reducing shadow density, subtle rim light from behind for edge separation.`,
          `Composition: Product centered in frame with generous negative space for text overlay. Shot at eye level, slight 3/4 angle to show dimensionality.`,
          `Technical: 100mm macro lens equivalent, f/8 for full depth of field, no motion blur, tack-sharp across entire product surface.`,
          `Quality: Award-winning commercial product photography, pixel-perfect detail on textures and materials, color-accurate, ready for high-end e-commerce listing.`,
        ].filter(Boolean).join('\n');
        const heroUrl = await generateImage(heroPrompt, 'product_variation');
        savedListing = await saveListingSilent({ hero_image_url: heroUrl });
        updateProgress({ phase: 'hero', progress: 32, stepLabel: 'Hero image created!', heroImageUrl: heroUrl });
        // Save to library
        saveToLibrary(heroUrl, { companyId: user.company_id, userId: user.id, productId: product.id, productName: product.name, label: 'Hero Image', prompt: heroPrompt });
      } catch (imgErr) {
        console.warn('[ProductListingBuilder] Hero image failed:', imgErr.message);
        updateProgress({ phase: 'hero', progress: 32, stepLabel: 'Hero image skipped' });
      }

      // ═══════════════════════════════════════════════════════════════
      // Phase 4: GALLERY — 4 lifestyle variant shots
      // ═══════════════════════════════════════════════════════════════
      updateProgress({ phase: 'gallery', progress: 35, stepLabel: 'Generating lifestyle gallery...' });
      toast.loading('Generating lifestyle images...', { id: toastId });

      const galleryScenes = [
        {
          prompt: [
            `Generate a lifestyle environment photograph of the ${productIdentity} in a real-world setting.`,
            productDesc ? `Product: ${productDesc.substring(0, 150)}.` : '',
            `The product must look EXACTLY like the reference image(s) — same shape, color, branding, and all visual details preserved precisely.`,
            `Setting: Modern, well-designed ${productCategory?.includes('Kitchen') || productCategory?.includes('Home') ? 'home interior with natural materials — light wood, marble, or concrete surfaces' : 'contemporary interior with clean lines and neutral tones'}.`,
            `Lighting: Warm natural window light streaming in from the side, creating soft directional shadows.${materialHints}`,
            `Style: Editorial lifestyle photography, aspirational but authentic. Product is the clear hero but feels naturally placed in the environment.`,
            `Technical: 35mm lens equivalent, f/2.8 with gentle background bokeh, warm color temperature (5500K).`,
          ].filter(Boolean).join('\n'),
          label: 'Lifestyle Setting',
        },
        {
          prompt: [
            `Generate an extreme close-up detail photograph of the ${productIdentity}.`,
            productDesc ? `Product: ${productDesc.substring(0, 150)}.` : '',
            `The product must look EXACTLY like the reference image(s) — all textures, finishes, logos, and material properties reproduced precisely.`,
            `Focus: Tight crop on the most visually interesting detail — surface texture, material quality, control interface, or distinctive design element.`,
            `Lighting: Raking light from a low angle to emphasize surface texture and material quality. Single focused light source with minimal fill.`,
            `Style: Macro product photography revealing craftsmanship and build quality. Shallow depth of field isolating the detail.`,
            `Technical: 100mm macro lens, f/4, razor-thin focal plane on the key detail, creamy bokeh on surrounding areas.`,
          ].filter(Boolean).join('\n'),
          label: 'Close-up Detail',
        },
        {
          prompt: [
            `Generate a styled flat-lay photograph featuring the ${productIdentity} with complementary props.`,
            productDesc ? `Product: ${productDesc.substring(0, 150)}.` : '',
            `The product must look EXACTLY like the reference image(s) — preserve all visual details.`,
            `Composition: Overhead bird's-eye view, product placed off-center using rule of thirds, surrounded by 3-4 carefully chosen accessories or props relevant to ${productCategory || 'its use case'}.`,
            `Surface: Clean matte surface — light linen fabric, marble slab, or warm wood. Complementary color palette that makes the product pop.`,
            `Lighting: Even, diffused overhead light with very subtle shadows for depth.`,
            `Style: Instagram-worthy styled flat-lay, editorial product arrangement with intentional negative space and visual breathing room.`,
          ].filter(Boolean).join('\n'),
          label: 'Flat-lay Composition',
        },
        {
          prompt: [
            `Generate an action/in-use photograph showing the ${productIdentity} being used naturally.`,
            productDesc ? `Product: ${productDesc.substring(0, 150)}.` : '',
            `The product must look EXACTLY like the reference image(s) — same appearance in every detail.`,
            `Scene: A person's hands naturally using or interacting with the product in its intended context. The interaction should look genuine and purposeful, not posed.`,
            `Lighting: Soft natural light, warm and inviting. Slight backlight creating a rim of light around the product for visual separation.`,
            `Style: Authentic lifestyle documentation, the kind of image that makes a viewer imagine themselves using the product. Not overly staged.`,
            `Technical: 50mm lens, f/2.8, focus on the product and hands, gentle environmental bokeh in the background.`,
          ].filter(Boolean).join('\n'),
          label: 'In-use Demo',
        },
      ];

      const galleryUrls = [];
      for (let i = 0; i < galleryScenes.length; i++) {
        try {
          updateProgress({
            phase: 'gallery',
            progress: 35 + ((i + 1) / galleryScenes.length) * 20,
            stepLabel: `Creating ${galleryScenes[i].label} (${i + 1}/${galleryScenes.length})...`,
          });
          const url = await generateImage(galleryScenes[i].prompt, 'product_scene');
          galleryUrls.push({ url, description: galleryScenes[i].label });
          updateProgress({ galleryImages: [...galleryUrls] });
          // Save to library
          saveToLibrary(url, { companyId: user.company_id, userId: user.id, productId: product.id, productName: product.name, label: galleryScenes[i].label, prompt: galleryScenes[i].prompt });
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

      // ═══════════════════════════════════════════════════════════════
      // Phase 5: VIDEO FRAMES — 2 cinematic 16:9 reference frames
      // ═══════════════════════════════════════════════════════════════
      updateProgress({ phase: 'videoframes', progress: 58, stepLabel: 'Generating cinematic video frames...' });
      toast.loading('Creating video reference frames...', { id: toastId });

      const videoFrameScenes = [
        {
          prompt: [
            `Generate a cinematic opening frame for a product video of the ${productIdentity}.`,
            productDesc ? `Product: ${productDesc.substring(0, 150)}.` : '',
            `The product must look EXACTLY like the reference image(s) — identical shape, color, material, branding, and every visual detail.`,
            `Setting: Dark reflective surface — polished black acrylic or obsidian — in a controlled studio environment. Deep black background with no visible edges or seams.`,
            `Lighting: Dramatic three-point cinematic lighting — cool-toned key light at 30 degrees creating defined highlights on the product surface, subtle blue rim light from behind for edge definition, warm accent light from below reflecting off the surface.`,
            `Composition: Wide 16:9 cinematic frame. Product positioned at center-right using golden ratio, with leading space on the left suggesting the camera will move. Shot from slightly below eye level for a heroic, commanding perspective.`,
            `Mood: Premium commercial film still. The kind of frame that opens a 30-second product reveal ad. High contrast, rich shadows, polished and luxurious.`,
            `Technical: Anamorphic lens look, slight vignette on edges, 24fps motion-picture color science.`,
          ].filter(Boolean).join('\n'),
          label: 'Cinematic Hero Frame',
        },
        {
          prompt: [
            `Generate a cinematic lifestyle frame for a product video of the ${productIdentity}.`,
            productDesc ? `Product: ${productDesc.substring(0, 150)}.` : '',
            `The product must look EXACTLY like the reference image(s) — all visual details preserved precisely.`,
            `Setting: Elegant ${productCategory?.includes('Kitchen') || productCategory?.includes('Home') ? 'modern kitchen or living space' : 'contemporary environment'} with warm, lived-in atmosphere. Clean background with subtle depth layers.`,
            `Lighting: Cinematic warm ambient light (3200K-4500K), large soft source from a window or practical light, volumetric haze catching light beams. Natural shadows adding depth.`,
            `Composition: Wide 16:9 frame. Product in its natural environment, positioned at the left third of frame with the environment breathing into the right side. Depth is important — foreground element softly out of focus, product sharp, background softly defocused.`,
            `Mood: The aspirational mid-point of a product commercial where the viewer sees the product in context. Warm, inviting, makes you want to reach into the frame.`,
            `Technical: 35mm anamorphic look, shallow depth of field, warm color grading with lifted shadows.`,
          ].filter(Boolean).join('\n'),
          label: 'Lifestyle Motion Frame',
        },
      ];

      const videoFrames = [];
      for (let i = 0; i < videoFrameScenes.length; i++) {
        try {
          updateProgress({
            phase: 'videoframes',
            progress: 58 + ((i + 1) / videoFrameScenes.length) * 12,
            stepLabel: `Creating ${videoFrameScenes[i].label} (${i + 1}/${videoFrameScenes.length})...`,
          });
          const url = await generateImageWide(videoFrameScenes[i].prompt, 'product_scene');
          videoFrames.push({ url, description: videoFrameScenes[i].label });
          updateProgress({ videoFrames: [...videoFrames] });
          // Save to library
          saveToLibrary(url, { companyId: user.company_id, userId: user.id, productId: product.id, productName: product.name, label: videoFrameScenes[i].label, prompt: videoFrameScenes[i].prompt });
        } catch (err) {
          console.warn(`[ProductListingBuilder] Video frame ${i + 1} failed:`, err.message);
        }
      }

      // Save video frames alongside gallery
      if (videoFrames.length > 0) {
        savedListing = await saveListingSilent({
          video_reference_frames: videoFrames.map((f) => f.url),
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // Phase 6: PRODUCT VIDEO — Veo 3.1 via generate-fashion-video
      // Only proceeds if we have a successfully generated video frame
      // or at minimum a hero image from this generation run.
      // ═══════════════════════════════════════════════════════════════
      updateProgress({ phase: 'video', progress: 72, stepLabel: 'Preparing product video...' });
      toast.loading('Creating cinematic product video...', { id: toastId });

      // Require a generated image — prefer video frame, then hero from THIS run, then existing hero
      const videoReferenceUrl = videoFrames[0]?.url || savedListing?.hero_image_url || null;
      const hasValidReference = !!videoReferenceUrl;

      if (hasValidReference) {
        try {
          const researchSummary = researchContext?.findings
            ? researchContext.findings.substring(0, 150)
            : '';
          const videoPrompt = [
            `Cinematic product reveal video of the ${productIdentity}.`,
            researchSummary ? `Context: ${researchSummary}.` : '',
            `Camera movement: Begin with a slow dolly-in toward the product from a wide establishing shot, then transition into a smooth 180-degree orbit around the product at a slight low angle, revealing all sides and details. End with a slow push-in to a hero close-up of the product's most distinctive feature.`,
            `Lighting: Professional studio lighting that evolves subtly during the shot — starting with dramatic rim lighting and deep shadows, gradually introducing fill light as the camera orbits to reveal surface details and material quality.`,
            `Pace: Smooth and deliberate. No fast cuts or jerky movements. Each movement flows naturally into the next with cinematic easing. Real-time speed, no slow motion.`,
            `Style: Premium commercial product film — the visual quality of an Apple or Dyson product video. Shallow depth of field keeping the product razor-sharp while the background falls away into soft bokeh.`,
            `Keep the product exactly as shown in the reference image. Do not alter, modify, or reimagine the product in any way.`,
          ].filter(Boolean).join(' ');

          const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-fashion-video', {
            body: {
              image_url: videoReferenceUrl,
              prompt: videoPrompt,
              model_key: 'veo-3.1-fast',
              duration_seconds: 6,
              aspect_ratio: '16:9',
              generate_audio: false,
              company_id: user?.company_id,
              user_id: user?.id,
            },
          });

          if (videoError) throw videoError;
          if (videoData?.url) {
            savedListing = await saveListingSilent({ video_url: videoData.url });
            updateProgress({ phase: 'video', progress: 95, stepLabel: 'Video created!', videoUrl: videoData.url });
            // Save video to library
            saveToLibrary(videoData.url, { companyId: user.company_id, userId: user.id, productId: product.id, productName: product.name, label: 'Product Video', type: 'video', prompt: videoPrompt });
          } else if (videoData?.status === 'processing') {
            updateProgress({ phase: 'video', progress: 90, stepLabel: 'Video processing in background...' });
          } else {
            updateProgress({ phase: 'video', progress: 90, stepLabel: 'Video generation completed' });
          }
        } catch (vidErr) {
          console.warn('[ProductListingBuilder] Video generation failed:', vidErr.message);
          updateProgress({ phase: 'video', progress: 90, stepLabel: 'Video skipped — check Video Studio later' });
        }
      } else {
        console.warn('[ProductListingBuilder] No generated images available for video — skipping');
        updateProgress({ phase: 'video', progress: 90, stepLabel: 'Video skipped — images must generate first' });
      }

      // ═══════════════════════════════════════════════════════════════
      // Phase 7: DONE — Sync images to product + grand finale
      // ═══════════════════════════════════════════════════════════════

      // Sync generated images back to the product record (featured_image + gallery)
      // Include gallery images + video frames so ALL generated media appears in Product Detail
      const heroUrl = savedListing?.hero_image_url || null;
      const galleryImageObjects = [
        ...galleryUrls.map((g, i) => ({
          url: g.url,
          alt: g.description || `AI-generated gallery image ${i + 1}`,
          type: 'image/png',
        })),
        ...videoFrames.map((f, i) => ({
          url: f.url,
          alt: f.description || `Video reference frame ${i + 1}`,
          type: 'image/png',
        })),
      ];
      await syncImagesToProduct(product.id, {
        heroUrl,
        galleryImageObjects,
        existingGallery: product?.gallery || [],
      }, onProductUpdate);

      updateProgress({ phase: 'done', progress: 100, stepLabel: 'Your listing is ready!' });

      const totalImages = (heroUrl ? 1 : 0) + galleryUrls.length + videoFrames.length;
      toast.success(
        `Listing complete! Researched, ${totalImages} images + video generated`,
        { id: toastId, duration: 5000 }
      );

      await fetchListing();

    } catch (err) {
      console.error('[ProductListingBuilder] generateAll error:', err);
      toast.error('Generation failed: ' + (err.message || 'Unknown error'), { id: toastId });
      setGeneratingProgress(null);
    } finally {
      setGenerating(false);
    }
  }, [product, details, user, listing, selectedChannel, saveListingSilent, generateImage, generateImageWide, fetchListing, productReferenceImages]);

  // Generate a single image for a specific template slot
  const handleGenerateSlotImage = useCallback(async (slot) => {
    if (!product?.id || !user?.company_id) return;

    const productName = product?.name || 'Product';
    const productBrand = product?.brand || '';
    const productDesc = product?.description || product?.short_description || '';
    const productCategory = product?.category || details?.category || '';
    const productIdentity = `${productBrand ? productBrand + ' ' : ''}${productName}`.trim();

    // Build prompt based on slot type and description
    const slotPrompts = {
      studio: {
        'Front view, white BG': `Professional e-commerce front-view photograph of the ${productIdentity} on a pure white seamless backdrop. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Three-point studio lighting, 100mm lens, f/8, tack-sharp, centered composition. Award-winning commercial product photography.`,
        'Angle view, white BG': `Professional e-commerce 3/4 angle photograph of the ${productIdentity} on a pure white seamless backdrop. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Slight elevated angle showing dimensionality, soft gradient shadow beneath, clean studio lighting. Commercial product photography quality.`,
        'Detail/close-up, white BG': `Extreme close-up detail photograph of the ${productIdentity} on white background. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Tight crop on the most visually interesting detail — surface texture, control interface, or distinctive design element. Macro lens, shallow depth of field, raking studio light.`,
      },
      lifestyle: {
        'Product in use': `Lifestyle photograph of the ${productIdentity} being used naturally in its intended context. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Person's hands interacting with the product, warm natural window light, authentic and aspirational. 50mm lens, f/2.8, gentle background bokeh.`,
        'Context / setting': `Lifestyle environment photograph of the ${productIdentity} in a modern ${productCategory?.toLowerCase()?.includes('kitchen') || productCategory?.toLowerCase()?.includes('home') ? 'home interior with natural materials' : 'contemporary interior'}. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Warm natural light, editorial style, product is the clear hero. 35mm lens, f/2.8.`,
        'Scale / hands': `Photograph showing the ${productIdentity} held in human hands for scale reference. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Clean, well-lit environment, focus on the product, hands providing natural sense of size. Soft natural light, warm tones.`,
        'Styled flat lay': `Styled overhead flat-lay photograph of the ${productIdentity} with complementary props. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Bird's-eye view, product off-center using rule of thirds, 3-4 relevant accessories. Clean matte surface, even diffused overhead light, Instagram-worthy editorial arrangement.`,
      },
      graphic: {
        'Feature highlight #1': `Professional product infographic image of the ${productIdentity} highlighting its primary key feature/USP. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product shown at center with clean callout overlays pointing to the key feature. Dark gradient background, modern typography, clean design. Commercial quality graphic.`,
        'Feature highlight #2': `Professional product infographic image of the ${productIdentity} highlighting a secondary feature/benefit. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} Product shown with clean graphical elements explaining the feature. Complementary color scheme, modern layout, commercial e-commerce graphic quality.`,
        'Specs / comparison': `Professional product specifications graphic for the ${productIdentity}. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} Product centered with key technical specs displayed around it in a clean, modern layout. Iconographic callouts, premium color scheme, high-end e-commerce graphic.`,
        'Awards / certifications': `Professional product trust/certification graphic for the ${productIdentity}. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} Product shown with quality badges, certification icons, or award elements. Clean modern design, premium feel, builds buyer confidence.`,
      },
    };

    const typePrompts = slotPrompts[slot.type] || {};
    const prompt = typePrompts[slot.desc] || `Professional product photograph of the ${productIdentity}. ${productDesc ? `Product: ${productDesc.substring(0, 150)}.` : ''} The product must look EXACTLY like the reference image(s). Commercial quality, studio lighting.`;

    const useCase = slot.type === 'studio' ? 'product_variation' : 'product_scene';

    try {
      const url = await generateImage(prompt, useCase);

      // Save to library
      saveToLibrary(url, {
        companyId: user.company_id,
        userId: user.id,
        productId: product.id,
        productName: product.name,
        label: `${slot.label} - ${slot.desc}`,
        prompt,
      });

      // Insert at the correct position in the listing gallery
      const currentHero = listing?.hero_image_url || null;
      const currentGallery = listing?.gallery_urls || [];
      const allCurrentUrls = [currentHero, ...currentGallery].filter(Boolean);

      // Slot position determines where the new image goes (0-indexed)
      const targetIdx = slot.slot - 1;
      const newUrls = [...allCurrentUrls];

      if (targetIdx <= newUrls.length) {
        newUrls.splice(targetIdx, 0, url);
      } else {
        newUrls.push(url);
      }

      // Save back: first URL is hero, rest is gallery
      await saveListingSilent({
        hero_image_url: newUrls[0],
        gallery_urls: newUrls.slice(1),
      });

      await fetchListing();
      toast.success(`Generated ${slot.label.toLowerCase()} image for slot ${slot.slot}`);
    } catch (err) {
      console.error('[handleGenerateSlotImage] Failed:', err);
      toast.error(`Failed to generate ${slot.label.toLowerCase()} image`);
      throw err;
    }
  }, [product, details, user, listing, generateImage, saveListingSilent, fetchListing]);

  // Switch to a specific sub-tab - clear generation view when leaving analytics
  const handleTabChange = useCallback((tabId) => {
    if (tabId !== 'analytics' && generatingProgress?.phase === 'done') {
      setGeneratingProgress(null);
    }
    setActiveTab(tabId);
  }, [generatingProgress]);

  // Render the active sub-component
  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'preview':
        return (
          <ListingPreview
            product={product}
            details={details}
            listing={listing}
            onGenerateAll={handleGenerateAll}
            loading={generating}
            generatingProgress={generatingProgress}
            onTabChange={handleTabChange}
            onUpdate={saveListingSilent}
            onGenerateSlotImage={handleGenerateSlotImage}
          />
        );
      case 'analytics':
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
