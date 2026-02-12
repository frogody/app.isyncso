import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowLeft,
  Layers,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreatePageTransition } from '@/components/create/ui';
import { CREATE_LIMITS } from '@/tokens/create';
import { useTheme } from '@/contexts/GlobalThemeContext';
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
import { createPageUrl } from '@/utils';

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

const QUICK_SUGGESTIONS = [
  'Product showcase',
  'Talking head',
  'Cinematic intro',
  'Social ad',
  'Explainer',
];

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

// --- Product Selector Popover (reusable) ---
function ProductSelector({ selectedProduct, setSelectedProduct, products, productSearch, setProductSearch, filteredProducts }) {
  const { ct } = useTheme();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} text-sm ${ct('text-slate-600', 'text-zinc-300')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')} transition-colors`}>
          <Package className="w-3.5 h-3.5 text-yellow-400" />
          {selectedProduct ? selectedProduct.name : 'Product'}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={`w-72 ${ct('bg-white', 'bg-zinc-900')} ${ct('border-slate-200', 'border-zinc-700')} p-2`}>
        <input
          type="text"
          placeholder="Search products..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className={`w-full px-3 py-2 mb-2 ${ct('bg-slate-100', 'bg-zinc-800')} border ${ct('border-slate-200', 'border-zinc-700')} rounded-lg ${ct('text-slate-900', 'text-white')} text-sm focus:border-yellow-500/50 focus:ring-yellow-500/20 focus:outline-none`}
        />
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {selectedProduct && (
            <button
              onClick={() => { setSelectedProduct(null); setProductSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')} rounded-lg flex items-center gap-2`}
            >
              <X className="w-3 h-3" /> Clear selection
            </button>
          )}
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => { setSelectedProduct(product); setProductSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                selectedProduct?.id === product.id
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : `${ct('text-slate-900', 'text-white')} ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')}`
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
            <p className={`${ct('text-slate-500', 'text-zinc-500')} text-sm text-center py-4`}>No products found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function CreateVideos({ embedded = false }) {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();
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

  const [renderJob, setRenderJob] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [recentRenders, setRecentRenders] = useState([]);

  const [promptError, setPromptError] = useState('');
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

  useEffect(() => {
    if (!renderJob?.id || renderJob?.status === 'completed' || renderJob?.status === 'failed') return;
    let cancelled = false;
    let delay = 2000;
    const MAX_DELAY = 10000;

    const poll = async () => {
      if (cancelled) return;
      try {
        const updated = await RenderJob.get(renderJob.id);
        if (cancelled) return;
        setRenderJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          fetchRecentRenders();
          return;
        }
      } catch (e) {
        console.error('Failed to poll render job:', e);
      }
      delay = Math.min(delay * 1.5, MAX_DELAY);
      if (!cancelled) setTimeout(poll, delay);
    };

    const timer = setTimeout(poll, delay);
    return () => { cancelled = true; clearTimeout(timer); };
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
    if (style) enhanced += ` Style: ${style.label} video.`;
    const dur = DURATIONS.find(d => d.id === duration);
    if (dur) enhanced += ` Duration: ${dur.seconds} seconds.`;
    if (useBrandContext && brandAssets) {
      if (brandAssets.colors?.primary) {
        enhanced += ` Brand colors: ${brandAssets.colors.primary}`;
        if (brandAssets.colors?.secondary) enhanced += `, ${brandAssets.colors.secondary}`;
        enhanced += '.';
      }
      if (brandAssets.voice?.tone) enhanced += ` Tone: ${brandAssets.voice.tone}.`;
    }
    if (selectedProduct) {
      enhanced += ` Featuring product: ${selectedProduct.name}.`;
      if (selectedProduct.description) enhanced += ` ${selectedProduct.description.slice(0, 100)}.`;
    }
    return enhanced;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setPromptError('Please enter a prompt to generate a video');
      toast.error('Please enter a prompt');
      return;
    }
    setPromptError('');
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

  const durationConfig = DURATIONS.find(d => d.id === duration);

  const Wrapper = embedded ? React.Fragment : CreatePageTransition;

  return (
    <Wrapper>
      <div className={embedded ? '' : `min-h-screen ${ct('bg-slate-50', 'bg-[#09090b]')}`}>
        <div className="w-full px-4 lg:px-6 py-5 space-y-5">

          {/* ───── 1. Back Nav + Page Header ───── */}
          {!embedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href={createPageUrl('Create')}
                className={`flex items-center gap-1.5 text-sm ${ct('text-slate-500', 'text-zinc-500')} ${ct('hover:text-slate-700', 'hover:text-zinc-300')} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Create Studio
              </a>
              <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-800')}`} />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Clapperboard className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h1 className={`text-lg font-semibold ${ct('text-slate-900', 'text-white')} leading-tight`}>Cinematic Video Studio</h1>
                  <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')}`}>Kling v2.1 & Minimax</p>
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
                onClick={() => setShowHistory(true)}
                className={`p-2 rounded-full border ${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:text-slate-700', 'hover:text-zinc-200')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')} transition-colors`}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMode('templates')}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === 'templates'
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                    : `${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:text-slate-700', 'hover:text-zinc-200')} border ${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')}`
                }`}
              >
                Templates
              </button>
            </div>
          </div>
          )}

          {/* ───── 6. Output Area (moved above prompt) ───── */}
          {mode === 'ai' && (
            <AnimatePresence>
              {(isGenerating || generatedVideo) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} overflow-hidden`}
                >
                  <div className="aspect-video relative">
                    {isGenerating ? (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center ${ct('bg-slate-100/90', 'bg-zinc-950/80')}`}>
                        <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-3" />
                        <p className={`${ct('text-slate-500', 'text-zinc-400')} text-sm`}>Creating your video...</p>
                        <p className={`${ct('text-slate-400', 'text-zinc-600')} text-xs mt-1`}>This may take 1-3 minutes</p>
                        <div className={`w-40 h-1.5 ${ct('bg-slate-200', 'bg-zinc-800')} rounded-full mt-4 overflow-hidden`}>
                          <div className="h-full bg-yellow-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                        </div>
                      </div>
                    ) : generatedVideo ? (
                      <video
                        src={generatedVideo.url}
                        controls
                        className="w-full h-full object-contain bg-black"
                        poster={generatedVideo.thumbnail_url}
                      />
                    ) : null}
                  </div>

                  {generatedVideo && (
                    <div className={`p-4 border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-600', 'text-zinc-300')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                            <Clock className="w-3 h-3 mr-1" />
                            {generatedVideo.duration}s
                          </Badge>
                          <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-600', 'text-zinc-300')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                            {aspectRatio}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownload(generatedVideo.url)}
                            className={`p-2 rounded-full ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:text-slate-900', 'hover:text-white')} ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')} transition-colors`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleGenerate}
                            className={`p-2 rounded-full ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:text-slate-900', 'hover:text-white')} ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')} transition-colors`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {generatedVideo.enhanced_prompt && (
                        <details className="mt-3">
                          <summary className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} cursor-pointer ${ct('hover:text-slate-700', 'hover:text-zinc-400')} transition-colors`}>
                            Prompt details
                          </summary>
                          <p className={`text-xs ${ct('text-slate-500', 'text-zinc-400')} mt-2 p-2 ${ct('bg-slate-50', 'bg-zinc-800/50')} rounded-xl border ${ct('border-slate-200', 'border-zinc-700/50')}`}>
                            {generatedVideo.enhanced_prompt}
                          </p>
                        </details>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ───── 2. Hero Prompt Area (AI modes only) ───── */}
          {(mode === 'ai' || mode === 'studio') && mode === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} p-5 ${promptError ? 'ring-2 ring-red-500/50 border-red-500/30' : ''}`}
            >
              <Textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); if (promptError) setPromptError(''); }}
                placeholder="Describe your video scene..."
                className={`min-h-[100px] bg-transparent border-0 ${ct('text-slate-900', 'text-white')} text-base ${ct('placeholder:text-slate-400', 'placeholder:text-zinc-600')} focus:ring-0 focus-visible:ring-0 resize-none p-0`}
                maxLength={CREATE_LIMITS.PROMPT_MAX_LENGTH}
              />
              {promptError && (
                <p className="text-xs text-red-400 mt-1">{promptError}</p>
              )}
              <div className={`flex items-center justify-between mt-3 pt-3 border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setPrompt(prev => prev ? `${prev} ${s.toLowerCase()}` : s)}
                      className={`px-2.5 py-1 rounded-full text-xs ${ct('text-slate-500', 'text-zinc-500')} border ${ct('border-slate-200', 'border-zinc-800/60')} ${ct('hover:text-slate-700', 'hover:text-zinc-300')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')} transition-colors`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <span className={`text-xs ${ct('text-slate-400', 'text-zinc-600')}`}>{prompt.length}/{CREATE_LIMITS.PROMPT_MAX_LENGTH}</span>
              </div>
            </motion.div>
          )}

          {/* ───── 3. Mode Selector (2 cards) ───── */}
          {mode !== 'studio' && mode !== 'templates' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode('ai')}
                className={`text-left p-4 rounded-[20px] border transition-all ${
                  mode === 'ai'
                    ? 'border-yellow-500/30 bg-yellow-500/[0.03]'
                    : `${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')}`
                }`}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <Film className="w-5 h-5 text-yellow-400" />
                  <span className={`text-sm font-medium ${ct('text-slate-900', 'text-white')}`}>AI Video</span>
                </div>
                <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} mb-2`}>Single-shot video from a text prompt</p>
                <div className="flex gap-1.5">
                  {['Kling', 'Minimax', 'Luma'].map(m => (
                    <span key={m} className={`px-2 py-0.5 rounded-full text-[10px] ${ct('bg-slate-100', 'bg-zinc-800/80')} ${ct('text-slate-500', 'text-zinc-400')} border ${ct('border-slate-200', 'border-zinc-700/50')}`}>{m}</span>
                  ))}
                </div>
              </button>
              <button
                onClick={() => setMode('studio')}
                className={`text-left p-4 rounded-[20px] border transition-all ${
                  mode === 'studio'
                    ? 'border-yellow-500/30 bg-yellow-500/[0.03]'
                    : `${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')}`
                }`}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <Layers className="w-5 h-5 text-yellow-400" />
                  <span className={`text-sm font-medium ${ct('text-slate-900', 'text-white')}`}>AI Studio</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Pro</span>
                </div>
                <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')}`}>Multi-shot storyboard with automatic assembly</p>
              </button>
            </div>
          )}

          {/* Back button when in studio or templates mode */}
          {(mode === 'studio' || mode === 'templates') && (
            <button
              onClick={() => setMode('ai')}
              className={`flex items-center gap-1.5 text-sm ${ct('text-slate-500', 'text-zinc-500')} ${ct('hover:text-slate-700', 'hover:text-zinc-300')} transition-colors`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to modes
            </button>
          )}

          {/* ───── AI Studio Mode ───── */}
          {mode === 'studio' && (
            <StudioWizard
              products={products}
              brandAssets={brandAssets}
              onProjectCreated={() => {}}
            />
          )}

          {/* ───── 4. AI Video Settings Row ───── */}
          {mode === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="space-y-4"
            >
              {/* Settings Row */}
              <div className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} p-4 space-y-4`}>
                {/* Style */}
                <div>
                  <Label className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider mb-2.5 block`}>Style</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLE_PRESETS.map(style => {
                      const Icon = style.icon;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedStyle === style.id
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : `${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('text-slate-500', 'text-zinc-400')} border ${ct('border-slate-200', 'border-zinc-700/50')} ${ct('hover:text-slate-700', 'hover:text-zinc-200')} ${ct('hover:border-slate-300', 'hover:border-zinc-600')}`
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Duration */}
                  <div>
                    <Label className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider mb-2.5 block`}>Duration</Label>
                    <div className="flex gap-1.5">
                      {DURATIONS.map(dur => (
                        <button
                          key={dur.id}
                          onClick={() => setDuration(dur.id)}
                          className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all text-center ${
                            duration === dur.id
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : `${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('text-slate-500', 'text-zinc-400')} border ${ct('border-slate-200', 'border-zinc-700/50')} ${ct('hover:text-slate-700', 'hover:text-zinc-200')} ${ct('hover:border-slate-300', 'hover:border-zinc-600')}`
                          }`}
                        >
                          {dur.seconds}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <Label className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider mb-2.5 block`}>Aspect Ratio</Label>
                    <div className="flex gap-1.5">
                      {ASPECT_RATIOS.map(ratio => {
                        const Icon = ratio.icon;
                        return (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-center transition-all ${
                              aspectRatio === ratio.id
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                                : `${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('text-slate-500', 'text-zinc-400')} border ${ct('border-slate-200', 'border-zinc-700/50')} ${ct('hover:text-slate-700', 'hover:text-zinc-200')} ${ct('hover:border-slate-300', 'hover:border-zinc-600')}`
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[10px]">{ratio.sublabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Product + Brand */}
                  <div>
                    <Label className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider mb-2.5 block`}>Context</Label>
                    <div className="flex items-center gap-2">
                      <ProductSelector
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        products={products}
                        productSearch={productSearch}
                        setProductSearch={setProductSearch}
                        filteredProducts={filteredProducts}
                      />
                      {brandAssets && (
                        <label className={`flex items-center gap-1.5 cursor-pointer text-xs ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:text-slate-700', 'hover:text-zinc-300')} transition-colors`}>
                          <input
                            type="checkbox"
                            checked={useBrandContext}
                            onChange={(e) => setUseBrandContext(e.target.checked)}
                            className={`rounded ${ct('border-slate-300', 'border-zinc-600')} ${ct('bg-slate-100', 'bg-zinc-800')} text-yellow-500 focus:ring-yellow-500/20 w-3.5 h-3.5`}
                          />
                          <Palette className="w-3 h-3" />
                          Brand
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ───── 5. Generate Button ───── */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="px-8 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500 text-black font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Video
                    </>
                  )}
                </button>
                <span className={`text-xs ${ct('text-slate-400', 'text-zinc-600')}`}>
                  ~{durationConfig?.seconds || 10}s video &middot; est. 1-3 min
                </span>
              </div>
            </motion.div>
          )}

          {/* ───── 8. Templates Mode ───── */}
          {mode === 'templates' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              {/* Template Gallery */}
              <div>
                <Label className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider mb-3 block`}>Choose a Template</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`group relative p-3 rounded-[20px] border text-left transition-all ${
                        selectedTemplate === t.id
                          ? 'border-yellow-500/30 bg-yellow-500/[0.03]'
                          : `${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} ${ct('hover:border-slate-300', 'hover:border-zinc-700')}`
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                        selectedTemplate === t.id ? 'bg-yellow-500/20' : ct('bg-slate-100', 'bg-zinc-800/50')
                      }`}>
                        <Film className={`w-4 h-4 ${selectedTemplate === t.id ? 'text-yellow-400' : ct('text-slate-500', 'text-zinc-500')}`} />
                      </div>
                      <p className={`text-xs font-medium ${selectedTemplate === t.id ? ct('text-slate-900', 'text-white') : ct('text-slate-600', 'text-zinc-300')}`}>{t.label}</p>
                      <p className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')} mt-0.5 line-clamp-2`}>{t.description}</p>
                      <div className="flex gap-1 mt-2">
                        <span className={`text-[9px] ${ct('text-slate-400', 'text-zinc-600')} ${ct('bg-slate-50', 'bg-zinc-800/50')} px-1.5 py-0.5 rounded-full`}>{t.fps}fps</span>
                        <span className={`text-[9px] ${ct('text-slate-400', 'text-zinc-600')} ${ct('bg-slate-50', 'bg-zinc-800/50')} px-1.5 py-0.5 rounded-full`}>{(t.durationFrames / t.fps).toFixed(0)}s</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content row: Product + Analysis + Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Product & Content */}
                <div className="space-y-4">
                  <div className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} p-4 space-y-3`}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-yellow-400" />
                      <h3 className={`text-sm font-medium ${ct('text-slate-900', 'text-white')}`}>Content</h3>
                    </div>
                    <ProductSelector
                      selectedProduct={selectedProduct}
                      setSelectedProduct={setSelectedProduct}
                      products={products}
                      productSearch={productSearch}
                      setProductSearch={setProductSearch}
                      filteredProducts={filteredProducts}
                    />

                    {selectedProduct?.gallery?.length > 0 && (
                      <button
                        onClick={handleAnalyzeDesign}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-2 px-3 py-1.5 ${ct('hover:bg-slate-50', 'hover:bg-zinc-800/50')} border ${ct('border-slate-200', 'border-zinc-700/50')} rounded-full text-xs ${ct('text-slate-500', 'text-zinc-500')} transition-colors disabled:opacity-50`}
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

                    {/* Template data preview */}
                    <div className={`p-3 ${ct('bg-slate-50', 'bg-zinc-800/30')} rounded-xl border ${ct('border-slate-100', 'border-zinc-700/30')} space-y-1.5`}>
                      <div className={`flex items-center gap-1.5 text-[10px] ${ct('text-slate-400', 'text-zinc-600')} uppercase tracking-wider`}>
                        <Info className="w-3 h-3" />
                        Live data
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div>
                          <span className={ct('text-slate-400', 'text-zinc-600')}>Product:</span>
                          <span className={`${ct('text-slate-600', 'text-zinc-400')} ml-1`}>{templateProps.productName || templateProps.headline || '-'}</span>
                        </div>
                        <div>
                          <span className={ct('text-slate-400', 'text-zinc-600')}>Features:</span>
                          <span className={`${ct('text-slate-600', 'text-zinc-400')} ml-1`}>{templateProps.features?.length || 0}</span>
                        </div>
                        {templateProps.screenshots && (
                          <div>
                            <span className={ct('text-slate-400', 'text-zinc-600')}>Screenshots:</span>
                            <span className={`${ct('text-slate-600', 'text-zinc-400')} ml-1`}>{templateProps.screenshots.length}</span>
                          </div>
                        )}
                        <div className="col-span-2 flex items-center gap-1.5">
                          <span className={ct('text-slate-400', 'text-zinc-600')}>Brand:</span>
                          <div className="flex gap-0.5">
                            <div className="w-3 h-3 rounded" style={{ background: templateProps.brandColors?.primary || '#0f0f0f' }} />
                            <div className="w-3 h-3 rounded" style={{ background: templateProps.brandColors?.secondary || '#1a1a2e' }} />
                            <div className="w-3 h-3 rounded" style={{ background: templateProps.brandColors?.accent || '#06b6d4' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center + Right: Preview */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-yellow-400" />
                        <h3 className={`text-sm font-medium ${ct('text-slate-900', 'text-white')}`}>Live Preview</h3>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-500', 'text-zinc-500')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-[10px]`}>
                          {currentTemplateConfig.durationFrames} frames
                        </Badge>
                        <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-500', 'text-zinc-500')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-[10px]`}>
                          {currentTemplateConfig.width}x{currentTemplateConfig.height}
                        </Badge>
                      </div>
                    </div>

                    <div ref={playerContainerRef} className={`rounded-xl overflow-hidden border ${ct('border-slate-200', 'border-zinc-700/50')}`}>
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

                    <p className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')} mt-2`}>Click the player to play/pause.</p>
                  </div>

                  {/* Render Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleStartRender}
                      disabled={isRendering}
                      className="px-6 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors flex items-center gap-2"
                    >
                      {isRendering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rendering...
                        </>
                      ) : (
                        <>
                          <Film className="w-4 h-4" />
                          Render Video
                        </>
                      )}
                    </button>
                  </div>

                  {/* Recent Renders */}
                  {recentRenders.length > 0 && (
                    <div className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} p-4`}>
                      <h4 className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider mb-3`}>Recent Renders</h4>
                      <div className="space-y-1.5">
                        {recentRenders.map(job => (
                          <div key={job.id} className={`flex items-center justify-between p-2.5 ${ct('bg-slate-50', 'bg-zinc-800/30')} border ${ct('border-slate-100', 'border-zinc-700/30')} rounded-xl`}>
                            <div className="flex items-center gap-2.5">
                              <Film className={`w-3.5 h-3.5 ${ct('text-slate-500', 'text-zinc-500')}`} />
                              <div>
                                <p className={`text-xs ${ct('text-slate-900', 'text-white')}`}>{job.template_id}</p>
                                <p className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')}`}>{new Date(job.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                job.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                job.status === 'rendering' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-zinc-500/10 text-zinc-400'
                              }`}>
                                {job.status}
                              </span>
                              {job.status === 'completed' && job.output_url && (
                                <a href={job.output_url} download className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                  <Download className="w-3.5 h-3.5 text-yellow-400" />
                                </a>
                              )}
                              {job.status === 'completed' && !job.output_url && (
                                <span className="p-1" title="Simulated render">
                                  <Info className="w-3.5 h-3.5 text-blue-400" />
                                </span>
                              )}
                              {job.status === 'failed' && (
                                <button
                                  onClick={() => setRenderJob(job)}
                                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                  title={job.error_message || 'View error'}
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ───── 9. History Drawer ───── */}
          <AnimatePresence>
            {showHistory && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-40"
                  onClick={() => setShowHistory(false)}
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className={`fixed top-0 right-0 h-full w-full max-w-md ${ct('bg-white', 'bg-zinc-950')} border-l ${ct('border-slate-200', 'border-zinc-800/60')} z-50 flex flex-col`}
                >
                  <div className={`flex items-center justify-between p-4 border-b ${ct('border-slate-200', 'border-zinc-800/60')}`}>
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-yellow-400" />
                      <h2 className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')}`}>Generation History</h2>
                      <span className={`text-xs ${ct('text-slate-500', 'text-zinc-500')}`}>({generationHistory.length})</span>
                    </div>
                    <button
                      onClick={() => setShowHistory(false)}
                      className={`p-1.5 rounded-full ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')} ${ct('text-slate-500', 'text-zinc-400')} transition-colors`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {generationHistory.length === 0 && (
                      <div className={`text-center py-12 ${ct('text-slate-400', 'text-zinc-600')} text-sm`}>No videos generated yet</div>
                    )}
                    {generationHistory.map(item => (
                      <div
                        key={item.id}
                        className={`group rounded-[16px] border ${ct('border-slate-200', 'border-zinc-800/60')} ${ct('bg-white', 'bg-zinc-900/50')} overflow-hidden cursor-pointer ${ct('hover:border-slate-300', 'hover:border-zinc-700')} transition-colors`}
                        onClick={() => { setPreviewVideo(item); setShowHistory(false); }}
                      >
                        <div className="relative aspect-video">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full ${ct('bg-slate-100', 'bg-zinc-900')} flex items-center justify-center`}>
                              <Video className={`w-8 h-8 ${ct('text-slate-300', 'text-zinc-800')}`} />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] bg-black/70 text-white border ${ct('border-slate-200', 'border-white/10')}`}>
                              {item.duration || item.generation_config?.duration_seconds}s
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRegenerate(item); }}
                              className="p-2 bg-zinc-800/80 rounded-full hover:bg-zinc-700 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(item.url, item.name); }}
                              className="p-2 bg-zinc-800/80 rounded-full hover:bg-zinc-700 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFromHistory(item.id); }}
                              className="p-2 bg-zinc-800/80 rounded-full hover:bg-red-900 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className={`text-xs ${ct('text-slate-500', 'text-zinc-400')} line-clamp-1`}>{item.generation_config?.prompt || item.name}</p>
                          <div className="flex gap-1.5 mt-1.5">
                            <span className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')}`}>{item.generation_config?.style}</span>
                            <span className={`text-[10px] ${ct('text-slate-300', 'text-zinc-700')}`}>&middot;</span>
                            <span className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')}`}>{item.generation_config?.aspect_ratio}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>

        {/* Render Progress Modal */}
        <RenderProgressModal
          isOpen={!!renderJob}
          onClose={() => { setRenderJob(null); setIsRendering(false); }}
          job={renderJob}
          onRetry={handleRetryRender}
        />

        {/* Video Preview Dialog */}
        <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className={`sm:max-w-4xl max-w-[calc(100vw-2rem)] ${ct('bg-white', 'bg-zinc-900')} ${ct('border-slate-200', 'border-zinc-700')}`}>
            <DialogHeader>
              <DialogTitle className={ct('text-slate-900', 'text-white')}>
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-600', 'text-zinc-300')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                    <Clock className="w-3 h-3 mr-1" />
                    {previewVideo.duration || previewVideo.generation_config?.duration_seconds}s
                  </Badge>
                  <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-600', 'text-zinc-300')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                    {previewVideo.generation_config?.aspect_ratio || '16:9'}
                  </Badge>
                  <Badge variant="outline" className={`${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-600', 'text-zinc-300')} ${ct('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                    {previewVideo.generation_config?.style || 'cinematic'}
                  </Badge>
                </div>
                {previewVideo.generation_config?.prompt && (
                  <div className={`p-2 ${ct('bg-slate-50', 'bg-zinc-800/50')} rounded-xl border ${ct('border-slate-200', 'border-zinc-700/50')}`}>
                    <Label className={`${ct('text-slate-500', 'text-zinc-500')} text-[10px] mb-1 block`}>Prompt:</Label>
                    <p className={`${ct('text-slate-600', 'text-zinc-300')} text-xs`}>{previewVideo.generation_config.prompt}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(previewVideo.url, previewVideo.name)}
                    className="px-4 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => { handleRegenerate(previewVideo); setPreviewVideo(null); }}
                    className={`px-4 py-2 rounded-full border ${ct('border-slate-200', 'border-zinc-700')} ${ct('text-slate-600', 'text-zinc-300')} ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')} text-sm transition-colors flex items-center gap-2`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Use Settings
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
