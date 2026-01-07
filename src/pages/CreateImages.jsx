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
      console.log(`Loaded ${images.length} reference images for product:`, product.name);
    } catch (error) {
      console.error('Error loading product images:', error);
      setProductImages([]);
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
    } else {
      setProductImages([]);
    }
  };

  const buildEnhancedPrompt = () => {
    let enhanced = prompt;
    const style = STYLE_PRESETS.find(s => s.id === selectedStyle);
    if (style) {
      enhanced += ` Style: ${style.label}.`;
    }
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

      // Determine if this is a physical product with reference images
      const isPhysicalProduct = selectedProduct?.type === 'physical';
      const hasReferenceImages = productImages.length > 0;

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: enhancedPrompt,
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
          // Pass product reference images for physical products
          product_images: isPhysicalProduct ? productImages : [],
          is_physical_product: isPhysicalProduct,
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
            enhanced_prompt: enhancedPrompt,
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
          enhanced_prompt: enhancedPrompt,
        });
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

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Image}
          title="AI Image Generation"
          subtitle="Generate images with AI, enhanced with your brand and product context"
          color="rose"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Prompt Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60"
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Wand2 className="w-5 h-5 text-rose-400/70" />
                Prompt
              </h3>
              <div className="space-y-4">
                <div>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="min-h-[120px] bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-rose-500/50 resize-none"
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
                  <Label className="text-zinc-400 mb-2 block text-sm">Product Context (Optional)</Label>
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
                        className="w-full px-3 py-2 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-rose-500/50"
                      />
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {selectedProduct && (
                          <button
                            onClick={() => handleProductSelect(null)}
                            className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                          >
                            <X className="w-3 h-3" />
                            Clear selection
                          </button>
                        )}
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
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
                          <p className="text-zinc-500 text-sm text-center py-4">No products found</p>
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
                      className="mt-4 space-y-3"
                    >
                      {/* Product Preservation Notice */}
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-400">Product Preservation Mode</p>
                            <p className="text-xs text-emerald-400/70 mt-1">
                              The AI will keep your product exactly as shown in the reference images. Only the background, lighting, and environment will change.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reference Images Grid */}
                      {loadingProductImages ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 text-rose-400 animate-spin mr-2" />
                          <span className="text-zinc-400 text-sm">Loading product images...</span>
                        </div>
                      ) : productImages.length > 0 ? (
                        <div>
                          <Label className="text-zinc-400 mb-2 block text-sm flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Reference Images ({productImages.length})
                          </Label>
                          <div className="grid grid-cols-4 gap-2">
                            {productImages.slice(0, 4).map((imageUrl, index) => (
                              <div
                                key={index}
                                className="aspect-square rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-800/50"
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Product reference ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-zinc-500 mt-2">
                            These images will be used as reference to ensure your product appears exactly the same in the generated image.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-400">No Reference Images</p>
                              <p className="text-xs text-amber-400/70 mt-1">
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
              className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60"
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-rose-400/70" />
                Style & Settings
              </h3>
              <div className="space-y-4">
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

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 transition-all"
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
                    <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
                    <p className="text-zinc-400">Creating your image...</p>
                    <p className="text-zinc-500 text-sm mt-2">This may take a moment</p>
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

              {/* Enhanced Prompt Display */}
              {generatedImage?.enhanced_prompt && (
                <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <Label className="text-zinc-500 text-xs mb-1 block">Enhanced Prompt Used:</Label>
                  <p className="text-zinc-300 text-sm">{generatedImage.enhanced_prompt}</p>
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
