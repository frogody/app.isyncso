import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product, DigitalProduct, RenderJob } from '@/api/entities';
import RenderProgressModal from '../components/video/RenderProgressModal';
import {
  Video,
  Wand2,
  Sparkles,
  Download,
  RefreshCw,
  Loader2,
  Package,
  X,
  Check,
  Play,
  Trash2,
  ChevronDown,
  Settings2,
  History,
  Palette,
  Clock,
  Film,
  FileVideo,
  Clapperboard,
  Megaphone,
  Lightbulb,
  Smartphone,
  Building2,
  Zap,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  Ratio,
  LayoutTemplate,
  Pause,
  Info,
  Eye,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreatePageTransition } from '@/components/create/ui';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/api/supabaseClient';
import { Player } from '@remotion/player';
import { ProductDemo } from '../remotion/compositions/ProductDemo';
import { SocialAd } from '../remotion/compositions/SocialAd';
import { FeatureShowcase } from '../remotion/compositions/FeatureShowcase';
import { ProductShowcase } from '../remotion/compositions/ProductShowcase';
import { UIShowcase } from '../remotion/compositions/UIShowcase';
import { KeynoteShowcase } from '../remotion/compositions/KeynoteShowcase';
import { analyzeScreenshots } from '../lib/screenshotAnalyzer';
import DesignAnalysisPanel from '../components/video/DesignAnalysisPanel';
import StudioWizard from '../components/video/StudioWizard';

const STYLE_PRESETS = [
  { id: 'cinematic', label: 'Cinematic', icon: Film },
  { id: 'documentary', label: 'Documentary', icon: FileVideo },
  { id: 'animated', label: 'Animated', icon: Clapperboard },
  { id: 'product_showcase', label: 'Product', icon: Package },
  { id: 'explainer', label: 'Explainer', icon: Lightbulb },
  { id: 'social_media', label: 'Social', icon: Smartphone },
  { id: 'corporate', label: 'Corporate', icon: Building2 },
  { id: 'creative', label: 'Creative', icon: Zap },
];

const DURATIONS = [
  { id: '5', label: '5 seconds', seconds: 5 },
  { id: '10', label: '10 seconds', seconds: 10 },
  { id: '15', label: '15 seconds', seconds: 15 },
  { id: '30', label: '30 seconds', seconds: 30 },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: 'Landscape', sublabel: '16:9', icon: RectangleHorizontal, width: 1920, height: 1080 },
  { id: '9:16', label: 'Portrait', sublabel: '9:16', icon: RectangleVertical, width: 1080, height: 1920 },
  { id: '1:1', label: 'Square', sublabel: '1:1', icon: Square, width: 1080, height: 1080 },
  { id: '4:5', label: 'Instagram', sublabel: '4:5', icon: Ratio, width: 1080, height: 1350 },
];

const TEMPLATES = [
  { id: 'ProductDemo', label: 'Product Demo', description: 'Showcase a product with features and CTA', durationFrames: 180, fps: 30, width: 1920, height: 1080 },
  { id: 'SocialAd', label: 'Social Ad', description: 'Fast-paced square ad for social media', durationFrames: 90, fps: 30, width: 1080, height: 1080 },
  { id: 'FeatureShowcase', label: 'Feature Showcase', description: 'Highlight multiple product features', durationFrames: 240, fps: 30, width: 1920, height: 1080 },
  { id: 'ProductShowcase', label: 'Product Showcase', description: 'Showcase your product with screenshots and features', durationFrames: 300, fps: 30, width: 1920, height: 1080 },
  { id: 'UIShowcase', label: 'UI Showcase', description: 'Animated UI based on your product design', durationFrames: 360, fps: 30, width: 1920, height: 1080 },
  { id: 'KeynoteShowcase', label: 'Keynote Showcase', description: 'Apple Keynote-style animated UI presentation', durationFrames: 360, fps: 30, width: 1920, height: 1080 },
];

const COMPONENT_MAP = {
  ProductDemo,
  SocialAd,
  FeatureShowcase,
  ProductShowcase,
  UIShowcase,
  KeynoteShowcase,
};

function getTemplateProps(templateId, selectedProduct, brandAssets, digitalProductData, designAnalysis) {
  const colors = designAnalysis?.colorPalette ? {
    primary: designAnalysis.colorPalette.primary,
    secondary: designAnalysis.colorPalette.secondary,
    accent: designAnalysis.colorPalette.accent,
  } : {
    primary: brandAssets?.colors?.primary || '#0f0f0f',
    secondary: brandAssets?.colors?.secondary || '#1a1a2e',
    accent: brandAssets?.colors?.accent || '#06b6d4',
  };

  const productName = selectedProduct?.name || 'Your Product';
  const productImage = selectedProduct?.featured_image?.url || 'https://placehold.co/800x600/1a1a2e/06b6d4?text=Product';

  const dpFeatures = digitalProductData?.features;

  switch (templateId) {
    case 'SocialAd':
      return {
        headline: productName,
        subheadline: selectedProduct?.tagline || selectedProduct?.short_description || selectedProduct?.description?.slice(0, 80) || 'An amazing product built for you',
        productImage,
        brandColors: colors,
        ctaText: 'Learn More',
      };
    case 'FeatureShowcase': {
      const featureSource = dpFeatures?.length ? dpFeatures : selectedProduct?.features;
      return {
        productName,
        features: featureSource?.length
          ? featureSource.slice(0, 4).map((f, i) => ({
              title: typeof f === 'string' ? f : (f.name || f.title || `Feature ${i + 1}`),
              description: typeof f === 'string' ? `Learn more about ${f}` : (f.description || ''),
              icon: (typeof f === 'object' && f.icon) || ['🚀', '📊', '👥', '🔗'][i] || '✨',
            }))
          : [
              { title: 'AI-Powered Automation', description: 'Automate repetitive tasks with AI agents.', icon: '🤖' },
              { title: 'Real-time Analytics', description: 'Get instant insights into performance.', icon: '📊' },
              { title: 'Team Collaboration', description: 'Work together seamlessly.', icon: '👥' },
              { title: 'Smart Integrations', description: 'Connect to 30+ tools.', icon: '🔗' },
            ],
        brandColors: colors,
        logoUrl: brandAssets?.logo_url || undefined,
      };
    }
    case 'ProductShowcase':
      return {
        productName,
        tagline: selectedProduct?.tagline || selectedProduct?.short_description || 'Built for modern teams',
        screenshots: selectedProduct?.gallery
          ?.map(img => typeof img === 'string' ? img : img?.url)
          .filter(Boolean) || [],
        features: dpFeatures?.length
          ? dpFeatures.slice(0, 4).map(f => ({
              title: f.name || f.title || 'Feature',
              description: f.description || '',
              icon: f.icon || 'Zap',
            }))
          : selectedProduct?.features?.length
            ? selectedProduct.features.slice(0, 4).map((f, i) => ({
                title: typeof f === 'string' ? f : (f.name || f.title || 'Feature'),
                description: typeof f === 'string' ? '' : (f.description || ''),
                icon: ['Zap', 'BarChart', 'Users', 'Link'][i] || 'Zap',
              }))
            : [
                { title: 'AI-Powered', description: 'Smart automation', icon: 'Zap' },
                { title: 'Analytics', description: 'Real-time insights', icon: 'BarChart' },
                { title: 'Collaboration', description: 'Work together', icon: 'Users' },
              ],
        brandColors: colors,
        ctaText: 'Get Started',
      };
    case 'UIShowcase':
      return {
        productName: selectedProduct?.name || 'Your Product',
        tagline: selectedProduct?.tagline || selectedProduct?.short_description || 'Built for modern teams',
        features: dpFeatures?.length
          ? dpFeatures.slice(0, 4).map(f => ({
              title: f.name || f.title || 'Feature',
              description: f.description || '',
              icon: f.icon || 'Zap',
            }))
          : selectedProduct?.features?.length
            ? selectedProduct.features.slice(0, 4).map((f, i) => ({
                title: typeof f === 'string' ? f : (f.name || f.title || 'Feature'),
                description: typeof f === 'string' ? '' : (f.description || ''),
                icon: ['Zap', 'BarChart', 'Users', 'Link'][i] || 'Zap',
              }))
            : [
                { title: 'AI-Powered', description: 'Smart automation', icon: 'Zap' },
                { title: 'Analytics', description: 'Real-time insights', icon: 'BarChart' },
                { title: 'Collaboration', description: 'Work together', icon: 'Users' },
              ],
        screenshots: selectedProduct?.gallery?.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean) || [],
        designAnalysis: designAnalysis || undefined,
      };
    case 'KeynoteShowcase':
      return {
        productName: selectedProduct?.name || 'Your Product',
        tagline: selectedProduct?.tagline || selectedProduct?.short_description || selectedProduct?.description?.slice(0, 80) || 'Built for modern teams',
        features: digitalProductData?.features?.map(f => ({
          title: f.name || f.title || 'Feature',
          description: f.description || '',
          icon: f.icon || '◆'
        })) || [],
        screenshots: selectedProduct?.gallery?.map(img => typeof img === 'string' ? img : img.url).filter(Boolean) || [],
        designAnalysis: designAnalysis || undefined,
      };
    case 'ProductDemo':
    default:
      return {
        productName,
        productDescription: selectedProduct?.tagline || selectedProduct?.short_description || selectedProduct?.description || 'An amazing product built for you',
        productImage,
        brandColors: colors,
        features: selectedProduct?.features?.length
          ? selectedProduct.features.slice(0, 4).map(f => typeof f === 'string' ? f : f.title || '')
          : ['AI-Powered Automation', 'Real-time Analytics', 'Team Collaboration', 'Smart Integrations'],
      };
  }
}

export default function CreateVideos() {
  const { user } = useUser();
  const [mode, setMode] = useState('ai');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [duration, setDuration] = useState('10');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [brandAssets, setBrandAssets] = useState(null);
  const [useBrandContext, setUseBrandContext] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);

  const [digitalProductData, setDigitalProductData] = useState(null);
  const [designAnalysis, setDesignAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Render queue state
  const [renderJob, setRenderJob] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [recentRenders, setRecentRenders] = useState([]);

  // Template mode state
  const [selectedTemplate, setSelectedTemplate] = useState('ProductDemo');
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [playerWidth, setPlayerWidth] = useState(0);

  useEffect(() => {
    if (user?.company_id) {
      loadProducts();
      loadBrandAssets();
      loadGenerationHistory();
    }
  }, [user?.company_id]);

  // Fetch digital product data when product changes
  useEffect(() => {
    if (!selectedProduct?.id) {
      setDigitalProductData(null);
      return;
    }
    (async () => {
      try {
        const data = await DigitalProduct.filter({ product_id: selectedProduct.id });
        setDigitalProductData(data?.[0] || null);
      } catch (e) {
        console.error('Error loading digital product data:', e);
        setDigitalProductData(null);
      }
    })();
  }, [selectedProduct?.id]);

  // Auto-analyze screenshots when product is selected
  useEffect(() => {
    if (!selectedProduct?.gallery?.length || mode !== 'templates') return;

    const urls = selectedProduct.gallery
      .map(img => typeof img === 'string' ? img : img.url)
      .filter(Boolean);

    if (urls.length === 0) return;

    setIsAnalyzing(true);
    analyzeScreenshots(urls, selectedProduct.name, {
      description: selectedProduct.description,
      tags: selectedProduct.tags,
      features: selectedProduct.features,
      aiContext: digitalProductData?.ai_context || {},
    })
      .then(analysis => setDesignAnalysis(analysis))
      .catch(e => console.error('Auto-analysis failed:', e))
      .finally(() => setIsAnalyzing(false));
  }, [selectedProduct?.id, mode]);

  // Measure player container width for responsive sizing
  useEffect(() => {
    if (mode !== 'templates') return;
    const el = playerContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPlayerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setPlayerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [mode]);

  const fetchRecentRenders = async () => {
    if (!user?.company_id) return;
    try {
      const jobs = await RenderJob.filter({ company_id: user.company_id });
      const sorted = (jobs || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
      setRecentRenders(sorted);
    } catch (e) {
      console.error('Failed to fetch recent renders:', e);
    }
  };

  useEffect(() => {
    if (user?.company_id) fetchRecentRenders();
  }, [user?.company_id]);

  // Poll active render job
  useEffect(() => {
    if (!renderJob?.id || renderJob?.status === 'completed' || renderJob?.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const updated = await RenderJob.get(renderJob.id);
        setRenderJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval);
          fetchRecentRenders();
        }
      } catch (e) {
        console.error('Failed to poll render job:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [renderJob?.id, renderJob?.status]);

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
        content_type: 'video'
      }, '-created_at', 20);
      setGenerationHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const buildEnhancedPrompt = () => {
    let enhanced = prompt;
    const style = STYLE_PRESETS.find(s => s.id === selectedStyle);
    if (style) {
      enhanced += ` Style: ${style.label} video.`;
    }
    const dur = DURATIONS.find(d => d.id === duration);
    if (dur) {
      enhanced += ` Duration: ${dur.seconds} seconds.`;
    }
    if (useBrandContext && brandAssets) {
      if (brandAssets.colors?.primary) {
        enhanced += ` Brand colors: ${brandAssets.colors.primary}`;
        if (brandAssets.colors?.secondary) {
          enhanced += `, ${brandAssets.colors.secondary}`;
        }
        enhanced += '.';
      }
      if (brandAssets.voice?.tone) {
        enhanced += ` Tone: ${brandAssets.voice.tone}.`;
      }
    }
    if (selectedProduct) {
      enhanced += ` Featuring product: ${selectedProduct.name}.`;
      if (selectedProduct.description) {
        enhanced += ` ${selectedProduct.description.slice(0, 100)}.`;
      }
    }
    return enhanced;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedVideo(null);

    try {
      const enhancedPrompt = buildEnhancedPrompt();
      const aspectConfig = ASPECT_RATIOS.find(a => a.id === aspectRatio);
      const durationConfig = DURATIONS.find(d => d.id === duration);

      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: enhancedPrompt,
          original_prompt: prompt,
          style: selectedStyle,
          duration_seconds: durationConfig?.seconds || 10,
          aspect_ratio: aspectRatio,
          width: aspectConfig?.width || 1920,
          height: aspectConfig?.height || 1080,
          brand_context: useBrandContext ? brandAssets : null,
          product_context: selectedProduct,
        }
      });

      if (error) throw error;

      if (data?.url) {
        const savedContent = await GeneratedContent.create({
          company_id: user.company_id,
          content_type: 'video',
          status: 'completed',
          name: `Generated Video - ${new Date().toLocaleString()}`,
          url: data.url,
          thumbnail_url: data.thumbnail_url || null,
          generation_config: {
            prompt: prompt,
            enhanced_prompt: enhancedPrompt,
            style: selectedStyle,
            aspect_ratio: aspectRatio,
            duration_seconds: durationConfig?.seconds,
            model: data.model || 'google-veo',
          },
          product_context: selectedProduct ? {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
          } : null,
          brand_context: useBrandContext && brandAssets ? {
            colors_used: brandAssets.colors,
            voice_applied: brandAssets.voice,
          } : null,
          dimensions: { width: aspectConfig?.width, height: aspectConfig?.height },
          duration: durationConfig?.seconds,
          created_by: user.id
        });

        setGeneratedVideo({
          url: data.url,
          thumbnail_url: data.thumbnail_url,
          id: savedContent.id,
          prompt: prompt,
          enhanced_prompt: enhancedPrompt,
          duration: durationConfig?.seconds
        });

        loadGenerationHistory();
        toast.success('Video generated successfully!');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (videoUrl, videoName = 'generated-video') => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoName}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Video downloaded');
    } catch (error) {
      toast.error('Failed to download video');
    }
  };

  const handleDeleteFromHistory = async (id) => {
    try {
      await GeneratedContent.delete(id);
      setGenerationHistory(prev => prev.filter(item => item.id !== id));
      toast.success('Video deleted');
    } catch (error) {
      toast.error('Failed to delete video');
    }
  };

  const handleRegenerate = (item) => {
    setPrompt(item.generation_config?.prompt || '');
    setSelectedStyle(item.generation_config?.style || 'cinematic');
    setDuration(String(item.generation_config?.duration_seconds || '10'));
    setAspectRatio(item.generation_config?.aspect_ratio || '16:9');
    setShowHistory(false);
    toast.info('Settings loaded from history. Click Generate to create a new video.');
  };

  const handleAnalyzeDesign = async () => {
    if (!selectedProduct?.gallery?.length) return;
    setIsAnalyzing(true);
    try {
      const screenshotUrls = selectedProduct.gallery
        .map(img => typeof img === 'string' ? img : img?.url)
        .filter(Boolean);
      const analysis = await analyzeScreenshots(screenshotUrls, selectedProduct.name, {
        description: selectedProduct.description,
        tags: selectedProduct.tags,
        features: selectedProduct.features,
        aiContext: digitalProductData?.ai_context || {},
      });
      setDesignAnalysis(analysis);
    } catch (e) {
      console.error('Design analysis failed:', e);
      toast.error('Design analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyColors = (colorPalette) => {
    setBrandAssets(prev => ({
      ...prev,
      colors: {
        ...prev?.colors,
        primary: colorPalette.primary,
        secondary: colorPalette.secondary,
        accent: colorPalette.accent,
      }
    }));
  };

  const handleStartRender = async () => {
    if (!user?.company_id) {
      toast.error('No company context');
      return;
    }

    const templateConfig = TEMPLATES.find(t => t.id === selectedTemplate);
    if (!templateConfig) return;

    try {
      setIsRendering(true);

      const props = getTemplateProps(selectedTemplate, selectedProduct, brandAssets, digitalProductData, designAnalysis);

      const job = await RenderJob.create({
        company_id: user.company_id,
        user_id: user.id,
        template_id: selectedTemplate,
        template_props: props,
        width: templateConfig.width,
        height: templateConfig.height,
        fps: templateConfig.fps,
        duration_frames: templateConfig.durationFrames,
        status: 'pending',
        progress: 0,
      });

      setRenderJob(job);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      fetch(`${supabaseUrl}/functions/v1/render-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(e => console.error('Failed to trigger render:', e));

    } catch (e) {
      console.error('Failed to start render:', e);
      toast.error('Failed to start render');
      setIsRendering(false);
    }
  };

  const handleRetryRender = () => {
    setRenderJob(null);
    setIsRendering(false);
    handleStartRender();
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const templateProps = getTemplateProps(selectedTemplate, selectedProduct, brandAssets, digitalProductData, designAnalysis);

  const currentTemplateConfig = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];
  const aspectRatioValue = currentTemplateConfig.height / currentTemplateConfig.width;
  const playerHeight = playerWidth ? Math.round(playerWidth * aspectRatioValue) : 0;
  const SelectedComponent = COMPONENT_MAP[selectedTemplate] || ProductDemo;

  return (
    <CreatePageTransition>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Video className="w-5 h-5 text-yellow-400" />
              </div>
              AI Video Generation
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Create videos with AI templates and cinematic generation</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 w-fit">
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'ai'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Generation
          </button>
          <button
            onClick={() => setMode('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'templates'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => setMode('studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'studio'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Clapperboard className="w-4 h-4" />
            AI Studio
          </button>
        </div>

        {mode === 'studio' ? (
          <StudioWizard
            products={products}
            brandAssets={brandAssets}
            onProjectCreated={() => {}}
          />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {mode === 'ai' ? (
              <>
                {/* Prompt Input */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Prompt</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the video you want to generate..."
                        className="min-h-[120px] bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-yellow-500/50 focus:ring-yellow-500/20"
                        maxLength={1000}
                      />
                      <div className="flex justify-between mt-2 text-xs text-zinc-500">
                        <span>{prompt.length}/1000 characters</span>
                        {brandAssets && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-400 transition-colors">
                            <input
                              type="checkbox"
                              checked={useBrandContext}
                              onChange={(e) => setUseBrandContext(e.target.checked)}
                              className="rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500/20"
                            />
                            <Palette className="w-3 h-3" />
                            Apply brand context
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Product Context Selector */}
                    <div>
                      <Label className="text-zinc-300 mb-2 block">Product Context (Optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-zinc-900/50 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600"
                          >
                            {selectedProduct ? (
                              <span className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-yellow-400" />
                                {selectedProduct.name}
                              </span>
                            ) : (
                              <span className="text-zinc-500">Select a product...</span>
                            )}
                            <ChevronDown className="w-4 h-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-zinc-900 border-zinc-700 p-2">
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full px-3 py-2 mb-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:border-yellow-500/50 focus:ring-yellow-500/20"
                          />
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {selectedProduct && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(null);
                                  setProductSearch('');
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded flex items-center gap-2"
                              >
                                <X className="w-3 h-3" />
                                Clear selection
                              </button>
                            )}
                            {filteredProducts.map(product => (
                              <button
                                key={product.id}
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setProductSearch('');
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between transition-colors ${
                                  selectedProduct?.id === product.id
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'text-white hover:bg-zinc-800'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  {product.name}
                                </span>
                                {selectedProduct?.id === product.id && <Check className="w-4 h-4" />}
                              </button>
                            ))}
                            {filteredProducts.length === 0 && (
                              <p className="text-zinc-500 text-sm text-center py-4">No products found</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Style & Settings */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Style & Settings</h3>
                  </div>
                  <div className="space-y-4">
                    {/* Style Presets */}
                    <div>
                      <Label className="text-zinc-300 mb-3 block">Style</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {STYLE_PRESETS.map(style => {
                          const IconComponent = style.icon;
                          return (
                            <button
                              key={style.id}
                              onClick={() => setSelectedStyle(style.id)}
                              className={`p-2 rounded-xl border text-center transition-all ${
                                selectedStyle === style.id
                                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                  : 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50'
                              }`}
                            >
                              <IconComponent className="w-4 h-4 mx-auto mb-1" />
                              <div className="text-[10px]">{style.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <Label className="text-zinc-300 mb-3 block flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        Duration
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {DURATIONS.map(dur => (
                          <button
                            key={dur.id}
                            onClick={() => setDuration(dur.id)}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              duration === dur.id
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                : 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50'
                            }`}
                          >
                            <div className="text-sm font-medium">{dur.seconds}s</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <Label className="text-zinc-300 mb-3 block">Aspect Ratio</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {ASPECT_RATIOS.map(ratio => {
                          const IconComponent = ratio.icon;
                          return (
                            <button
                              key={ratio.id}
                              onClick={() => setAspectRatio(ratio.id)}
                              className={`p-2 rounded-xl border text-center transition-all ${
                                aspectRatio === ratio.id
                                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                  : 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50'
                              }`}
                            >
                              <IconComponent className="w-4 h-4 mx-auto mb-1" />
                              <div className="text-[10px]">{ratio.label}</div>
                              <div className="text-[9px] text-zinc-500">{ratio.sublabel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-500 hover:from-yellow-600 hover:to-yellow-600 text-white border-0 h-12"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Video
                        </>
                      )}
                    </Button>

                    {isGenerating && (
                      <p className="text-center text-zinc-500 text-sm">
                        Video generation may take 1-3 minutes depending on duration
                      </p>
                    )}
                  </div>
                </div>

                {/* History Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                >
                  <History className="w-4 h-4 mr-2" />
                  {showHistory ? 'Hide' : 'Show'} Generation History ({generationHistory.length})
                </Button>
              </>
            ) : (
              /* Template Mode Controls */
              <>
                {/* Template Selector */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <LayoutTemplate className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Template</h3>
                  </div>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-700 text-white focus:ring-yellow-500/20 focus:border-yellow-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {TEMPLATES.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-white">
                          <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-yellow-400" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500 mt-2">{currentTemplateConfig.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-800/50 text-xs">
                      {currentTemplateConfig.fps} fps
                    </Badge>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-800/50 text-xs">
                      {(currentTemplateConfig.durationFrames / currentTemplateConfig.fps).toFixed(0)}s
                    </Badge>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-800/50 text-xs">
                      {currentTemplateConfig.width}×{currentTemplateConfig.height}
                    </Badge>
                  </div>
                </div>

                {/* Product & Brand Context for Templates */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Content</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-zinc-300 mb-2 block">Product</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-zinc-900/50 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600"
                          >
                            {selectedProduct ? (
                              <span className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-yellow-400" />
                                {selectedProduct.name}
                              </span>
                            ) : (
                              <span className="text-zinc-500">Select a product...</span>
                            )}
                            <ChevronDown className="w-4 h-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-zinc-900 border-zinc-700 p-2">
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full px-3 py-2 mb-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:border-yellow-500/50 focus:ring-yellow-500/20"
                          />
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {selectedProduct && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(null);
                                  setProductSearch('');
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded flex items-center gap-2"
                              >
                                <X className="w-3 h-3" />
                                Clear selection
                              </button>
                            )}
                            {filteredProducts.map(product => (
                              <button
                                key={product.id}
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setProductSearch('');
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between transition-colors ${
                                  selectedProduct?.id === product.id
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'text-white hover:bg-zinc-800'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  {product.name}
                                </span>
                                {selectedProduct?.id === product.id && <Check className="w-4 h-4" />}
                              </button>
                            ))}
                            {filteredProducts.length === 0 && (
                              <p className="text-zinc-500 text-sm text-center py-4">No products found</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Analyze Design Button (manual re-analyze) */}
                    {selectedProduct?.gallery?.length > 0 && (
                      <button
                        onClick={handleAnalyzeDesign}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs text-zinc-500 transition-colors disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-purple-400">Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            Re-analyze Design
                          </>
                        )}
                      </button>
                    )}

                    <DesignAnalysisPanel
                      analysis={designAnalysis}
                      isLoading={isAnalyzing}
                      onApplyColors={handleApplyColors}
                    />

                    {/* Live props preview */}
                    <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Info className="w-3 h-3" />
                        Template data (updates preview live)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedTemplate === 'SocialAd' ? (
                          <>
                            <div>
                              <span className="text-zinc-500">Headline:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.headline}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">CTA:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.ctaText}</span>
                            </div>
                          </>
                        ) : selectedTemplate === 'FeatureShowcase' ? (
                          <>
                            <div>
                              <span className="text-zinc-500">Product:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.productName}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Features:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.features?.length || 0}</span>
                            </div>
                          </>
                        ) : selectedTemplate === 'UIShowcase' ? (
                          <>
                            <div>
                              <span className="text-zinc-500">Product:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.productName}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Layout:</span>
                              <span className="text-zinc-300 ml-1">{designAnalysis?.layoutPattern || 'auto'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Screenshots:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.screenshots?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Features:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.features?.length || 0}</span>
                            </div>
                            {designAnalysis && (
                              <div className="col-span-2 flex items-center gap-2">
                                <span className="text-zinc-500">Vibe:</span>
                                <span className="text-zinc-300">{designAnalysis.overallVibe}</span>
                              </div>
                            )}
                          </>
                        ) : selectedTemplate === 'KeynoteShowcase' ? (
                          <>
                            <div>
                              <span className="text-zinc-500">Product:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.productName}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Layout:</span>
                              <span className="text-zinc-300 ml-1">{designAnalysis?.layoutPattern || 'auto'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Vibe:</span>
                              <span className="text-zinc-300 ml-1">{designAnalysis?.overallVibe || 'professional'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Features:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.features?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Metrics:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.metrics?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Screenshots:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.screenshots?.length || 0}</span>
                            </div>
                          </>
                        ) : selectedTemplate === 'ProductShowcase' ? (
                          <>
                            <div>
                              <span className="text-zinc-500">Product:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.productName}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Screenshots:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.screenshots?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Features:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.features?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">CTA:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.ctaText}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-zinc-500">Name:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.productName}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Features:</span>
                              <span className="text-zinc-300 ml-1">{templateProps.features?.length || 0}</span>
                            </div>
                          </>
                        )}
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="text-zinc-500">Brand:</span>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded" style={{ background: templateProps.brandColors?.primary || '#0f0f0f' }} />
                            <div className="w-4 h-4 rounded" style={{ background: templateProps.brandColors?.secondary || '#1a1a2e' }} />
                            <div className="w-4 h-4 rounded" style={{ background: templateProps.brandColors?.accent || '#06b6d4' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Render Button */}
                <Button
                  onClick={handleStartRender}
                  disabled={isRendering}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-500 hover:from-yellow-600 hover:to-yellow-600 text-white border-0 h-12 disabled:opacity-50"
                  size="lg"
                >
                  {isRendering ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <Film className="w-5 h-5 mr-2" />
                      Render Video
                    </>
                  )}
                </Button>

                {/* Recent Renders */}
                {recentRenders.length > 0 && (
                  <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Recent Renders</h4>
                    <div className="space-y-2">
                      {recentRenders.map(job => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Film className="w-4 h-4 text-zinc-500" />
                            <div>
                              <p className="text-sm text-white">{job.template_id}</p>
                              <p className="text-xs text-zinc-500">{new Date(job.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              job.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                              job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                              job.status === 'rendering' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-zinc-500/10 text-zinc-400'
                            }`}>
                              {job.status}
                            </span>
                            {job.status === 'completed' && job.output_url && (
                              <a href={job.output_url} download className="p-1 hover:bg-white/10 rounded transition-colors">
                                <Download className="w-4 h-4 text-yellow-400" />
                              </a>
                            )}
                            {job.status === 'completed' && !job.output_url && (
                              <span className="p-1" title="Simulated render — preview in player">
                                <Info className="w-4 h-4 text-blue-400" />
                              </span>
                            )}
                            {job.status === 'failed' && (
                              <button
                                onClick={() => { setRenderJob(job); }}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title={job.error_message || 'View error'}
                              >
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Right Panel - Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {mode === 'templates' ? (
              /* Template Preview with Remotion Player */
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Live Preview</h3>
                  </div>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-800/50 text-xs">
                    {currentTemplateConfig.durationFrames} frames · {currentTemplateConfig.fps}fps
                  </Badge>
                </div>

                <div ref={playerContainerRef} className="rounded-xl overflow-hidden border border-zinc-700/50">
                  {playerWidth > 0 && (
                    <Player
                      ref={playerRef}
                      component={SelectedComponent}
                      inputProps={templateProps}
                      durationInFrames={currentTemplateConfig.durationFrames}
                      compositionWidth={currentTemplateConfig.width}
                      compositionHeight={currentTemplateConfig.height}
                      fps={currentTemplateConfig.fps}
                      style={{ width: '100%', height: playerHeight }}
                      controls
                      autoPlay={false}
                      loop
                      clickToPlay
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <Info className="w-3 h-3" />
                  Click the player to play/pause. Controls are at the bottom.
                </div>
              </div>
            ) : (
              /* AI Generation Preview */
              <>
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-white font-semibold">Preview</h3>
                    </div>
                    {generatedVideo && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(generatedVideo.url)}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerate}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div
                    className={`aspect-video rounded-xl overflow-hidden border border-zinc-700/50 ${
                      !generatedVideo && !isGenerating ? 'flex items-center justify-center bg-zinc-900/70' : ''
                    }`}
                  >
                    {isGenerating ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/70">
                        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
                        <p className="text-zinc-400">Creating your video...</p>
                        <p className="text-zinc-500 text-sm mt-2">This may take 1-3 minutes</p>
                        <div className="w-48 h-2 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    ) : generatedVideo ? (
                      <video
                        src={generatedVideo.url}
                        controls
                        className="w-full h-full object-contain bg-black"
                        poster={generatedVideo.thumbnail_url}
                      />
                    ) : (
                      <div className="text-center p-8">
                        <Video className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-400">Your generated video will appear here</p>
                        <p className="text-zinc-500 text-sm mt-2">Enter a prompt and click Generate</p>
                      </div>
                    )}
                  </div>

                  {generatedVideo && (
                    <div className="mt-4 flex items-center gap-3">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
                        <Clock className="w-3 h-3 mr-1" />
                        {generatedVideo.duration}s
                      </Badge>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
                        {aspectRatio}
                      </Badge>
                    </div>
                  )}

                  {generatedVideo?.enhanced_prompt && (
                    <div className="mt-3 p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                      <Label className="text-zinc-500 text-[10px] mb-1 block">Enhanced Prompt Used:</Label>
                      <p className="text-zinc-300 text-xs">{generatedVideo.enhanced_prompt}</p>
                    </div>
                  )}
                </div>

                {/* Generation History */}
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <History className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-white font-semibold">Recent Generations</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                      {generationHistory.map(item => (
                        <div
                          key={item.id}
                          className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-700/50 cursor-pointer hover:border-yellow-500/50 transition-colors"
                          onClick={() => setPreviewVideo(item)}
                        >
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                              <Video className="w-8 h-8 text-zinc-700" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2">
                            <Badge className="bg-black/70 text-white text-xs border-0">
                              <Clock className="w-3 h-3 mr-1" />
                              {item.duration || item.generation_config?.duration_seconds}s
                            </Badge>
                          </div>
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
                        <div className="col-span-2 text-center py-8 text-zinc-500">
                          No videos generated yet
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </div>
        )}

        <RenderProgressModal
          isOpen={!!renderJob}
          onClose={() => { setRenderJob(null); setIsRendering(false); }}
          job={renderJob}
          onRetry={handleRetryRender}
        />

        {/* Video Preview Dialog */}
        <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {previewVideo?.name || 'Generated Video'}
              </DialogTitle>
            </DialogHeader>
            {previewVideo && (
              <div className="space-y-4">
                <video
                  src={previewVideo.url}
                  controls
                  autoPlay
                  className="w-full rounded-xl"
                  poster={previewVideo.thumbnail_url}
                />
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
                    <Clock className="w-3 h-3 mr-1" />
                    {previewVideo.duration || previewVideo.generation_config?.duration_seconds}s
                  </Badge>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
                    {previewVideo.generation_config?.aspect_ratio || '16:9'}
                  </Badge>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
                    {previewVideo.generation_config?.style || 'cinematic'}
                  </Badge>
                </div>
                {previewVideo.generation_config?.prompt && (
                  <div className="p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <Label className="text-zinc-500 text-[10px] mb-1 block">Prompt:</Label>
                    <p className="text-zinc-300 text-xs">{previewVideo.generation_config.prompt}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownload(previewVideo.url, previewVideo.name)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-500 hover:from-yellow-600 hover:to-yellow-600 border-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleRegenerate(previewVideo);
                      setPreviewVideo(null);
                    }}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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
    </CreatePageTransition>
  );
}
