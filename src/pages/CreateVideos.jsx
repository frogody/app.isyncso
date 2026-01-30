import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product } from '@/api/entities';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
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

export default function CreateVideos() {
  const { user } = useUser();
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

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          title="AI Video Generation"
          subtitle="Generate videos with AI, enhanced with your brand and product context"
          icon={Video}
          color="rose"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Prompt Input */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-5 h-5 text-rose-400" />
                <h3 className="text-white font-semibold">Prompt</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the video you want to generate..."
                    className="min-h-[120px] bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-rose-500/50 focus:ring-rose-500/20"
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
                          className="rounded border-zinc-600 bg-zinc-800 text-rose-500 focus:ring-rose-500/20"
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
                            <Package className="w-4 h-4 text-rose-400" />
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
                        className="w-full px-3 py-2 mb-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:border-rose-500/50 focus:ring-rose-500/20"
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
                                ? 'bg-rose-500/20 text-rose-400'
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
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="w-5 h-5 text-rose-400" />
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
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
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
                    <Clock className="w-4 h-4 text-rose-400" />
                    Duration
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DURATIONS.map(dur => (
                      <button
                        key={dur.id}
                        onClick={() => setDuration(dur.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          duration === dur.id
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
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
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
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
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white border-0 h-12"
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
          </motion.div>

          {/* Right Panel - Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {/* Video Preview */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-rose-400" />
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
                    <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
                    <p className="text-zinc-400">Creating your video...</p>
                    <p className="text-zinc-500 text-sm mt-2">This may take 1-3 minutes</p>
                    <div className="w-48 h-2 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
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

              {/* Video Info */}
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

              {/* Enhanced Prompt Display */}
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
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-rose-400" />
                  <h3 className="text-white font-semibold">Recent Generations</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {generationHistory.map(item => (
                    <div
                      key={item.id}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-700/50 cursor-pointer hover:border-rose-500/50 transition-colors"
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
          </motion.div>
        </div>

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
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 border-0"
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
    </div>
  );
}
