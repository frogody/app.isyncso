import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product } from '@/api/entities';
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
  Copy,
  Trash2,
  ChevronDown,
  Settings2,
  History,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photorealistic', icon: '📷' },
  { id: 'illustration', label: 'Illustration', icon: '🎨' },
  { id: '3d_render', label: '3D Render', icon: '🧊' },
  { id: 'digital_art', label: 'Digital Art', icon: '💻' },
  { id: 'watercolor', label: 'Watercolor', icon: '🖌️' },
  { id: 'minimalist', label: 'Minimalist', icon: '◻️' },
  { id: 'vintage', label: 'Vintage', icon: '📼' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
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

  // Load products and brand assets
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

  const buildEnhancedPrompt = () => {
    let enhanced = prompt;

    // Add style context
    const style = STYLE_PRESETS.find(s => s.id === selectedStyle);
    if (style) {
      enhanced += ` Style: ${style.label}.`;
    }

    // Add brand context if enabled
    if (useBrandContext && brandAssets) {
      if (brandAssets.colors?.primary) {
        enhanced += ` Use brand colors: ${brandAssets.colors.primary}`;
        if (brandAssets.colors?.secondary) {
          enhanced += `, ${brandAssets.colors.secondary}`;
        }
        enhanced += '.';
      }
      if (brandAssets.visual_style?.mood) {
        enhanced += ` Mood: ${brandAssets.visual_style.mood}.`;
      }
    }

    // Add product context if selected
    if (selectedProduct) {
      enhanced += ` Product: ${selectedProduct.name}.`;
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
    setGeneratedImage(null);

    try {
      const enhancedPrompt = buildEnhancedPrompt();
      const aspectConfig = ASPECT_RATIOS.find(a => a.id === aspectRatio);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: enhancedPrompt,
          original_prompt: prompt,
          style: selectedStyle,
          aspect_ratio: aspectRatio,
          width: aspectConfig?.width || 1024,
          height: aspectConfig?.height || 1024,
          brand_context: useBrandContext ? brandAssets : null,
          product_context: selectedProduct,
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Save to generated_content
        const savedContent = await GeneratedContent.create({
          company_id: user.company_id,
          content_type: 'image',
          status: 'completed',
          name: `Generated Image - ${new Date().toLocaleString()}`,
          url: data.url,
          thumbnail_url: data.url,
          generation_config: {
            prompt: prompt,
            enhanced_prompt: enhancedPrompt,
            style: selectedStyle,
            aspect_ratio: aspectRatio,
            model: data.model || 'gemini-2.5-flash-image',
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
          enhanced_prompt: enhancedPrompt,
        });

        // Refresh history
        loadGenerationHistory();
        toast.success('Image generated successfully!');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
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
    toast.info('Settings loaded from history. Click Generate to create a new image.');
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Image className="w-6 h-6 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">AI Image Generation</h1>
          </div>
          <p className="text-slate-400">Generate images with AI, enhanced with your brand and product context</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Prompt Input */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-rose-400" />
                  Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="min-h-[120px] bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                    maxLength={1000}
                  />
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>{prompt.length}/1000 characters</span>
                    {brandAssets && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useBrandContext}
                          onChange={(e) => setUseBrandContext(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-800"
                        />
                        <Palette className="w-3 h-3" />
                        Apply brand context
                      </label>
                    )}
                  </div>
                </div>

                {/* Product Context Selector */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Product Context (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-800"
                      >
                        {selectedProduct ? (
                          <span className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {selectedProduct.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">Select a product...</span>
                        )}
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-slate-800 border-slate-700 p-2">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full px-3 py-2 mb-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                      />
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {selectedProduct && (
                          <button
                            onClick={() => {
                              setSelectedProduct(null);
                              setProductSearch('');
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 rounded flex items-center gap-2"
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
                            className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between ${
                              selectedProduct?.id === product.id
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'text-white hover:bg-slate-700'
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
                          <p className="text-slate-500 text-sm text-center py-4">No products found</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Style & Settings */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-rose-400" />
                  Style & Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Style Presets */}
                <div>
                  <Label className="text-slate-300 mb-3 block">Style</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {STYLE_PRESETS.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          selectedStyle === style.id
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                            : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="text-xl mb-1">{style.icon}</div>
                        <div className="text-xs">{style.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {ASPECT_RATIOS.map(ratio => (
                        <SelectItem
                          key={ratio.id}
                          value={ratio.id}
                          className="text-white hover:bg-slate-700"
                        >
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white"
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
                      Generate Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* History Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <History className="w-4 h-4 mr-2" />
              {showHistory ? 'Hide' : 'Show'} Generation History ({generationHistory.length})
            </Button>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-rose-400" />
                    Preview
                  </span>
                  {generatedImage && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(generatedImage.url)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerate}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`aspect-square rounded-lg overflow-hidden border border-slate-700 ${
                    !generatedImage && !isGenerating ? 'flex items-center justify-center bg-slate-900/50' : ''
                  }`}
                >
                  {isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
                      <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
                      <p className="text-slate-400">Creating your image...</p>
                      <p className="text-slate-500 text-sm mt-2">This may take a moment</p>
                    </div>
                  ) : generatedImage ? (
                    <img
                      src={generatedImage.url}
                      alt="Generated"
                      className="w-full h-full object-contain bg-slate-900"
                      onClick={() => setPreviewImage(generatedImage)}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <Image className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Your generated image will appear here</p>
                      <p className="text-slate-500 text-sm mt-2">Enter a prompt and click Generate</p>
                    </div>
                  )}
                </div>

                {/* Enhanced Prompt Display */}
                {generatedImage?.enhanced_prompt && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <Label className="text-slate-400 text-xs mb-1 block">Enhanced Prompt Used:</Label>
                    <p className="text-slate-300 text-sm">{generatedImage.enhanced_prompt}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation History */}
            {showHistory && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-rose-400" />
                    Recent Generations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                    {generationHistory.map(item => (
                      <div
                        key={item.id}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-rose-500/50 transition-colors"
                        onClick={() => setPreviewImage(item)}
                      >
                        <img
                          src={item.thumbnail_url || item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(item);
                            }}
                            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
                          >
                            <RefreshCw className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item.url, item.name);
                            }}
                            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
                          >
                            <Download className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFromHistory(item.id);
                            }}
                            className="p-2 bg-slate-800 rounded-lg hover:bg-red-900"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {generationHistory.length === 0 && (
                      <div className="col-span-3 text-center py-8 text-slate-500">
                        No images generated yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
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
                className="w-full rounded-lg"
              />
              {previewImage.generation_config?.prompt && (
                <div className="p-3 bg-slate-800 rounded-lg">
                  <Label className="text-slate-400 text-xs mb-1 block">Prompt:</Label>
                  <p className="text-slate-300 text-sm">{previewImage.generation_config.prompt}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownload(previewImage.url, previewImage.name)}
                  className="bg-rose-500 hover:bg-rose-600"
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
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
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
