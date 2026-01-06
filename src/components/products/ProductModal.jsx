import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product, DigitalProduct, PhysicalProduct, ProductCategory } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';
import {
  Loader2, Cloud, Package, Save, Image as ImageIcon, Tags, DollarSign, Settings,
  FileText, Globe, Truck, BarChart3, ChevronRight, Plus, X, Upload, Barcode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductImageUploader from './ProductImageUploader';
import BarcodeDisplay from './BarcodeDisplay';

const PRODUCT_STATUSES = [
  { value: 'draft', label: 'Draft', description: 'Not visible to customers' },
  { value: 'published', label: 'Published', description: 'Visible and available' },
  { value: 'archived', label: 'Archived', description: 'Hidden from listings' },
];

const PRICING_MODELS = [
  { value: 'free', label: 'Free' },
  { value: 'one_time', label: 'One-time Purchase' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'usage_based', label: 'Usage-based' },
  { value: 'freemium', label: 'Freemium' },
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'lifetime', label: 'Lifetime' },
];

export default function ProductModal({
  open,
  onClose,
  productType = 'digital', // 'digital' or 'physical'
  product = null, // null for new, object for edit
  onSave
}) {
  const { user } = useUser();
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [categories, setCategories] = useState([]);

  // Base product fields
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    description: '',
    short_description: '',
    category: '',
    category_id: '',
    status: 'draft',
    tags: [],
    featured_image: null,
    gallery: [],
    seo_meta_title: '',
    seo_meta_description: '',
    seo_keywords: [],
  });

  // Digital product specific fields
  const [digitalData, setDigitalData] = useState({
    pricing_model: 'subscription',
    billing_cycles: ['monthly', 'yearly'],
    packages: [],
    trial_available: false,
    trial_days: 14,
    demo_url: '',
    documentation_url: '',
    features: [],
    integrations: [],
  });

  // Physical product specific fields
  const [physicalData, setPhysicalData] = useState({
    sku: '',
    barcode: '',
    mpn: '',
    specifications: [],
    pricing: {
      base_price: '',
      compare_at_price: '',
      cost_price: '',
      currency: 'USD',
    },
    inventory: {
      track_quantity: true,
      quantity: 0,
      low_stock_threshold: 5,
    },
    shipping: {
      weight: '',
      weight_unit: 'kg',
      dimensions: { length: '', width: '', height: '' },
      requires_shipping: true,
    },
    country_of_origin: '',
  });

  const [newTag, setNewTag] = useState('');
  const [newFeature, setNewFeature] = useState('');

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await ProductCategory.filter(
          { product_type: productType === 'digital' ? 'digital' : 'physical' },
          { limit: 50 }
        );
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        console.warn('Failed to load categories:', e);
      }
    };
    if (open) {
      loadCategories();
    }
  }, [open, productType]);

  // Populate form for edit mode
  useEffect(() => {
    if (product && open) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        tagline: product.tagline || '',
        description: product.description || '',
        short_description: product.short_description || '',
        category: product.category || '',
        category_id: product.category_id || '',
        status: product.status || 'draft',
        tags: product.tags || [],
        featured_image: product.featured_image || null,
        gallery: product.gallery || [],
        seo_meta_title: product.seo_meta_title || '',
        seo_meta_description: product.seo_meta_description || '',
        seo_keywords: product.seo_keywords || [],
      });

      if (productType === 'digital' && product.digitalDetails) {
        setDigitalData({
          pricing_model: product.digitalDetails.pricing_model || 'subscription',
          billing_cycles: product.digitalDetails.billing_cycles || ['monthly', 'yearly'],
          packages: product.digitalDetails.packages || [],
          trial_available: product.digitalDetails.trial_available || false,
          trial_days: product.digitalDetails.trial_days || 14,
          demo_url: product.digitalDetails.demo_url || '',
          documentation_url: product.digitalDetails.documentation_url || '',
          features: product.digitalDetails.features || [],
          integrations: product.digitalDetails.integrations || [],
        });
      }

      if (productType === 'physical' && product.physicalDetails) {
        setPhysicalData({
          sku: product.physicalDetails.sku || '',
          barcode: product.physicalDetails.barcode || '',
          mpn: product.physicalDetails.mpn || '',
          specifications: product.physicalDetails.specifications || [],
          pricing: product.physicalDetails.pricing || {
            base_price: '',
            compare_at_price: '',
            cost_price: '',
            currency: 'USD',
          },
          inventory: product.physicalDetails.inventory || {
            track_quantity: true,
            quantity: 0,
            low_stock_threshold: 5,
          },
          shipping: product.physicalDetails.shipping || {
            weight: '',
            weight_unit: 'kg',
            dimensions: { length: '', width: '', height: '' },
            requires_shipping: true,
          },
          country_of_origin: product.physicalDetails.country_of_origin || '',
        });
      }
    } else if (!product && open) {
      // Reset form for new product
      setFormData({
        name: '',
        slug: '',
        tagline: '',
        description: '',
        short_description: '',
        category: '',
        category_id: '',
        status: 'draft',
        tags: [],
        featured_image: null,
        gallery: [],
        seo_meta_title: '',
        seo_meta_description: '',
        seo_keywords: [],
      });
      setDigitalData({
        pricing_model: 'subscription',
        billing_cycles: ['monthly', 'yearly'],
        packages: [],
        trial_available: false,
        trial_days: 14,
        demo_url: '',
        documentation_url: '',
        features: [],
        integrations: [],
      });
      setPhysicalData({
        sku: '',
        barcode: '',
        mpn: '',
        specifications: [],
        pricing: {
          base_price: '',
          compare_at_price: '',
          cost_price: '',
          currency: 'USD',
        },
        inventory: {
          track_quantity: true,
          quantity: 0,
          low_stock_threshold: 5,
        },
        shipping: {
          weight: '',
          weight_unit: 'kg',
          dimensions: { length: '', width: '', height: '' },
          requires_shipping: true,
        },
        country_of_origin: '',
      });
      setActiveTab('basic');
    }
  }, [product, open, productType]);

  // Auto-generate slug from name
  const handleNameChange = (value) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: prev.slug || value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setDigitalData(prev => ({
        ...prev,
        features: [...prev.features, { title: newFeature.trim(), description: '' }]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setDigitalData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Product slug is required');
      return;
    }

    if (productType === 'physical' && !physicalData.sku.trim()) {
      toast.error('SKU is required for physical products');
      return;
    }

    if (!isEdit && !user?.company_id) {
      toast.error('Unable to create product: company not found');
      return;
    }

    setLoading(true);
    try {
      // Prepare base product data - clean up empty strings for UUID/nullable fields
      const productPayload = {
        name: formData.name,
        slug: formData.slug,
        type: productType,
        status: formData.status || 'draft',
        company_id: user?.company_id,
        tagline: formData.tagline || null,
        description: formData.description || null,
        short_description: formData.short_description || null,
        category: formData.category || null,
        category_id: formData.category_id || null, // Convert empty string to null for UUID
        tags: formData.tags?.length > 0 ? formData.tags : null,
        featured_image: formData.featured_image || null,
        gallery: formData.gallery?.length > 0 ? formData.gallery : [],
        seo_meta_title: formData.seo_meta_title || null,
        seo_meta_description: formData.seo_meta_description || null,
        seo_keywords: formData.seo_keywords?.length > 0 ? formData.seo_keywords : null,
      };

      let savedProduct;
      if (isEdit) {
        savedProduct = await Product.update(product.id, productPayload);
      } else {
        savedProduct = await Product.create(productPayload);
      }

      // Save type-specific data
      if (productType === 'digital') {
        const digitalPayload = {
          ...digitalData,
          product_id: savedProduct.id,
        };
        if (isEdit) {
          await DigitalProduct.update(savedProduct.id, digitalPayload);
        } else {
          await DigitalProduct.create(digitalPayload);
        }
      } else {
        const physicalPayload = {
          ...physicalData,
          product_id: savedProduct.id,
        };
        if (isEdit) {
          await PhysicalProduct.update(savedProduct.id, physicalPayload);
        } else {
          await PhysicalProduct.create(physicalPayload);
        }
      }

      toast.success(isEdit ? 'Product updated successfully!' : 'Product created successfully!');
      onSave?.(savedProduct);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      // Try to extract meaningful error message
      const errorMsg = error?.message || error?.error?.message || error?.details || 'Failed to save product';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const themeColor = productType === 'digital' ? 'cyan' : 'amber';
  const ThemeIcon = productType === 'digital' ? Cloud : Package;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white text-xl flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              productType === 'digital'
                ? "bg-gradient-to-br from-cyan-500 to-cyan-600"
                : "bg-gradient-to-br from-amber-500 to-amber-600"
            )}>
              <ThemeIcon className="w-5 h-5 text-white" />
            </div>
            {isEdit ? 'Edit' : 'New'} {productType === 'digital' ? 'Digital' : 'Physical'} Product
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isEdit ? 'Update your product information' : 'Add a new product to your catalog'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 bg-zinc-800/50 border border-white/5 p-1">
            <TabsTrigger value="basic" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" /> Basic Info
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
              <ImageIcon className="w-4 h-4 mr-2" /> Media
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" /> Pricing
            </TabsTrigger>
            {productType === 'physical' && (
              <TabsTrigger value="inventory" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" /> Inventory
              </TabsTrigger>
            )}
            {productType === 'digital' && (
              <TabsTrigger value="features" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" /> Features
              </TabsTrigger>
            )}
            <TabsTrigger value="seo" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
              <Globe className="w-4 h-4 mr-2" /> SEO
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-zinc-300 text-sm mb-2 block">
                    Product Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter product name"
                    className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-2 block">
                    Slug <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="product-url-slug"
                    className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-2 block">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {PRODUCT_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-white">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-zinc-300 text-sm mb-2 block">Tagline</Label>
                  <Input
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="A short catchy tagline"
                    className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-zinc-300 text-sm mb-2 block">Short Description</Label>
                  <Textarea
                    value={formData.short_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief description for listings"
                    className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 min-h-[80px]"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-zinc-300 text-sm mb-2 block">Full Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed product description"
                    className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 min-h-[120px]"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-2 block">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => {
                      const cat = categories.find(c => c.id === v);
                      setFormData(prev => ({
                        ...prev,
                        category_id: v,
                        category: cat?.name || ''
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-2 block">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add tag"
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddTag}
                      className="border-zinc-700 text-zinc-400 hover:text-white flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {productType === 'physical' && (
                  <>
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">
                        SKU <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        value={physicalData.sku}
                        onChange={(e) => setPhysicalData(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="SKU-001"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Barcode / EAN</Label>
                      <Input
                        value={physicalData.barcode}
                        onChange={(e) => setPhysicalData(prev => ({ ...prev, barcode: e.target.value }))}
                        placeholder="UPC (12 digits) or EAN (13 digits)"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                      />
                    </div>
                    {/* Barcode Preview */}
                    {(physicalData.barcode || physicalData.sku) && (
                      <div className="col-span-2 mt-2">
                        <Label className="text-zinc-300 text-sm mb-2 block flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-amber-400" />
                          Barcode Preview
                        </Label>
                        <BarcodeDisplay
                          code={physicalData.barcode || physicalData.sku}
                          displayMode="inline"
                          height={50}
                          showControls={false}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-4 m-0">
              <div className="space-y-6">
                <div>
                  <Label className="text-zinc-300 text-sm mb-3 block flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Product Images
                  </Label>
                  <p className="text-xs text-zinc-500 mb-4">
                    Upload product images. The featured image will be shown in listings and as the main product image.
                  </p>
                  <ProductImageUploader
                    images={formData.gallery || []}
                    featuredImage={formData.featured_image}
                    onImagesChange={(images) => setFormData(prev => ({ ...prev, gallery: images }))}
                    onFeaturedChange={(image) => setFormData(prev => ({ ...prev, featured_image: image }))}
                    maxImages={10}
                  />
                </div>

                {/* Tips */}
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Image Tips</h4>
                  <ul className="text-xs text-zinc-500 space-y-1.5">
                    <li>• Use high-quality images (at least 1000x1000 pixels recommended)</li>
                    <li>• Show the product from multiple angles</li>
                    <li>• Use a clean, consistent background</li>
                    <li>• First image will be set as the featured/main image</li>
                    <li>• Drag images to reorder them in the gallery</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4 m-0">
              {productType === 'digital' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Pricing Model</Label>
                      <Select
                        value={digitalData.pricing_model}
                        onValueChange={(v) => setDigitalData(prev => ({ ...prev, pricing_model: v }))}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {PRICING_MODELS.map(m => (
                            <SelectItem key={m.value} value={m.value} className="text-white">
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Billing Cycles</Label>
                      <div className="flex flex-wrap gap-2">
                        {BILLING_CYCLES.map(cycle => (
                          <Badge
                            key={cycle.value}
                            variant={digitalData.billing_cycles.includes(cycle.value) ? 'default' : 'outline'}
                            className={cn(
                              "cursor-pointer transition-colors",
                              digitalData.billing_cycles.includes(cycle.value)
                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                            )}
                            onClick={() => {
                              setDigitalData(prev => ({
                                ...prev,
                                billing_cycles: prev.billing_cycles.includes(cycle.value)
                                  ? prev.billing_cycles.filter(c => c !== cycle.value)
                                  : [...prev.billing_cycles, cycle.value]
                              }));
                            }}
                          >
                            {cycle.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Free Trial</h4>
                        <p className="text-sm text-zinc-500">Offer a trial period for new users</p>
                      </div>
                      <Switch
                        checked={digitalData.trial_available}
                        onCheckedChange={(checked) => setDigitalData(prev => ({ ...prev, trial_available: checked }))}
                      />
                    </div>
                    {digitalData.trial_available && (
                      <div className="mt-4">
                        <Label className="text-zinc-300 text-sm mb-2 block">Trial Duration (days)</Label>
                        <Input
                          type="number"
                          value={digitalData.trial_days}
                          onChange={(e) => setDigitalData(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 14 }))}
                          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 w-32"
                          min={1}
                          max={90}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Demo URL</Label>
                      <Input
                        value={digitalData.demo_url}
                        onChange={(e) => setDigitalData(prev => ({ ...prev, demo_url: e.target.value }))}
                        placeholder="https://demo.yourproduct.com"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Documentation URL</Label>
                      <Input
                        value={digitalData.documentation_url}
                        onChange={(e) => setDigitalData(prev => ({ ...prev, documentation_url: e.target.value }))}
                        placeholder="https://docs.yourproduct.com"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300 text-sm mb-2 block">Base Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <Input
                        type="number"
                        value={physicalData.pricing.base_price}
                        onChange={(e) => setPhysicalData(prev => ({
                          ...prev,
                          pricing: { ...prev.pricing, base_price: e.target.value }
                        }))}
                        placeholder="0.00"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500 pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm mb-2 block">Compare at Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <Input
                        type="number"
                        value={physicalData.pricing.compare_at_price}
                        onChange={(e) => setPhysicalData(prev => ({
                          ...prev,
                          pricing: { ...prev.pricing, compare_at_price: e.target.value }
                        }))}
                        placeholder="0.00"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500 pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm mb-2 block">Cost Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <Input
                        type="number"
                        value={physicalData.pricing.cost_price}
                        onChange={(e) => setPhysicalData(prev => ({
                          ...prev,
                          pricing: { ...prev.pricing, cost_price: e.target.value }
                        }))}
                        placeholder="0.00"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500 pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm mb-2 block">Currency</Label>
                    <Select
                      value={physicalData.pricing.currency}
                      onValueChange={(v) => setPhysicalData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, currency: v }
                      }))}
                    >
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="USD" className="text-white">USD ($)</SelectItem>
                        <SelectItem value="EUR" className="text-white">EUR (€)</SelectItem>
                        <SelectItem value="GBP" className="text-white">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Inventory Tab (Physical only) */}
            {productType === 'physical' && (
              <TabsContent value="inventory" className="space-y-4 m-0">
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Track Inventory</h4>
                      <p className="text-sm text-zinc-500">Manage stock levels for this product</p>
                    </div>
                    <Switch
                      checked={physicalData.inventory.track_quantity}
                      onCheckedChange={(checked) => setPhysicalData(prev => ({
                        ...prev,
                        inventory: { ...prev.inventory, track_quantity: checked }
                      }))}
                    />
                  </div>
                </div>

                {physicalData.inventory.track_quantity && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Quantity in Stock</Label>
                      <Input
                        type="number"
                        value={physicalData.inventory.quantity}
                        onChange={(e) => setPhysicalData(prev => ({
                          ...prev,
                          inventory: { ...prev.inventory, quantity: parseInt(e.target.value) || 0 }
                        }))}
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500"
                        min={0}
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Low Stock Threshold</Label>
                      <Input
                        type="number"
                        value={physicalData.inventory.low_stock_threshold}
                        onChange={(e) => setPhysicalData(prev => ({
                          ...prev,
                          inventory: { ...prev.inventory, low_stock_threshold: parseInt(e.target.value) || 5 }
                        }))}
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500"
                        min={0}
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 mt-4">
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" /> Shipping
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={physicalData.shipping.weight}
                          onChange={(e) => setPhysicalData(prev => ({
                            ...prev,
                            shipping: { ...prev.shipping, weight: e.target.value }
                          }))}
                          placeholder="0"
                          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500"
                        />
                        <Select
                          value={physicalData.shipping.weight_unit}
                          onValueChange={(v) => setPhysicalData(prev => ({
                            ...prev,
                            shipping: { ...prev.shipping, weight_unit: v }
                          }))}
                        >
                          <SelectTrigger className="w-24 bg-zinc-800/50 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="kg" className="text-white">kg</SelectItem>
                            <SelectItem value="lb" className="text-white">lb</SelectItem>
                            <SelectItem value="oz" className="text-white">oz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">Country of Origin</Label>
                      <Input
                        value={physicalData.country_of_origin}
                        onChange={(e) => setPhysicalData(prev => ({ ...prev, country_of_origin: e.target.value }))}
                        placeholder="US"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Features Tab (Digital only) */}
            {productType === 'digital' && (
              <TabsContent value="features" className="space-y-4 m-0">
                <div>
                  <Label className="text-zinc-300 text-sm mb-2 block">Product Features</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                      placeholder="Add a feature"
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddFeature}
                      className="border-zinc-700 text-zinc-400 hover:text-white flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </div>

                {digitalData.features.length > 0 && (
                  <div className="space-y-2">
                    {digitalData.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                      >
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <ChevronRight className="w-3 h-3 text-cyan-400" />
                        </div>
                        <span className="text-white flex-1">{feature.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFeature(index)}
                          className="text-zinc-500 hover:text-red-400 h-7 w-7 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-4 m-0">
              <div>
                <Label className="text-zinc-300 text-sm mb-2 block">Meta Title</Label>
                <Input
                  value={formData.seo_meta_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, seo_meta_title: e.target.value }))}
                  placeholder="SEO title (defaults to product name)"
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                />
                <p className="text-xs text-zinc-500 mt-1">{formData.seo_meta_title?.length || 0}/60 characters</p>
              </div>

              <div>
                <Label className="text-zinc-300 text-sm mb-2 block">Meta Description</Label>
                <Textarea
                  value={formData.seo_meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, seo_meta_description: e.target.value }))}
                  placeholder="SEO description for search results"
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 min-h-[80px]"
                />
                <p className="text-xs text-zinc-500 mt-1">{formData.seo_meta_description?.length || 0}/160 characters</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Search Preview</h4>
                <div className="space-y-1">
                  <p className="text-cyan-400 text-sm truncate">
                    {formData.seo_meta_title || formData.name || 'Product Title'}
                  </p>
                  <p className="text-green-400 text-xs">
                    yoursite.com/products/{formData.slug || 'product-slug'}
                  </p>
                  <p className="text-zinc-400 text-sm line-clamp-2">
                    {formData.seo_meta_description || formData.short_description || 'Product description will appear here...'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t border-white/5">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className={cn(
              "text-white font-semibold",
              productType === 'digital'
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> {isEdit ? 'Update' : 'Create'} Product</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
