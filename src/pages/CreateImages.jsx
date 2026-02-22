import React, { useState, useEffect } from 'react';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  ArrowLeft,
  Zap,
  Save,
  ChevronRight,
  BookmarkPlus,
  Hand,
} from 'lucide-react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreatePageTransition } from '@/components/create/ui';
import { CREATE_LIMITS } from '@/tokens/create';
import { toast } from 'sonner';
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
import { createPageUrl } from '@/utils';

// Credit cost per use case (maps to underlying model)
const USE_CASE_CREDITS = {
  product_variation: 8,   // flux-kontext-pro
  product_scene: 15,      // flux-kontext-max
  marketing_creative: 8,  // flux-pro
  quick_draft: 2,         // flux-schnell
  premium_quality: 15,    // flux-kontext-max
};

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
    color: 'yellow'
  },
};

const STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photo', icon: Camera },
  { id: 'illustration', label: 'Illustr.', icon: Paintbrush },
  { id: '3d_render', label: '3D', icon: Box },
  { id: 'digital_art', label: 'Digital', icon: Monitor },
  { id: 'watercolor', label: 'Water', icon: Droplets },
  { id: 'minimalist', label: 'Minimal', icon: Square },
  { id: 'vintage', label: 'Vintage', icon: Clock },
  { id: 'cinematic', label: 'Cinema', icon: Film },
  { id: 'luxury', label: 'Luxury', icon: Sparkles },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1024, height: 1024, shape: 'w-5 h-5' },
  { id: '16:9', label: '16:9', width: 1792, height: 1024, shape: 'w-7 h-4' },
  { id: '9:16', label: '9:16', width: 1024, height: 1792, shape: 'w-4 h-7' },
  { id: '4:3', label: '4:3', width: 1365, height: 1024, shape: 'w-6 h-5' },
  { id: '3:4', label: '3:4', width: 1024, height: 1365, shape: 'w-5 h-6' },
];

const SIZE_SCALE = [
  { value: 1, label: 'Tiny',       desc: 'Fingertip-sized (earring, ring, gemstone)', cm: '1-3cm', circle: 8 },
  { value: 2, label: 'Small',      desc: 'Fits in your palm (key, lighter, AirPods case)', cm: '4-7cm', circle: 16 },
  { value: 3, label: 'Hand-sized', desc: 'Size of a hand (phone, wallet, perfume bottle)', cm: '8-15cm', circle: 28 },
  { value: 4, label: 'Forearm',    desc: 'Forearm length (shoe, wine bottle, tablet)', cm: '20-35cm', circle: 44 },
  { value: 5, label: 'Large',      desc: 'Torso-sized (suitcase, backpack, side table)', cm: '40-80cm', circle: 64 },
  { value: 6, label: 'Very Large', desc: 'Human-sized or bigger (chair, guitar, floor lamp)', cm: '80cm+', circle: 88 },
];

const QUICK_SUGGESTIONS = [
  'Product on marble',
  'Lifestyle scene',
  'Social media post',
  'Marketing banner',
  'Luxury dark backdrop',
  'Jewelry close-up',
];

// Mode mapping: group old use cases into 3 modes
const MODES = [
  {
    id: 'product',
    label: 'Product Shot',
    description: 'Best for product photography with reference images',
    icon: Camera,
    useCases: ['product_variation', 'product_scene'],
    defaultUseCase: 'product_variation',
  },
  {
    id: 'marketing',
    label: 'Marketing Creative',
    description: 'Text-to-image for ads, social content & marketing',
    icon: Sparkles,
    useCases: ['marketing_creative', 'premium_quality'],
    defaultUseCase: 'marketing_creative',
  },
  {
    id: 'draft',
    label: 'Quick Draft',
    description: 'Fast generation for brainstorming & concepts',
    icon: Zap,
    useCases: ['quick_draft'],
    defaultUseCase: 'quick_draft',
  },
];

function getModeFromUseCase(useCaseId) {
  return MODES.find(m => m.useCases.includes(useCaseId)) || MODES[1];
}

export default function CreateImages({ embedded = false }) {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();
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
  const [showEnhancedPrompt, setShowEnhancedPrompt] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [productSizeScale, setProductSizeScale] = useState(3);
  const [productAnalysis, setProductAnalysis] = useState(null);
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);
  const selectedMode = getModeFromUseCase(selectedUseCase);

  const handleModeSelect = (mode) => {
    setSelectedUseCase(mode.defaultUseCase);
  };

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

  const loadProductImages = async (product) => {
    if (!product || product.type !== 'physical') {
      setProductImages([]);
      return;
    }
    setLoadingProductImages(true);
    try {
      const physicalProducts = await PhysicalProduct.filter({ product_id: product.id });
      const physicalDetails = physicalProducts?.[0];
      const images = [];
      if (product.featured_image?.url) {
        images.push(product.featured_image.url);
      }
      if (product.gallery && Array.isArray(product.gallery)) {
        product.gallery.forEach(img => {
          if (img.url && !images.includes(img.url)) images.push(img.url);
        });
      }
      if (physicalDetails?.images && Array.isArray(physicalDetails.images)) {
        physicalDetails.images.forEach(img => {
          const url = typeof img === 'string' ? img : img.url;
          if (url && !images.includes(url)) images.push(url);
        });
      }
      setProductImages(images);
      if (images.length > 0) setSelectedReferenceImage(images[0]);
    } catch (error) {
      console.error('Error loading product images:', error);
      setProductImages([]);
      setSelectedReferenceImage(null);
    } finally {
      setLoadingProductImages(false);
    }
  };

  const analyzeProduct = async (product) => {
    setIsAnalyzingProduct(true);
    setProductAnalysis(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const isPhysical = product.type === 'physical';
      const analysis = {
        type: isPhysical ? 'physical' : 'digital',
        summary: isPhysical
          ? `${product.name} is a physical product — best results with reference image editing and studio-style prompts.`
          : `${product.name} is a digital product/service — best results with abstract visuals, UI mockups, and conceptual imagery.`,
        suggestedStyles: isPhysical
          ? ['photorealistic', 'luxury', 'minimalist']
          : ['minimalist', '3d_render', 'cinematic'],
        suggestedPrompts: isPhysical
          ? [
              `${product.name} on a clean white marble surface`,
              `${product.name} in a lifestyle flat-lay scene`,
              `${product.name} with dramatic studio lighting`,
            ]
          : [
              `Abstract visualization representing ${product.name}`,
              `Modern marketing banner for ${product.name}`,
              `Conceptual digital art showcasing ${product.name}`,
            ],
        productTraits: isPhysical
          ? ['tangible', 'photographable', 'reference-image-ready']
          : ['conceptual', 'abstract-visual', 'text-to-image-optimized'],
      };
      setProductAnalysis(analysis);
    } catch (err) {
      console.warn('Product analysis failed:', err);
    } finally {
      setIsAnalyzingProduct(false);
    }
  };

  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setProductSearch('');
    if (product) {
      await loadProductImages(product);
      if (product.type === 'physical') {
        setSelectedUseCase('product_variation');
      } else {
        setSelectedUseCase('marketing_creative');
      }
      analyzeProduct(product);
    } else {
      setProductImages([]);
      setSelectedReferenceImage(null);
      setProductAnalysis(null);
    }
  };

  const hexToColorDescription = (hex) => {
    if (!hex) return null;
    const colorMap = {
      '#000': 'black', '#fff': 'white', '#f00': 'red', '#0f0': 'green', '#00f': 'blue',
      '#ff0': 'yellow', '#0ff': 'cyan', '#f0f': 'magenta',
    };
    const normalized = hex.toLowerCase().replace('#', '');
    for (const [key, value] of Object.entries(colorMap)) {
      if (key.replace('#', '') === normalized) return value;
    }
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
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;
    let intensity = '';
    if (lightness < 0.2) intensity = 'dark ';
    else if (lightness < 0.4) intensity = 'deep ';
    else if (lightness > 0.8) intensity = 'light ';
    else if (lightness > 0.6) intensity = 'soft ';
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
      luxury: 'luxury product photography, dark sophisticated backdrop, controlled reflections, dramatic lighting, aspirational premium aesthetic, negative space, editorial high-end feel',
    };
    return styleEnhancements[styleId] || '';
  };

  const getUseCaseEnhancements = (useCaseId, hasReferenceImage) => {
    if (hasReferenceImage) {
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
    let parts = [];
    if (hasReferenceImage) {
      if (prompt.trim()) parts.push(prompt.trim());
      parts.push(getUseCaseEnhancements(selectedUseCase, true));
    } else {
      if (prompt.trim()) parts.push(prompt.trim());
      if (selectedProduct) {
        parts.push(`featuring ${selectedProduct.name}`);
      }
    }
    const styleEnhancement = getStyleEnhancements(selectedStyle);
    if (styleEnhancement) parts.push(styleEnhancement);
    if (useBrandContext && brandAssets) {
      const colorDescriptions = [];
      if (brandAssets.colors?.primary) {
        const primaryColor = hexToColorDescription(brandAssets.colors.primary);
        if (primaryColor) colorDescriptions.push(primaryColor);
      }
      if (brandAssets.colors?.secondary) {
        const secondaryColor = hexToColorDescription(brandAssets.colors.secondary);
        if (secondaryColor && secondaryColor !== colorDescriptions[0]) colorDescriptions.push(secondaryColor);
      }
      if (colorDescriptions.length > 0) parts.push(`color palette featuring ${colorDescriptions.join(' and ')}`);
      if (brandAssets.visual_style?.mood) parts.push(`${brandAssets.visual_style.mood} atmosphere`);
    }
    if (!hasReferenceImage) {
      const useCaseEnhancement = getUseCaseEnhancements(selectedUseCase, false);
      if (useCaseEnhancement) parts.push(useCaseEnhancement);
    }
    if (selectedProduct && selectedProduct.type !== 'physical') {
      parts.push('abstract conceptual visualization, modern design, no physical product photography');
    }
    return parts.filter(p => p).join(', ');
  };

  const [aiEnhancedPrompt, setAiEnhancedPrompt] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleGenerate = async () => {
    const useCase = USE_CASES[selectedUseCase];
    if (!useCase.requiresReferenceImage && !prompt.trim()) {
      setPromptError('Please enter a prompt to generate an image');
      toast.error('Please enter a prompt');
      return;
    }
    if (useCase.requiresReferenceImage && !selectedReferenceImage) {
      toast.error('Please select a reference image for this use case');
      return;
    }
    setPromptError('');
    setIsGenerating(true);
    setIsEnhancing(true);
    setGeneratedImage(null);
    setAiEnhancedPrompt(null);
    try {
      let finalPrompt = prompt;
      let enhancementData = null;
      let wasEnhanced = false;
      try {
        toast.info('AI is enhancing your prompt...', { duration: 2000 });
        const enhanceRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-prompt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              prompt: prompt,
              use_case: selectedUseCase,
              style: selectedStyle,
              product_name: selectedProduct?.name,
              product_type: selectedProduct?.type,
              product_description: selectedProduct?.description || selectedProduct?.short_description,
              product_tags: selectedProduct?.tags,
              product_category: selectedProduct?.category,
              brand_mood: brandAssets?.visual_style?.mood,
              has_reference_image: !!selectedReferenceImage,
              product_size_scale: selectedProduct ? SIZE_SCALE[productSizeScale - 1] : null,
            }),
          }
        );
        const enhanceData = enhanceRes.ok ? await enhanceRes.json() : null;
        if (enhanceData?.enhanced_prompt) {
          finalPrompt = enhanceData.enhanced_prompt;
          enhancementData = enhanceData;
          wasEnhanced = true;
          setAiEnhancedPrompt(enhanceData);
        } else {
          finalPrompt = buildEnhancedPrompt();
        }
      } catch (enhanceErr) {
        console.warn('AI enhancement failed, using fallback:', enhanceErr);
        finalPrompt = buildEnhancedPrompt();
      }
      setIsEnhancing(false);
      const aspectConfig = ASPECT_RATIOS.find(a => a.id === aspectRatio);
      const isPhysicalProduct = selectedProduct?.type === 'physical';
      const genRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            use_case: selectedUseCase,
            reference_image_url: selectedReferenceImage,
            prompt: finalPrompt,
            original_prompt: prompt,
            prompt_enhanced: wasEnhanced,
            style: selectedStyle,
            aspect_ratio: aspectRatio,
            width: aspectConfig?.width || 1024,
            height: aspectConfig?.height || 1024,
            brand_context: useBrandContext ? brandAssets : null,
            product_context: selectedProduct ? { ...selectedProduct, type: selectedProduct.type, product_size_scale: SIZE_SCALE[productSizeScale - 1] } : null,
            product_images: isPhysicalProduct ? productImages : [],
            is_physical_product: isPhysicalProduct,
            company_id: user.company_id,
            user_id: user.id,
          }),
        }
      );
      if (!genRes.ok) {
        const errText = await genRes.text();
        throw new Error(`Image generation failed: ${errText}`);
      }
      const data = await genRes.json();
      if (data?.error) throw new Error(data.details || data.error);
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

  const handleSaveToLibrary = async () => {
    if (!generatedImage) return;
    toast.success('Image saved to library');
  };

  const handleUseAsReference = () => {
    if (!generatedImage) return;
    setSelectedReferenceImage(generatedImage.url);
    setSelectedUseCase('product_variation');
    toast.info('Image set as reference. Switch to Product Shot mode to use it.');
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const currentUseCase = USE_CASES[selectedUseCase];
  const isProductMode = selectedMode.id === 'product';

  const Wrapper = embedded ? React.Fragment : CreatePageTransition;

  return (
    <Wrapper>
      <div className={embedded ? '' : `min-h-screen ${ct('bg-slate-50', 'bg-[#09090b]')}`}>
        <div className="w-full px-4 lg:px-6 py-6 space-y-5">

          {/* 1. Back nav + Header row */}
          {!embedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href={createPageUrl('Create')}
                className={`flex items-center gap-1.5 text-sm ${ct('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Create Studio
              </a>
              <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-800')}`} />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Camera className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${ct('text-slate-900', 'text-white')} leading-tight`}>AI Image Generation</h1>
                  <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')}`}>FLUX Pro & Kontext</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={ct('p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200', 'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 rounded-full border transition-all ${
                  showHistory
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : ct('bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300', 'bg-zinc-900/50 border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700')
                }`}
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>
          )}

          {/* 6. Output Area */}
          <AnimatePresence>
            {(generatedImage || isGenerating) && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.4 }}
                className={`rounded-[20px] ${ct('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border overflow-hidden`}
              >
                {/* Image */}
                <div className={`relative aspect-auto max-h-[560px] flex items-center justify-center ${ct('bg-slate-50', 'bg-zinc-950')}`}>
                  {isGenerating ? (
                    <div className="py-24 flex flex-col items-center gap-3">
                      <div className="relative">
                        <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
                        {isEnhancing && (
                          <Wand2 className="w-4 h-4 text-yellow-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <p className={`text-sm ${ct('text-slate-600', 'text-zinc-300')} font-medium`}>
                        {isEnhancing ? 'AI is optimizing your prompt...' : 'Generating your image...'}
                      </p>
                      <p className={`text-xs ${ct('text-slate-400', 'text-zinc-600')}`}>This may take a moment</p>
                    </div>
                  ) : generatedImage ? (
                    <img
                      src={generatedImage.url}
                      alt="Generated"
                      className="w-full max-h-[560px] object-contain cursor-pointer"
                      onClick={() => setPreviewImage(generatedImage)}
                    />
                  ) : null}
                </div>

                {/* Action bar */}
                {generatedImage && (
                  <div className={`p-4 border-t ${ct('border-slate-100', 'border-zinc-800/40')} flex items-center justify-between`}>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDownload(generatedImage.url)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${ct('bg-slate-100 text-slate-700 hover:bg-slate-200', 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')} text-xs font-medium transition-colors`}
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={handleGenerate}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${ct('bg-slate-100 text-slate-700 hover:bg-slate-200', 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')} text-xs font-medium transition-colors`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                      <button
                        onClick={handleSaveToLibrary}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${ct('bg-slate-100 text-slate-700 hover:bg-slate-200', 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')} text-xs font-medium transition-colors`}
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" /> Save to Library
                      </button>
                      <button
                        onClick={handleUseAsReference}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${ct('bg-slate-100 text-slate-700 hover:bg-slate-200', 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')} text-xs font-medium transition-colors`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Use as Reference
                      </button>
                    </div>
                  </div>
                )}

                {/* Enhanced prompt collapsible */}
                {generatedImage?.enhanced_prompt && (
                  <div className={`border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}>
                    <button
                      onClick={() => setShowEnhancedPrompt(!showEnhancedPrompt)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-xs ${ct('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')} transition-colors`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Wand2 className="w-3 h-3 text-yellow-400" />
                        AI-Enhanced Prompt
                        {generatedImage.ai_enhancement && !generatedImage.ai_enhancement.fallback && (
                          <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px]">AI Optimized</span>
                        )}
                      </span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${showEnhancedPrompt ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showEnhancedPrompt && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <p className={`text-xs ${ct('text-slate-600', 'text-zinc-300')} leading-relaxed`}>{generatedImage.enhanced_prompt}</p>
                            {generatedImage.ai_enhancement?.style_tags?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {generatedImage.ai_enhancement.style_tags.map((tag, i) => (
                                  <span key={i} className={`px-2 py-0.5 text-[10px] rounded-full ${ct('bg-slate-100 text-slate-500', 'bg-zinc-800 text-zinc-500')}`}>{tag}</span>
                                ))}
                              </div>
                            )}
                            {generatedImage.ai_enhancement?.composition_notes && (
                              <p className={`mt-2 text-[10px] ${ct('text-slate-400', 'text-zinc-600')}`}>
                                Composition: {generatedImage.ai_enhancement.composition_notes}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when no generation yet */}
          {!generatedImage && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`rounded-[20px] border border-dashed ${ct('border-slate-200', 'border-zinc-800/60')} py-16 flex flex-col items-center justify-center`}
            >
              <Image className={`w-12 h-12 ${ct('text-slate-300', 'text-zinc-800')} mb-3`} />
              <p className={`${ct('text-slate-500', 'text-zinc-500')} text-sm`}>Your generated image will appear here</p>
              <p className={`${ct('text-slate-400', 'text-zinc-700')} text-xs mt-1`}>Enter a prompt and click Generate</p>
            </motion.div>
          )}

          {/* 2. Hero Prompt Area */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`rounded-[20px] ${ct('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border p-5 ${promptError ? 'ring-2 ring-red-500/50 border-red-500/30' : ''}`}
          >
            <Textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); if (promptError) setPromptError(''); }}
              placeholder="Describe the image you want to create..."
              className={`min-h-[80px] bg-transparent border-none ${ct('text-slate-900 placeholder:text-slate-400', 'text-white placeholder:text-zinc-600')} text-base focus:ring-0 focus-visible:ring-0 resize-none p-0 shadow-none`}
              maxLength={CREATE_LIMITS.PROMPT_MAX_LENGTH}
            />
            {promptError && (
              <p className="text-xs text-red-400 mt-1">{promptError}</p>
            )}
            <div className={`flex items-center justify-between mt-3 pt-3 border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => setPrompt(prev => prev ? `${prev}, ${chip.toLowerCase()}` : chip)}
                    className={`px-3 py-1 text-xs rounded-full ${ct('bg-slate-100 border-slate-200 text-slate-500', 'bg-zinc-800/60 border-zinc-700/40 text-zinc-400')} border hover:text-yellow-400 hover:border-yellow-500/30 transition-all`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <span className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')} flex-shrink-0 ml-3`}>{prompt.length}/{CREATE_LIMITS.PROMPT_MAX_LENGTH}</span>
            </div>
          </motion.div>

          {/* 3. Mode Selector */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-3 gap-3"
          >
            {MODES.map(mode => {
              const IconComp = mode.icon;
              const isSelected = selectedMode.id === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode)}
                  className={`relative rounded-[20px] p-4 text-left transition-all border ${
                    isSelected
                      ? 'bg-yellow-500/[0.03] border-yellow-500/30'
                      : ct('bg-white border-slate-200 hover:border-slate-300', 'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700')
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-yellow-500" />
                  )}
                  <IconComp className={`w-5 h-5 mb-2 ${isSelected ? 'text-yellow-400' : ct('text-slate-400', 'text-zinc-500')}`} />
                  <div className={`text-sm font-semibold ${isSelected ? ct('text-slate-900', 'text-white') : ct('text-slate-700', 'text-zinc-300')}`}>
                    {mode.label}
                  </div>
                  <div className={`text-[11px] ${ct('text-slate-500', 'text-zinc-500')} mt-0.5 leading-snug`}>{mode.description}</div>
                </button>
              );
            })}
          </motion.div>

          {/* 4. Settings Row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className={`rounded-[20px] ${ct('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border p-4`}
          >
            <div className="flex flex-wrap items-start gap-6">
              {/* Style swatches */}
              <div className="space-y-1.5">
                <Label className={`${ct('text-slate-500', 'text-zinc-500')} text-[11px] uppercase tracking-wider`}>Style</Label>
                <div className="flex gap-1.5">
                  {STYLE_PRESETS.map(style => {
                    const Ic = style.icon;
                    const isSel = selectedStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        title={style.label}
                        className={`p-2 rounded-lg transition-all ${
                          isSel
                            ? 'bg-yellow-500/10 ring-2 ring-yellow-500/40 text-yellow-400'
                            : ct('bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200', 'bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')
                        }`}
                      >
                        <Ic className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <Label className={`${ct('text-slate-500', 'text-zinc-500')} text-[11px] uppercase tracking-wider`}>Ratio</Label>
                <div className="flex gap-1.5">
                  {ASPECT_RATIOS.map(ratio => {
                    const isSel = aspectRatio === ratio.id;
                    return (
                      <button
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        title={ratio.label}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          isSel
                            ? 'bg-yellow-400 text-black'
                            : ct('bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200', 'bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')
                        }`}
                      >
                        <div className={`border-2 rounded-sm ${isSel ? 'border-black' : 'border-current'} ${ratio.shape}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product selector (product & fashion modes) */}
              <AnimatePresence>
                {isProductMode && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <Label className={`${ct('text-slate-500', 'text-zinc-500')} text-[11px] uppercase tracking-wider`}>Product</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ct('bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300', 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300 hover:border-zinc-600')} border text-sm transition-colors min-w-[160px]`}>
                          <Package className="w-3.5 h-3.5 text-yellow-400/70" />
                          <span className="truncate">{selectedProduct?.name || 'Select...'}</span>
                          <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className={`w-72 ${ct('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')} p-2`}>
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className={`w-full px-3 py-1.5 mb-2 ${ct('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} border rounded-lg text-xs focus:outline-none focus:border-yellow-500/30`}
                        />
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {selectedProduct && (
                            <button
                              onClick={() => handleProductSelect(null)}
                              className={`w-full text-left px-3 py-1.5 text-xs ${ct('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800')} rounded-lg flex items-center gap-2`}
                            >
                              <X className="w-3 h-3" /> Clear
                            </button>
                          )}
                          {filteredProducts.map(product => (
                            <button
                              key={product.id}
                              onClick={() => handleProductSelect(product)}
                              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between ${
                                selectedProduct?.id === product.id
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : ct('text-slate-900 hover:bg-slate-100', 'text-white hover:bg-zinc-800')
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <Package className="w-3.5 h-3.5 flex-shrink-0" />
                                {product.name}
                              </span>
                              {selectedProduct?.id === product.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                            </button>
                          ))}
                          {filteredProducts.length === 0 && (
                            <p className={`${ct('text-slate-500', 'text-zinc-500')} text-xs text-center py-3`}>No products found</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Product size scale (when product selected in product mode) */}
              {isProductMode && selectedProduct && (
                <div className="space-y-1.5">
                  <Label className={`${ct('text-slate-500', 'text-zinc-500')} text-[11px] uppercase tracking-wider`}>Size</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ct('bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300', 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300 hover:border-zinc-600')} border text-sm transition-colors`}>
                        <Hand className="w-3.5 h-3.5 text-yellow-400/70" />
                        <span>{SIZE_SCALE[productSizeScale - 1].label}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-80 ${ct('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')} p-0 overflow-hidden`} align="start">
                      {/* Header */}
                      <div className={`px-4 pt-3.5 pb-2.5 ${ct('bg-slate-50', 'bg-zinc-900')}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-yellow-400/10 flex items-center justify-center">
                              <Hand className="w-3.5 h-3.5 text-yellow-400" />
                            </div>
                            <span className={`text-xs font-semibold ${ct('text-slate-800', 'text-zinc-200')}`}>Product Scale</span>
                          </div>
                          <span className="text-[10px] font-mono font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">{SIZE_SCALE[productSizeScale - 1].cm}</span>
                        </div>
                      </div>

                      {/* Visual comparison: hand + circle */}
                      <div className={`px-4 py-5 ${ct('bg-white', 'bg-zinc-950/50')}`}>
                        <div className="relative h-24 flex items-center justify-center gap-4">
                          {/* Hand silhouette (fixed ~80px tall = reference) */}
                          <svg viewBox="0 0 56 90" className={`h-[80px] ${ct('text-slate-200', 'text-zinc-700/80')} flex-shrink-0`} fill="currentColor">
                            <path d="M28 2c-2 0-3.5 1.5-3.5 3.5V30h-3.5V10.5C21 8.5 19.5 7 17.5 7S14 8.5 14 10.5V32h-2.5V17c0-2-1.5-3.5-3.5-3.5S4.5 15 4.5 17v28c0 2.5.5 5 1.5 7l3 8.5c1.5 4 5 6.5 9 6.5h16c4.5 0 8.5-3 10-7.5l1-3c1-3 1.5-6.5 1.5-10V33c0-2-1.5-3.5-3.5-3.5S39.5 31 39.5 33v-1.5V5.5c0-2-1.5-3.5-3.5-3.5s-3.5 1.5-3.5 3.5V30h-1V5.5C31.5 3.5 30 2 28 2z"/>
                          </svg>
                          {/* Product circle (scales) */}
                          <motion.div
                            animate={{
                              width: SIZE_SCALE[productSizeScale - 1].circle,
                              height: SIZE_SCALE[productSizeScale - 1].circle,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className="rounded-full border-2 border-yellow-400/60 bg-yellow-400/10 flex-shrink-0"
                            style={{ boxShadow: '0 0 12px rgba(250,204,21,0.08)' }}
                          />
                        </div>
                      </div>

                      {/* Size selector pills */}
                      <div className={`px-3 pb-3 ${ct('bg-white', 'bg-zinc-900')}`}>
                        <div className="grid grid-cols-6 gap-1">
                          {SIZE_SCALE.map((size) => {
                            const isActive = productSizeScale === size.value;
                            return (
                              <button
                                key={size.value}
                                onClick={() => setProductSizeScale(size.value)}
                                className={`relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-center transition-all ${
                                  isActive
                                    ? 'bg-yellow-400/15 ring-1 ring-yellow-400/40'
                                    : ct('hover:bg-slate-50', 'hover:bg-zinc-800/60')
                                }`}
                              >
                                <span className={`text-[10px] font-semibold leading-none ${
                                  isActive ? 'text-yellow-400' : ct('text-slate-600', 'text-zinc-400')
                                }`}>{size.label}</span>
                                <span className={`text-[9px] leading-none ${
                                  isActive ? 'text-yellow-400/70' : ct('text-slate-400', 'text-zinc-600')
                                }`}>{size.cm}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Description */}
                        <div className={`mt-2.5 px-1.5 py-1.5 rounded-md ${ct('bg-slate-50', 'bg-zinc-800/40')}`}>
                          <p className={`text-[10px] leading-snug ${ct('text-slate-500', 'text-zinc-500')}`}>
                            <span className="text-yellow-400/80 font-medium">{SIZE_SCALE[productSizeScale - 1].label}</span> — {SIZE_SCALE[productSizeScale - 1].desc}
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Brand context toggle */}
              {brandAssets && (
                <div className="space-y-1.5">
                  <Label className={`${ct('text-slate-500', 'text-zinc-500')} text-[11px] uppercase tracking-wider`}>Brand</Label>
                  <button
                    onClick={() => setUseBrandContext(!useBrandContext)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                      useBrandContext
                        ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                        : ct('bg-slate-100 border border-slate-200 text-slate-500', 'bg-zinc-800/40 border border-zinc-700/40 text-zinc-500')
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    {useBrandContext ? 'On' : 'Off'}
                  </button>
                </div>
              )}
            </div>

            {/* Reference image area (product mode) */}
            <AnimatePresence>
              {isProductMode && selectedProduct?.type === 'physical' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mt-4 pt-4 border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">Product Preservation Mode</span>
                    <span className={`text-[10px] ${ct('text-slate-500', 'text-zinc-500')}`}>- Only background changes</span>
                  </div>
                  {loadingProductImages ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      <span className={`${ct('text-slate-500', 'text-zinc-400')} text-xs`}>Loading images...</span>
                    </div>
                  ) : productImages.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {productImages.slice(0, 8).map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedReferenceImage(imageUrl)}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                            selectedReferenceImage === imageUrl
                              ? 'border-yellow-500 ring-2 ring-yellow-500/20'
                              : ct('border-slate-200 hover:border-slate-400', 'border-zinc-700/50 hover:border-zinc-500')
                          }`}
                        >
                          <img src={imageUrl} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                          {selectedReferenceImage === imageUrl && (
                            <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-yellow-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-xs text-yellow-400/70">No reference images. Add images in Products page for best results.</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* Product Analysis Loading */}
          {isAnalyzingProduct && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl"
            >
              <div className="relative">
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-300">Understanding your product...</p>
                <p className="text-xs text-zinc-500">Analyzing characteristics for optimal image generation</p>
              </div>
            </motion.div>
          )}

          {/* Product Analysis Result */}
          {productAnalysis && !isAnalyzingProduct && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 space-y-3"
            >
              {/* Type indicator with icon */}
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  productAnalysis.type === 'physical'
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : 'bg-purple-500/10 border border-purple-500/20'
                }`}>
                  {productAnalysis.type === 'physical'
                    ? <Package className="w-3.5 h-3.5 text-blue-400" />
                    : <Monitor className="w-3.5 h-3.5 text-purple-400" />
                  }
                </div>
                <p className="text-xs font-medium text-zinc-300">{productAnalysis.summary}</p>
              </div>

              {/* Recommended Styles */}
              {productAnalysis.suggestedStyles?.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Recommended Styles</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {productAnalysis.suggestedStyles.map(styleId => {
                      const style = STYLE_PRESETS.find(s => s.id === styleId);
                      if (!style) return null;
                      return (
                        <button
                          key={styleId}
                          onClick={() => setSelectedStyle(styleId)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            selectedStyle === styleId
                              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                              : 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30 hover:border-zinc-500'
                          }`}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Prompts */}
              {productAnalysis.suggestedPrompts?.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Quick Prompts</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {productAnalysis.suggestedPrompts.slice(0, 3).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(suggestion)}
                        className="px-2.5 py-1 rounded-lg text-[11px] text-zinc-400 bg-zinc-700/30 border border-zinc-600/20 hover:border-zinc-500 hover:text-zinc-300 transition-all truncate max-w-[200px]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 5. Generate Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="flex items-center justify-center gap-3"
          >
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!currentUseCase?.requiresReferenceImage && !prompt.trim()) || (currentUseCase?.requiresReferenceImage && !selectedReferenceImage)}
              className={`bg-yellow-400 hover:bg-yellow-300 ${ct('disabled:bg-slate-200 disabled:text-slate-400', 'disabled:bg-zinc-800 disabled:text-zinc-600')} text-black font-bold rounded-full px-8 py-3 text-sm transition-all flex items-center gap-2 disabled:cursor-not-allowed`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEnhancing ? 'Enhancing prompt...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Image
                  <CreditCostBadge credits={USE_CASE_CREDITS[selectedUseCase] || 8} />
                </>
              )}
            </button>
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-1 rounded-full ${
                currentUseCase?.costTier === 'economy' ? ct('border-slate-200 text-slate-500', 'border-zinc-700 text-zinc-400') :
                currentUseCase?.costTier === 'premium' ? 'border-yellow-500/30 text-yellow-400' :
                ct('border-slate-200 text-slate-500', 'border-zinc-700 text-zinc-400')
              }`}
            >
              ~${currentUseCase?.estimatedCost?.toFixed(3) || '0.025'}
            </Badge>
          </motion.div>

        </div>

        {/* 7. History Drawer */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setShowHistory(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={`fixed top-0 right-0 bottom-0 w-full max-w-md ${ct('bg-white border-l border-slate-200', 'bg-zinc-950 border-l border-zinc-800/60')} z-50 flex flex-col`}
              >
                <div className={`p-4 border-b ${ct('border-slate-200', 'border-zinc-800/60')} flex items-center justify-between`}>
                  <h3 className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')} flex items-center gap-2`}>
                    <History className="w-4 h-4 text-yellow-400" />
                    Generation History
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`p-1.5 rounded-full ${ct('hover:bg-slate-100 text-slate-500 hover:text-slate-700', 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300')} transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {generationHistory.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group rounded-xl ${ct('bg-slate-50 border-slate-200', 'bg-zinc-900/60 border-zinc-800/40')} border overflow-hidden cursor-pointer hover:border-yellow-500/20 transition-colors`}
                      onClick={() => {
                        setPreviewImage(item);
                        setShowHistory(false);
                      }}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={item.thumbnail_url || item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2 gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRegenerate(item); }}
                            className="p-1.5 bg-zinc-900/80 rounded-md hover:bg-zinc-800"
                          >
                            <RefreshCw className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(item.url, item.name); }}
                            className="p-1.5 bg-zinc-900/80 rounded-md hover:bg-zinc-800"
                          >
                            <Download className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFromHistory(item.id); }}
                            className="p-1.5 bg-zinc-900/80 rounded-md hover:bg-red-900/80"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className={`text-[11px] ${ct('text-slate-500', 'text-zinc-400')} line-clamp-2 leading-snug`}>
                          {item.generation_config?.prompt || item.name}
                        </p>
                        <p className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')} mt-1`}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {generationHistory.length === 0 && (
                    <div className={`text-center py-12 ${ct('text-slate-400', 'text-zinc-600')} text-xs`}>No images generated yet</div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Image Preview Dialog */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className={`sm:max-w-4xl max-w-[calc(100vw-2rem)] ${ct('bg-white border-slate-200', 'bg-zinc-950 border-zinc-800')}`}>
            <DialogHeader>
              <DialogTitle className={`${ct('text-slate-900', 'text-white')} text-sm`}>
                {previewImage?.name || 'Generated Image'}
              </DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="space-y-3">
                <img src={previewImage.url} alt="Preview" className="w-full rounded-xl" />
                {previewImage.generation_config?.prompt && (
                  <div className={`p-3 ${ct('bg-slate-50 border-slate-200', 'bg-zinc-900/60 border-zinc-800/40')} rounded-xl border`}>
                    <Label className={`${ct('text-slate-400', 'text-zinc-600')} text-[10px] mb-1 block`}>Prompt</Label>
                    <p className={`${ct('text-slate-600', 'text-zinc-300')} text-xs`}>{previewImage.generation_config.prompt}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(previewImage.url, previewImage.name)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => { handleRegenerate(previewImage); setPreviewImage(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${ct('bg-slate-100 text-slate-700 hover:bg-slate-200', 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')} text-xs font-medium transition-colors`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Use Settings
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Wrapper>
  );
}
