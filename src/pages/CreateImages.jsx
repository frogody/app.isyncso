import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product, PhysicalProduct } from '@/api/entities';
import {
  Image,
  Wand2,
  Sparkles,
  Download,
  RefreshCw,
  Loader2,
  Package,
  X,
  Check,
  Trash2,
  ChevronDown,
  Settings2,
  History,
  Palette,
  Camera,
  Paintbrush,
  Box,
  Monitor,
  Droplets,
  Square,
  Clock,
  Film,
  ShieldCheck,
  ImageIcon,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/api/supabaseClient';

// Use case definitions with model selection
const USE_CASES = {
  product_variation: {
    id: 'product_variation',
    name: 'Product Variations',
    description: 'In-context editing: keep product, change background/environment',
    icon: Package,
    requiresReferenceImage: true,
    costTier: 'standard',
    estimatedCost: 0.025,
    color: 'emerald'
  },
  product_scene: {
    id: 'product_scene',
    name: 'Product in Scene',
    description: 'Premium in-context editing for lifestyle settings',
    icon: Camera,
    requiresReferenceImage: true,
    costTier: 'premium',
    estimatedCost: 0.04,
    color: 'blue'
  },
  marketing_creative: {
    id: 'marketing_creative',
    name: 'Marketing Creative',
    description: 'Create promotional images, ads, social media content',
    icon: Sparkles,
    requiresReferenceImage: false,
    costTier: 'standard',
    estimatedCost: 0.025,
    color: 'purple'
  },
  quick_draft: {
    id: 'quick_draft',
    name: 'Quick Draft',
    description: 'Fast brainstorming and concept exploration',
    icon: Clock,
    requiresReferenceImage: false,
    costTier: 'economy',
    estimatedCost: 0.003,
    color: 'amber'
  },
  premium_quality: {
    id: 'premium_quality',
    name: 'Premium Quality',
    description: 'Highest quality for final assets',
    icon: Film,
    requiresReferenceImage: false,
    costTier: 'premium',
    estimatedCost: 0.04,
    color: 'rose'
  }
};

const STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photorealistic', icon: Camera },
  { id: 'illustration', label: 'Illustration', icon: Paintbrush },
  { id: '3d_render', label: '3D Render', icon: Box },
  { id: 'digital_art', label: 'Digital Art', icon: Monitor },
  { id: 'watercolor', label: 'Watercolor', icon: Droplets },
  { id: 'minimalist', label: 'Minimalist', icon: Square },
  { id: 'vintage', label: 'Vintage', icon: Clock },
  { id: 'cinematic', label: 'Cinematic', icon: Film },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square (1:1)', width: 1024, height: 1024 },
  { id: '16:9', label: 'Landscape (16:9)', width: 1792, height: 1024 },
  { id: '9:16', label: 'Portrait (9:16)', width: 1024, height: 1792 },
  { id: '4:3', label: 'Standard (4:3)', width: 1365, height: 1024 },
  { id: '3:4', label: 'Portrait (3:4)', width: 1024, height: 1365 },
];

export default function CreateImages() {
  const { user } = useUser();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [brandAssets, setBrandAssets] = useState(null);
  const [useBrandContext, setUseBrandContext] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [loadingProductImages, setLoadingProductImages] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState('marketing_creative');
  const [selectedReferenceImage, setSelectedReferenceImage] = useState(null);

  useEffect(() => {
    if (user?.company_id) {
      loadProducts();
      loadBrandAssets();
      loadGenerationHistory();
    }
  }, [user?.company_id]);

  const loadProducts = async () => {
    try {
      const data = await Product.filter({ company_id: user.company_id });
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadBrandAssets = async () => {
    try {
      const data = await BrandAssets.filter({ company_id: user.company_id });
      if (data && data.length > 0) {
        setBrandAssets(data[0]);
      }
    } catch (error) {
      console.error('Error loading brand assets:', error);
    }
  };

  const loadGenerationHistory = async () => {
    try {
      const data = await GeneratedContent.filter({
        company_id: user.company_id,
        content_type: 'image'
      }, '-created_at', 20);
      setGenerationHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Load product images when a physical product is selected
  const loadProductImages = async (product) => {
    if (!product || product.type !== 'physical') {
      setProductImages([]);
      return;
    }

    setLoadingProductImages(true);
    try {
      // Get physical product details which contain the gallery
      const physicalProducts = await PhysicalProduct.filter({ product_id: product.id });
      const physicalDetails = physicalProducts?.[0];

      const images = [];

      // Add featured image first if exists
      if (product.featured_image?.url) {
        images.push(product.featured_image.url);
      }

      // Add gallery images
      if (product.gallery && Array.isArray(product.gallery)) {
        product.gallery.forEach(img => {
          if (img.url && !images.includes(img.url)) {
            images.push(img.url);
          }
        });
      }

      // Also check physical product details for additional images
      if (physicalDetails?.images && Array.isArray(physicalDetails.images)) {
        physicalDetails.images.forEach(img => {
          const url = typeof img === 'string' ? img : img.url;
          if (url && !images.includes(url)) {
            images.push(url);
          }
        });
      }

      setProductImages(images);
      // Auto-select the first image as reference
      if (images.length > 0) {
        setSelectedReferenceImage(images[0]);
      }
      console.log(`Loaded ${images.length} reference images for product:`, product.name);
    } catch (error) {
      console.error('Error loading product images:', error);
      setProductImages([]);
      setSelectedReferenceImage(null);
    } finally {
      setLoadingProductImages(false);
    }
  };

  // Handle product selection
  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setProductSearch('');
    if (product) {
      await loadProductImages(product);
      // Auto-switch to product variation use case for physical products
      if (product.type === 'physical') {
        setSelectedUseCase('product_variation');
      }
    } else {
      setProductImages([]);
      setSelectedReferenceImage(null);
    }
  };

  // Helper: Convert hex color to natural description
  const hexToColorDescription = (hex) => {
    if (!hex) return null;
    const colorMap = {
      // Common color patterns
      '#000': 'black', '#fff': 'white', '#f00': 'red', '#0f0': 'green', '#00f': 'blue',
      '#ff0': 'yellow', '#0ff': 'cyan', '#f0f': 'magenta',
    };

    // Check exact matches first
    const normalized = hex.toLowerCase().replace('#', '');
    for (const [key, value] of Object.entries(colorMap)) {
      if (key.replace('#', '') === normalized) return value;
    }

    // Parse RGB and describe
    let r, g, b;
    if (normalized.length === 3) {
      r = parseInt(normalized[0] + normalized[0], 16);
      g = parseInt(normalized[1] + normalized[1], 16);
      b = parseInt(normalized[2] + normalized[2], 16);
    } else if (normalized.length === 6) {
      r = parseInt(normalized.slice(0, 2), 16);
      g = parseInt(normalized.slice(2, 4), 16);
      b = parseInt(normalized.slice(4, 6), 16);
    } else {
      return null;
    }

    // Determine color family and intensity
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;

    let intensity = '';
    if (lightness < 0.2) intensity = 'dark ';
    else if (lightness < 0.4) intensity = 'deep ';
    else if (lightness > 0.8) intensity = 'light ';
    else if (lightness > 0.6) intensity = 'soft ';

    // Determine hue
    if (max - min < 30) {
      if (lightness < 0.3) return 'charcoal';
      if (lightness > 0.7) return 'off-white';
      return 'gray';
    }

    if (r >= g && r >= b) {
      if (g > b * 1.5) return intensity + 'orange';
      if (b > 100 && r > 200) return intensity + 'pink';
      return intensity + 'red';
    }
    if (g >= r && g >= b) {
      if (b > r) return intensity + 'teal';
      if (r > 150) return intensity + 'lime';
      return intensity + 'green';
    }
    if (b >= r && b >= g) {
      if (r > g * 1.3) return intensity + 'purple';
      if (g > 150) return intensity + 'cyan';
      return intensity + 'blue';
    }
    return null;
  };

  // Style-specific enhancements
  const getStyleEnhancements = (styleId) => {
    const styleEnhancements = {
      photorealistic: 'ultra-realistic photograph, professional photography, sharp focus, high resolution, natural textures',
      illustration: 'detailed illustration, artistic rendering, clean lines, vibrant artwork',
      '3d_render': '3D rendered, octane render, ray tracing, volumetric lighting, smooth surfaces',
      digital_art: 'digital artwork, highly detailed, artstation quality, concept art style',
      watercolor: 'watercolor painting style, soft edges, color bleeding, artistic brushstrokes, paper texture',
      minimalist: 'minimalist composition, clean background, simple elegant design, negative space',
      vintage: 'vintage aesthetic, retro color grading, film grain, nostalgic atmosphere',
      cinematic: 'cinematic composition, dramatic lighting, movie still quality, anamorphic lens, depth of field',
    };
    return styleEnhancements[styleId] || '';
  };

  // Use case specific prompt templates
  const getUseCaseEnhancements = (useCaseId, hasReferenceImage) => {
    if (hasReferenceImage) {
      // For in-context editing, keep the prompt focused on the scene/environment
      const enhancements = {
        product_variation: 'maintaining exact product appearance, only changing the background and environment',
        product_scene: 'preserving product details while placing in lifestyle context',
      };
      return enhancements[useCaseId] || '';
    }

    const enhancements = {
      marketing_creative: 'professional marketing imagery, commercial quality, brand-aligned aesthetic',
      quick_draft: 'concept visualization',
      premium_quality: 'ultra high quality, professional commercial photography, perfect composition, studio lighting',
    };
    return enhancements[useCaseId] || '';
  };

  const buildEnhancedPrompt = () => {
    const useCase = USE_CASES[selectedUseCase];
    const hasReferenceImage = useCase?.requiresReferenceImage && selectedReferenceImage;

    // Start with base prompt
    let parts = [];

    // For reference image modes, the prompt describes the desired scene/background
    if (hasReferenceImage) {
      if (prompt.trim()) {
        parts.push(prompt.trim());
      }
      parts.push(getUseCaseEnhancements(selectedUseCase, true));
    } else {
      // For text-to-image, build a comprehensive prompt
      if (prompt.trim()) {
        parts.push(prompt.trim());
      }

      // Add product context naturally
      if (selectedProduct) {
        const productType = selectedProduct.type === 'physical' ? 'product' : 'software interface';
        parts.push(`featuring ${selectedProduct.name}`);
      }
    }

    // Add style enhancements
    const styleEnhancement = getStyleEnhancements(selectedStyle);
    if (styleEnhancement) {
      parts.push(styleEnhancement);
    }

    // Add brand context naturally (not raw hex codes)
    if (useBrandContext && brandAssets) {
      const colorDescriptions = [];
      if (brandAssets.colors?.primary) {
        const primaryColor = hexToColorDescription(brandAssets.colors.primary);
        if (primaryColor) colorDescriptions.push(primaryColor);
      }
      if (brandAssets.colors?.secondary) {
        const secondaryColor = hexToColorDescription(brandAssets.colors.secondary);
        if (secondaryColor && secondaryColor !== colorDescriptions[0]) {
          colorDescriptions.push(secondaryColor);
        }
      }
      if (colorDescriptions.length > 0) {
        parts.push(`color palette featuring ${colorDescriptions.join(' and ')}`);
      }

      if (brandAssets.visual_style?.mood) {
        parts.push(`${brandAssets.visual_style.mood} atmosphere`);
      }
    }

    // Add use case quality enhancements
    if (!hasReferenceImage) {
      const useCaseEnhancement = getUseCaseEnhancements(selectedUseCase, false);
      if (useCaseEnhancement) {
        parts.push(useCaseEnhancement);
      }
    }

    // Combine all parts naturally
    return parts.filter(p => p).join(', ');
  };

  // State for AI-enhanced prompt
  const [aiEnhancedPrompt, setAiEnhancedPrompt] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleGenerate = async () => {
    const useCase = USE_CASES[selectedUseCase];

    // Validate prompt for non-image-to-image use cases
    if (!useCase.requiresReferenceImage && !prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    // Validate reference image for image-to-image use cases
    if (useCase.requiresReferenceImage && !selectedReferenceImage) {
      toast.error('Please select a reference image for this use case');
      return;
    }

    setIsGenerating(true);
    setIsEnhancing(true);
    setGeneratedImage(null);
    setAiEnhancedPrompt(null);

    try {
      // Step 1: AI-enhance the prompt
      let finalPrompt = prompt;
      let enhancementData = null;

      try {
        toast.info('🪄 AI is enhancing your prompt...', { duration: 2000 });

        const { data: enhanceData, error: enhanceError } = await supabase.functions.invoke('enhance-prompt', {
          body: {
            prompt: prompt,
            use_case: selectedUseCase,
            style: selectedStyle,
            product_name: selectedProduct?.name,
            product_type: selectedProduct?.type,
            brand_mood: brandAssets?.visual_style?.mood,
            has_reference_image: !!selectedReferenceImage
          }
        });

        if (!enhanceError && enhanceData?.enhanced_prompt) {
          finalPrompt = enhanceData.enhanced_prompt;
          enhancementData = enhanceData;
          setAiEnhancedPrompt(enhanceData);
          console.log('AI Enhanced Prompt:', enhanceData);
        } else {
          // Fallback to rule-based enhancement
          finalPrompt = buildEnhancedPrompt();
          console.log('Using fallback enhancement');
        }
      } catch (enhanceErr) {
        console.warn('AI enhancement failed, using fallback:', enhanceErr);
        finalPrompt = buildEnhancedPrompt();
      }

      setIsEnhancing(false);

      const aspectConfig = ASPECT_RATIOS.find(a => a.id === aspectRatio);

      // Determine if this is a physical product with reference images
      const isPhysicalProduct = selectedProduct?.type === 'physical';

      // Step 2: Generate the image with enhanced prompt
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          // New multi-model params
          use_case: selectedUseCase,
          reference_image_url: selectedReferenceImage,

          // Use AI-enhanced prompt
          prompt: finalPrompt,
          original_prompt: prompt,
          style: selectedStyle,
          aspect_ratio: aspectRatio,
          width: aspectConfig?.width || 1024,
          height: aspectConfig?.height || 1024,
          brand_context: useBrandContext ? brandAssets : null,
          product_context: selectedProduct ? {
            ...selectedProduct,
            type: selectedProduct.type,
          } : null,
          // Legacy params (for backward compatibility)
          product_images: isPhysicalProduct ? productImages : [],
          is_physical_product: isPhysicalProduct,

          // Cost tracking
          company_id: user.company_id,
          user_id: user.id,
        }
      });

      if (error) throw error;
      if (data?.error) {
        throw new Error(data.details || data.error);
      }

      if (data?.url) {
        const savedContent = await GeneratedContent.create({
          company_id: user.company_id,
          content_type: 'image',
          status: 'completed',
          name: `Generated Image - ${new Date().toLocaleString()}`,
          url: data.url,
          thumbnail_url: data.url,
          generation_config: {
            prompt: prompt,
            enhanced_prompt: finalPrompt,
            style: selectedStyle,
            aspect_ratio: aspectRatio,
            model: data.model || 'nano-banana-pro',
          },
          product_context: selectedProduct ? {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
          } : null,
          brand_context: useBrandContext && brandAssets ? {
            colors_used: brandAssets.colors,
            visual_style: brandAssets.visual_style,
          } : null,
          dimensions: { width: aspectConfig?.width, height: aspectConfig?.height },
          created_by: user.id
        });

        setGeneratedImage({
          url: data.url,
          id: savedContent.id,
          prompt: prompt,
          enhanced_prompt: finalPrompt,
          ai_enhancement: enhancementData,
        });
        loadGenerationHistory();
        toast.success('Image generated successfully!');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
      setIsEnhancing(false);
    }
  };

  const handleDownload = async (imageUrl, imageName = 'generated-image') => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${imageName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleDeleteFromHistory = async (id) => {
    try {
      await GeneratedContent.delete(id);
      setGenerationHistory(prev => prev.filter(item => item.id !== id));
      toast.success('Image deleted');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleRegenerate = (item) => {
    setPrompt(item.generation_config?.prompt || '');
    setSelectedStyle(item.generation_config?.style || 'photorealistic');
    setAspectRatio(item.generation_config?.aspect_ratio || '1:1');
    setShowHistory(false);
    toast.info('Settings loaded. Click Generate to create a new image.');
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <PageHeader
          icon={Image}
          title="AI Image Generation"
          subtitle="Generate images with AI, enhanced with your brand and product context"
          color="rose"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Controls */}
          <div className="space-y-4">
            {/* Use Case Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60"
            >
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-rose-400/70" />
                What do you want to create?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(USE_CASES).map(useCase => {
                  const IconComponent = useCase.icon;
                  const isSelected = selectedUseCase === useCase.id;
                  const colorClasses = {
                    emerald: isSelected ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'hover:border-emerald-500/30',
                    blue: isSelected ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'hover:border-blue-500/30',
                    purple: isSelected ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'hover:border-purple-500/30',
                    amber: isSelected ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'hover:border-amber-500/30',
                    rose: isSelected ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'hover:border-rose-500/30',
                  };
                  return (
                    <button
                      key={useCase.id}
                      onClick={() => setSelectedUseCase(useCase.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? colorClasses[useCase.color]
                          : `bg-zinc-800/30 border-zinc-700/30 text-zinc-400 ${colorClasses[useCase.color]}`
                      }`}
                    >
                      <IconComponent className="w-4 h-4 mb-1.5" />
                      <div className="text-xs font-medium">{useCase.name}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{useCase.description}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            useCase.costTier === 'economy' ? 'border-amber-500/30 text-amber-400' :
                            useCase.costTier === 'premium' ? 'border-rose-500/30 text-rose-400' :
                            'border-zinc-500/30 text-zinc-400'
                          }`}
                        >
                          ${useCase.estimatedCost.toFixed(3)}
                        </Badge>
                        {useCase.requiresReferenceImage && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/30 text-cyan-400">
                            Needs Image
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Prompt Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60"
            >
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                <Wand2 className="w-5 h-5 text-rose-400/70" />
                {USE_CASES[selectedUseCase]?.requiresReferenceImage ? 'Describe the Scene (Optional)' : 'Prompt'}
              </h3>
              <div className="space-y-3">
                <div>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="min-h-[100px] bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-rose-500/50 resize-none"
                    maxLength={1000}
                  />
                  <div className="flex justify-between mt-1.5 text-[10px] text-zinc-500">
                    <span>{prompt.length}/1000 characters</span>
                    {brandAssets && (
                      <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-400 transition-colors">
                        <input
                          type="checkbox"
                          checked={useBrandContext}
                          onChange={(e) => setUseBrandContext(e.target.checked)}
                          className="rounded border-zinc-600 bg-zinc-800 text-rose-500 focus:ring-rose-500/50"
                        />
                        <Palette className="w-3 h-3" />
                        Apply brand context
                      </label>
                    )}
                  </div>
                </div>

                {/* Product Context Selector */}
                <div>
                  <Label className="text-zinc-400 mb-2 block text-xs">Product Context (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-zinc-800/50 border-zinc-700/50 text-white hover:bg-zinc-800 hover:border-zinc-600"
                      >
                        {selectedProduct ? (
                          <span className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-rose-400/70" />
                            {selectedProduct.name}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Select a product...</span>
                        )}
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-zinc-900 border-zinc-800 p-2">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full px-3 py-1.5 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500/50"
                      />
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {selectedProduct && (
                          <button
                            onClick={() => handleProductSelect(null)}
                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                          >
                            <X className="w-3 h-3" />
                            Clear selection
                          </button>
                        )}
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                              selectedProduct?.id === product.id
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'text-white hover:bg-zinc-800'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              {product.name}
                              {product.type === 'physical' && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-cyan-500/30 text-cyan-400">
                                  Physical
                                </Badge>
                              )}
                            </span>
                            {selectedProduct?.id === product.id && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <p className="text-zinc-500 text-xs text-center py-3">No products found</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Product Reference Images Display */}
                  {selectedProduct?.type === 'physical' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {/* Product Preservation Notice */}
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-emerald-400">Product Preservation Mode</p>
                            <p className="text-[10px] text-emerald-400/70 mt-0.5">
                              The AI will keep your product exactly as shown in the reference images. Only the background, lighting, and environment will change.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reference Images Grid */}
                      {loadingProductImages ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="w-4 h-4 text-rose-400 animate-spin mr-2" />
                          <span className="text-zinc-400 text-xs">Loading product images...</span>
                        </div>
                      ) : productImages.length > 0 ? (
                        <div>
                          <Label className="text-zinc-400 mb-1.5 block text-xs flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Select Reference Image ({productImages.length} available)
                          </Label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {productImages.slice(0, 8).map((imageUrl, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedReferenceImage(imageUrl)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                  selectedReferenceImage === imageUrl
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                                    : 'border-zinc-700/50 hover:border-zinc-500'
                                }`}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Product reference ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {selectedReferenceImage === imageUrl && (
                                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1.5">
                            Click to select the image that best represents your product. This will be preserved exactly in the generated image.
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-amber-400">No Reference Images</p>
                              <p className="text-[10px] text-amber-400/70 mt-0.5">
                                This product has no images. Add images in the Products page for best results. The AI will generate based on the product name and description only.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Style & Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60"
            >
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                <Settings2 className="w-5 h-5 text-rose-400/70" />
                Style & Settings
              </h3>
              <div className="space-y-3">
                {/* Style Presets */}
                <div>
                  <Label className="text-zinc-400 mb-3 block text-sm">Style</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {STYLE_PRESETS.map(style => {
                      const IconComponent = style.icon;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            selectedStyle === style.id
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                              : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <IconComponent className="w-5 h-5 mx-auto mb-1.5" />
                          <div className="text-xs">{style.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <Label className="text-zinc-400 mb-2 block text-sm">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white focus:ring-rose-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {ASPECT_RATIOS.map(ratio => (
                        <SelectItem
                          key={ratio.id}
                          value={ratio.id}
                          className="text-white hover:bg-zinc-800 focus:bg-zinc-800"
                        >
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cost Estimate & Generate Button */}
                <div className="space-y-3">
                  {/* Cost Estimate */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-sm">Estimated cost:</span>
                      <Badge
                        variant="outline"
                        className={`${
                          USE_CASES[selectedUseCase]?.costTier === 'economy' ? 'border-amber-500/30 text-amber-400' :
                          USE_CASES[selectedUseCase]?.costTier === 'premium' ? 'border-rose-500/30 text-rose-400' :
                          'border-zinc-500/30 text-zinc-400'
                        }`}
                      >
                        ${USE_CASES[selectedUseCase]?.estimatedCost?.toFixed(3) || '0.025'}
                      </Badge>
                    </div>
                    <span className="text-zinc-500 text-xs">
                      {USE_CASES[selectedUseCase]?.costTier === 'economy' ? '⚡ Fast & cheap' :
                       USE_CASES[selectedUseCase]?.costTier === 'premium' ? '✨ Highest quality' :
                       '🎯 Balanced'}
                    </span>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || (!USE_CASES[selectedUseCase]?.requiresReferenceImage && !prompt.trim()) || (USE_CASES[selectedUseCase]?.requiresReferenceImage && !selectedReferenceImage)}
                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 transition-all"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {isEnhancing ? 'Enhancing prompt...' : 'Generating image...'}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* History Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'Hide' : 'Show'} Generation History ({generationHistory.length})
              </Button>
            </motion.div>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Image className="w-5 h-5 text-rose-400/70" />
                  Preview
                </h3>
                {generatedImage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(generatedImage.url)}
                      className="border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerate}
                      className="border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div
                className={`aspect-square rounded-xl overflow-hidden border border-zinc-700/30 ${
                  !generatedImage && !isGenerating ? 'flex items-center justify-center bg-zinc-800/30' : ''
                }`}
              >
                {isGenerating ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800/30">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 text-rose-400 animate-spin" />
                      {isEnhancing && (
                        <Wand2 className="w-5 h-5 text-rose-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <p className="text-zinc-300 mt-4 font-medium">
                      {isEnhancing ? '🪄 AI is optimizing your prompt...' : '🎨 Generating your image...'}
                    </p>
                    <p className="text-zinc-500 text-sm mt-2">
                      {isEnhancing ? 'Transforming your idea into the perfect prompt' : 'This may take a moment'}
                    </p>
                  </div>
                ) : generatedImage ? (
                  <img
                    src={generatedImage.url}
                    alt="Generated"
                    className="w-full h-full object-contain bg-zinc-900 cursor-pointer"
                    onClick={() => setPreviewImage(generatedImage)}
                  />
                ) : (
                  <div className="text-center p-8">
                    <Image className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400">Your generated image will appear here</p>
                    <p className="text-zinc-500 text-sm mt-2">Enter a prompt and click Generate</p>
                  </div>
                )}
              </div>

              {/* AI Enhanced Prompt Display */}
              {generatedImage?.enhanced_prompt && (
                <div className="mt-4 p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-xl border border-zinc-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-4 h-4 text-rose-400" />
                    <Label className="text-rose-400 text-xs font-medium">AI-Enhanced Prompt</Label>
                    {generatedImage.ai_enhancement && !generatedImage.ai_enhancement.fallback && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        AI Optimized
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-200 text-sm leading-relaxed">{generatedImage.enhanced_prompt}</p>

                  {/* Style Tags */}
                  {generatedImage.ai_enhancement?.style_tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {generatedImage.ai_enhancement.style_tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-zinc-700/50 text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Composition Notes */}
                  {generatedImage.ai_enhancement?.composition_notes && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/30">
                      <p className="text-zinc-500 text-xs">
                        <span className="text-zinc-400">Composition:</span> {generatedImage.ai_enhancement.composition_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Generation History */}
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60"
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-rose-400/70" />
                  Recent Generations
                </h3>
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                  {generationHistory.map(item => (
                    <div
                      key={item.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-700/30 cursor-pointer hover:border-rose-500/50 transition-colors"
                      onClick={() => setPreviewImage(item)}
                    >
                      <img
                        src={item.thumbnail_url || item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerate(item);
                          }}
                          className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item.url, item.name);
                          }}
                          className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          <Download className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFromHistory(item.id);
                          }}
                          className="p-2 bg-zinc-800 rounded-lg hover:bg-red-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {generationHistory.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-zinc-500">
                      No images generated yet
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {previewImage?.name || 'Generated Image'}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img
                src={previewImage.url}
                alt="Preview"
                className="w-full rounded-xl"
              />
              {previewImage.generation_config?.prompt && (
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
                  <Label className="text-zinc-500 text-xs mb-1 block">Prompt:</Label>
                  <p className="text-zinc-300 text-sm">{previewImage.generation_config.prompt}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownload(previewImage.url, previewImage.name)}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleRegenerate(previewImage);
                    setPreviewImage(null);
                  }}
                  className="border-zinc-700/50 text-zinc-400 hover:bg-zinc-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Use Settings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
