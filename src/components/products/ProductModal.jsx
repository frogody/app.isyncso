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
  Loader2, Cloud, Package, Save, Image as ImageIcon, Tags, Euro, Settings,
  FileText, Globe, Truck, BarChart3, ChevronRight, ChevronDown, ChevronUp, Plus, X, Upload, Barcode,
  Users, History, Star, Calendar, Receipt, Trash2, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductImageUploader from './ProductImageUploader';
import BarcodeDisplay from './BarcodeDisplay';
import {
  getProductSuppliers,
  addProductSupplier,
  removeProductSupplier,
  setPreferredSupplier,
  getProductPurchaseHistory,
  addStockPurchase
} from '@/lib/db/queries';
import { supabase } from '@/api/supabaseClient';

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
      currency: 'EUR',
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

  // AI Brief state
  const DEFAULT_AI_CONTEXT = {
    targetPersona: { jobTitles: [], painPoints: [], goals: [] },
    positioning: { competitors: [], differentiators: [], uniqueValue: '' },
    useCases: [],
    socialProof: { customerCount: null, keyMetrics: [], testimonialHighlights: [] },
    brandVoice: { tone: 'professional', keywords: [], avoidWords: [] },
    industry: { vertical: '', regulations: [], terminology: [] },
  };
  const [aiContext, setAiContext] = useState(DEFAULT_AI_CONTEXT);
  const [expandedSections, setExpandedSections] = useState({
    targetPersona: true, positioning: false, useCases: false,
    socialProof: false, brandVoice: false, industry: false,
  });
  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Supplier management state
  const [productSuppliers, setProductSuppliers] = useState([]);
  const [pendingSuppliers, setPendingSuppliers] = useState([]); // For new products before save
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    quantity: '',
    unit_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: ''
  });

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
        // Load AI context
        const saved = product.digitalDetails.ai_context || {};
        setAiContext({
          targetPersona: { ...DEFAULT_AI_CONTEXT.targetPersona, ...saved.targetPersona },
          positioning: { ...DEFAULT_AI_CONTEXT.positioning, ...saved.positioning },
          useCases: saved.useCases || [],
          socialProof: { ...DEFAULT_AI_CONTEXT.socialProof, ...saved.socialProof },
          brandVoice: { ...DEFAULT_AI_CONTEXT.brandVoice, ...saved.brandVoice },
          industry: { ...DEFAULT_AI_CONTEXT.industry, ...saved.industry },
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
            currency: 'EUR',
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
          currency: 'EUR',
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
      setAiContext(DEFAULT_AI_CONTEXT);
      // Reset supplier state for new products
      setPendingSuppliers([]);
      setProductSuppliers([]);
      setPurchaseHistory([]);
      setActiveTab('basic');
    }
  }, [product, open, productType]);

  // Load suppliers and purchase history for existing products
  useEffect(() => {
    const loadSuppliersData = async () => {
      if (!product?.id || !open || productType !== 'physical') return;

      setSuppliersLoading(true);
      try {
        const [suppliers, purchases] = await Promise.all([
          getProductSuppliers(product.id),
          getProductPurchaseHistory(product.id, { limit: 20 })
        ]);
        setProductSuppliers(suppliers || []);
        setPurchaseHistory(purchases || []);
      } catch (e) {
        console.warn('Failed to load supplier data:', e);
      } finally {
        setSuppliersLoading(false);
      }
    };

    loadSuppliersData();
  }, [product?.id, open, productType]);

  // Load available suppliers for adding
  useEffect(() => {
    const loadAvailableSuppliers = async () => {
      if (!user?.company_id || !open) return;
      try {
        const { data } = await supabase
          .from('suppliers')
          .select('id, name, contact')
          .eq('company_id', user.company_id)
          .order('name');
        setAvailableSuppliers(data || []);
      } catch (e) {
        console.warn('Failed to load suppliers:', e);
      }
    };

    loadAvailableSuppliers();
  }, [user?.company_id, open]);

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

  // Supplier management handlers
  const handleAddSupplier = async () => {
    if (!selectedSupplierId) return;

    const selectedSupplier = availableSuppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier) return;

    if (isEdit && product?.id) {
      // For existing products, add via API
      try {
        const supplier = await addProductSupplier({
          company_id: user.company_id,
          product_id: product.id,
          supplier_id: selectedSupplierId,
          is_preferred: productSuppliers.length === 0
        });
        setProductSuppliers(prev => [...prev, supplier]);
        toast.success('Supplier added');
      } catch (e) {
        console.error('Failed to add supplier:', e);
        toast.error('Failed to add supplier');
        return;
      }
    } else {
      // For new products, add to pending list
      const allSuppliers = [...pendingSuppliers];
      const newSupplier = {
        id: `pending-${Date.now()}`,
        supplier_id: selectedSupplierId,
        is_preferred: allSuppliers.length === 0,
        suppliers: { id: selectedSupplier.id, name: selectedSupplier.name }
      };
      setPendingSuppliers([...allSuppliers, newSupplier]);
    }
    setSelectedSupplierId('');
    setShowAddSupplier(false);
  };

  const handleRemoveSupplier = async (supplierId) => {
    if (isEdit && product?.id) {
      // For existing products, remove via API
      try {
        await removeProductSupplier(product.id, supplierId);
        setProductSuppliers(prev => prev.filter(s => s.supplier_id !== supplierId));
        toast.success('Supplier removed');
      } catch (e) {
        console.error('Failed to remove supplier:', e);
        toast.error('Failed to remove supplier');
      }
    } else {
      // For new products, remove from pending list
      setPendingSuppliers(prev => prev.filter(s => s.supplier_id !== supplierId));
    }
  };

  const handleSetPreferred = async (supplierId) => {
    if (isEdit && product?.id) {
      // For existing products, update via API
      try {
        await setPreferredSupplier(product.id, supplierId);
        setProductSuppliers(prev => prev.map(s => ({
          ...s,
          is_preferred: s.supplier_id === supplierId
        })));
        toast.success('Preferred supplier updated');
      } catch (e) {
        console.error('Failed to set preferred supplier:', e);
        toast.error('Failed to update preferred supplier');
      }
    } else {
      // For new products, update pending list
      setPendingSuppliers(prev => prev.map(s => ({
        ...s,
        is_preferred: s.supplier_id === supplierId
      })));
    }
  };

  const handleAddPurchase = async () => {
    if (!purchaseForm.supplier_id || !purchaseForm.quantity || !purchaseForm.unit_price) {
      toast.error('Please fill in supplier, quantity, and unit price');
      return;
    }

    try {
      const purchase = await addStockPurchase({
        company_id: user.company_id,
        product_id: product.id,
        supplier_id: purchaseForm.supplier_id,
        quantity: parseFloat(purchaseForm.quantity),
        unit_price: parseFloat(purchaseForm.unit_price),
        purchase_date: purchaseForm.purchase_date,
        invoice_number: purchaseForm.invoice_number || null,
        source_type: 'manual'
      });
      setPurchaseHistory(prev => [purchase, ...prev]);
      setPurchaseForm({
        supplier_id: '',
        quantity: '',
        unit_price: '',
        purchase_date: new Date().toISOString().split('T')[0],
        invoice_number: ''
      });
      setShowAddPurchase(false);
      toast.success('Purchase recorded');

      // Refresh suppliers to get updated pricing
      const suppliers = await getProductSuppliers(product.id);
      setProductSuppliers(suppliers || []);
    } catch (e) {
      console.error('Failed to add purchase:', e);
      toast.error('Failed to record purchase');
    }
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

    if (productType === 'physical' && !physicalData.barcode?.trim()) {
      toast.error('EAN/Barcode is required for physical products');
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
          ai_context: aiContext,
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

        // Link pending suppliers for new physical products
        if (!isEdit && pendingSuppliers.length > 0) {
          for (const ps of pendingSuppliers) {
            try {
              await addProductSupplier({
                company_id: user.company_id,
                product_id: savedProduct.id,
                supplier_id: ps.supplier_id,
                is_preferred: ps.is_preferred
              });
            } catch (e) {
              console.warn('Failed to link supplier:', ps.supplier_id, e);
            }
          }
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

  const themeColor = 'cyan';
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
                : "bg-gradient-to-br from-cyan-500 to-cyan-600"
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
              <Euro className="w-4 h-4 mr-2" /> Pricing
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
            {productType === 'digital' && (
              <TabsTrigger value="ai-brief" className="data-[state=active]:bg-zinc-700 text-zinc-400 data-[state=active]:text-white">
                <Sparkles className="w-4 h-4 mr-2" /> AI Brief
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
                        EAN / Barcode <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        value={physicalData.barcode}
                        onChange={(e) => setPhysicalData(prev => ({ ...prev, barcode: e.target.value }))}
                        placeholder="EAN (13 digits) or UPC (12 digits)"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm mb-2 block">SKU (Optional)</Label>
                      <Input
                        value={physicalData.sku}
                        onChange={(e) => setPhysicalData(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="SKU-001"
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                      />
                    </div>
                    {/* Barcode Preview */}
                    {(physicalData.barcode || physicalData.sku) && (
                      <div className="col-span-2 mt-2">
                        <Label className="text-zinc-300 text-sm mb-2 block flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-cyan-400" />
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
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 pl-7"
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
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 pl-7"
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
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500 pl-7"
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
                        <SelectItem value="EUR" className="text-white">EUR (€)</SelectItem>
                        <SelectItem value="USD" className="text-white">USD ($)</SelectItem>
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
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
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
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
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
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                        min={0}
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 mt-4">
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" /> Shipping
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
                          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
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
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Suppliers Section */}
                <div className="border-t border-white/5 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" /> Suppliers
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddSupplier(!showAddSupplier)}
                      className="border-zinc-700 text-zinc-400 hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Supplier
                    </Button>
                  </div>

                  {/* Add Supplier Form */}
                  <AnimatePresence>
                    {showAddSupplier && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                      >
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label className="text-zinc-300 text-sm mb-2 block">Select Supplier</Label>
                            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                                <SelectValue placeholder="Choose a supplier..." />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                {availableSuppliers
                                  .filter(s =>
                                    !productSuppliers.some(ps => ps.supplier_id === s.id) &&
                                    !pendingSuppliers.some(ps => ps.supplier_id === s.id)
                                  )
                                  .map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-white">
                                      {s.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddSupplier}
                            disabled={!selectedSupplierId}
                            className="bg-cyan-500 hover:bg-cyan-600 text-black"
                          >
                            Add
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Suppliers List */}
                  {suppliersLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    </div>
                  ) : (isEdit ? productSuppliers : pendingSuppliers).length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No suppliers linked to this product yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(isEdit ? productSuppliers : pendingSuppliers).map(ps => (
                        <div
                          key={ps.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium truncate">
                                {ps.suppliers?.name || 'Unknown Supplier'}
                              </span>
                              {ps.is_preferred && (
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-xs">
                                  <Star className="w-3 h-3 mr-1" /> Preferred
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-zinc-400 mt-1">
                              {ps.last_purchase_price ? (
                                <span>
                                  Last: €{parseFloat(ps.last_purchase_price).toFixed(2)}
                                  {ps.last_purchase_date && (
                                    <span className="text-zinc-500 ml-2">
                                      ({new Date(ps.last_purchase_date).toLocaleDateString()})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-zinc-500">No purchase history</span>
                              )}
                              {ps.average_purchase_price && (
                                <span className="ml-3">
                                  Avg: €{parseFloat(ps.average_purchase_price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!ps.is_preferred && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPreferred(ps.supplier_id)}
                                className="text-zinc-500 hover:text-cyan-400 h-8 w-8 p-0"
                                title="Set as preferred"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSupplier(ps.supplier_id)}
                              className="text-zinc-500 hover:text-red-400 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Purchase History Section - Only for existing products */}
                {isEdit && (
                  <div className="border-t border-white/5 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium flex items-center gap-2">
                        <History className="w-4 h-4 text-cyan-400" /> Purchase History
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddPurchase(!showAddPurchase)}
                        className="border-zinc-700 text-zinc-400 hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Purchase
                      </Button>
                    </div>

                    {/* Add Purchase Form */}
                    <AnimatePresence>
                      {showAddPurchase && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                        >
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <Label className="text-zinc-300 text-sm mb-2 block">Supplier</Label>
                              <Select
                                value={purchaseForm.supplier_id}
                                onValueChange={(v) => setPurchaseForm(p => ({ ...p, supplier_id: v }))}
                              >
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                                  <SelectValue placeholder="Select supplier..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                  {availableSuppliers.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-white">
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-zinc-300 text-sm mb-2 block">Date</Label>
                              <Input
                                type="date"
                                value={purchaseForm.purchase_date}
                                onChange={(e) => setPurchaseForm(p => ({ ...p, purchase_date: e.target.value }))}
                                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <Label className="text-zinc-300 text-sm mb-2 block">Quantity</Label>
                              <Input
                                type="number"
                                value={purchaseForm.quantity}
                                onChange={(e) => setPurchaseForm(p => ({ ...p, quantity: e.target.value }))}
                                placeholder="0"
                                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                                min={1}
                              />
                            </div>
                            <div>
                              <Label className="text-zinc-300 text-sm mb-2 block">Unit Price (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={purchaseForm.unit_price}
                                onChange={(e) => setPurchaseForm(p => ({ ...p, unit_price: e.target.value }))}
                                placeholder="0.00"
                                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-zinc-300 text-sm mb-2 block">Invoice # (Optional)</Label>
                              <Input
                                value={purchaseForm.invoice_number}
                                onChange={(e) => setPurchaseForm(p => ({ ...p, invoice_number: e.target.value }))}
                                placeholder="INV-001"
                                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setShowAddPurchase(false)}
                              className="text-zinc-400"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAddPurchase}
                              className="bg-cyan-500 hover:bg-cyan-600 text-black"
                            >
                              Save Purchase
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Purchase History Table */}
                    {purchaseHistory.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">
                        No purchase history recorded yet
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-500 border-b border-white/5">
                              <th className="text-left py-2 font-medium">Date</th>
                              <th className="text-left py-2 font-medium">Supplier</th>
                              <th className="text-right py-2 font-medium">Qty</th>
                              <th className="text-right py-2 font-medium">Unit Price</th>
                              <th className="text-right py-2 font-medium">Total</th>
                              <th className="text-left py-2 font-medium">Invoice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchaseHistory.map(p => (
                              <tr key={p.id} className="border-b border-white/5 text-white">
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    {new Date(p.purchase_date).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="py-2">{p.suppliers?.name || '-'}</td>
                                <td className="py-2 text-right">{parseFloat(p.quantity).toLocaleString()}</td>
                                <td className="py-2 text-right">€{parseFloat(p.unit_price).toFixed(2)}</td>
                                <td className="py-2 text-right font-medium">€{parseFloat(p.total_amount).toFixed(2)}</td>
                                <td className="py-2">
                                  {p.invoice_number ? (
                                    <span className="flex items-center gap-1 text-zinc-400">
                                      <Receipt className="w-3 h-3" />
                                      {p.invoice_number}
                                    </span>
                                  ) : (
                                    <Badge className="bg-zinc-700 text-zinc-400 border-0 text-xs">
                                      {p.source_type}
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
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

            {/* AI Brief Tab (Digital only) */}
            {productType === 'digital' && (
              <TabsContent value="ai-brief" className="space-y-3 m-0">
                {/* Helper components for AI Brief */}
                {(() => {
                  // Tag input helper
                  const TagInput = ({ tags, onAdd, onRemove, placeholder }) => {
                    const [val, setVal] = React.useState('');
                    return (
                      <div>
                        <div className="flex gap-2">
                          <input
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && val.trim()) {
                                e.preventDefault();
                                if (!tags.includes(val.trim())) onAdd(val.trim());
                                setVal('');
                              }
                            }}
                            placeholder={placeholder}
                            className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (val.trim() && !tags.includes(val.trim())) onAdd(val.trim());
                              setVal('');
                            }}
                            className="px-2 text-cyan-400 hover:text-cyan-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {tags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full px-3 py-1 text-xs">
                                {tag}
                                <button type="button" onClick={() => onRemove(tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  // List input helper (array of strings with + button)
                  const ListInput = ({ items, onUpdate, placeholder }) => (
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={item}
                            onChange={(e) => { const n = [...items]; n[i] = e.target.value; onUpdate(n); }}
                            placeholder={placeholder}
                            className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                          />
                          <button type="button" onClick={() => onUpdate(items.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => onUpdate([...items, ''])} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  );

                  // Section wrapper
                  const Section = ({ id, title, children }) => (
                    <div className="rounded-xl border border-white/[0.06] bg-zinc-800/30">
                      <button type="button" onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-4 py-3">
                        <span className="text-white font-semibold text-sm">{title}</span>
                        {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </button>
                      {expandedSections[id] && <div className="px-4 pb-4 space-y-3">{children}</div>}
                    </div>
                  );

                  const updateCtx = (section, field, value) => {
                    setAiContext(prev => ({
                      ...prev,
                      [section]: { ...prev[section], [field]: value },
                    }));
                  };

                  return (
                    <>
                      <Section id="targetPersona" title="Target Persona">
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Job Titles</label>
                          <TagInput
                            tags={aiContext.targetPersona.jobTitles}
                            onAdd={(t) => updateCtx('targetPersona', 'jobTitles', [...aiContext.targetPersona.jobTitles, t])}
                            onRemove={(t) => updateCtx('targetPersona', 'jobTitles', aiContext.targetPersona.jobTitles.filter(x => x !== t))}
                            placeholder="e.g. Compliance Officer"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Pain Points</label>
                          <ListInput
                            items={aiContext.targetPersona.painPoints}
                            onUpdate={(v) => updateCtx('targetPersona', 'painPoints', v)}
                            placeholder="e.g. Complex EU AI Act requirements"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Goals</label>
                          <ListInput
                            items={aiContext.targetPersona.goals}
                            onUpdate={(v) => updateCtx('targetPersona', 'goals', v)}
                            placeholder="e.g. Automated compliance monitoring"
                          />
                        </div>
                      </Section>

                      <Section id="positioning" title="Positioning">
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Competitors</label>
                          <TagInput
                            tags={aiContext.positioning.competitors}
                            onAdd={(t) => updateCtx('positioning', 'competitors', [...aiContext.positioning.competitors, t])}
                            onRemove={(t) => updateCtx('positioning', 'competitors', aiContext.positioning.competitors.filter(x => x !== t))}
                            placeholder="e.g. OneTrust"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Differentiators</label>
                          <ListInput
                            items={aiContext.positioning.differentiators}
                            onUpdate={(v) => updateCtx('positioning', 'differentiators', v)}
                            placeholder="e.g. Automated EU AI Act compliance"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Unique Value Proposition</label>
                          <textarea
                            value={aiContext.positioning.uniqueValue}
                            onChange={(e) => updateCtx('positioning', 'uniqueValue', e.target.value)}
                            placeholder="The only platform that..."
                            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 min-h-[60px]"
                          />
                        </div>
                      </Section>

                      <Section id="useCases" title="Use Cases">
                        <div className="space-y-3">
                          {aiContext.useCases.map((uc, i) => (
                            <div key={i} className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.05] space-y-2">
                              <div className="flex gap-2">
                                <input
                                  value={uc.title}
                                  onChange={(e) => {
                                    const n = [...aiContext.useCases]; n[i] = { ...n[i], title: e.target.value };
                                    setAiContext(prev => ({ ...prev, useCases: n }));
                                  }}
                                  placeholder="Use case title"
                                  className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                                />
                                <button type="button" onClick={() => setAiContext(prev => ({ ...prev, useCases: prev.useCases.filter((_, j) => j !== i) }))} className="text-zinc-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                              </div>
                              <textarea
                                value={uc.description}
                                onChange={(e) => {
                                  const n = [...aiContext.useCases]; n[i] = { ...n[i], description: e.target.value };
                                  setAiContext(prev => ({ ...prev, useCases: n }));
                                }}
                                placeholder="Description"
                                className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 min-h-[50px]"
                              />
                            </div>
                          ))}
                          <button type="button" onClick={() => setAiContext(prev => ({ ...prev, useCases: [...prev.useCases, { title: '', description: '' }] }))} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Use Case
                          </button>
                        </div>
                      </Section>

                      <Section id="socialProof" title="Social Proof">
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Customer Count</label>
                          <input
                            type="number"
                            value={aiContext.socialProof.customerCount || ''}
                            onChange={(e) => updateCtx('socialProof', 'customerCount', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="e.g. 150"
                            className="w-32 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Key Metrics</label>
                          <TagInput
                            tags={aiContext.socialProof.keyMetrics}
                            onAdd={(t) => updateCtx('socialProof', 'keyMetrics', [...aiContext.socialProof.keyMetrics, t])}
                            onRemove={(t) => updateCtx('socialProof', 'keyMetrics', aiContext.socialProof.keyMetrics.filter(x => x !== t))}
                            placeholder="e.g. 80% cost reduction"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Testimonial Highlights</label>
                          <ListInput
                            items={aiContext.socialProof.testimonialHighlights}
                            onUpdate={(v) => updateCtx('socialProof', 'testimonialHighlights', v)}
                            placeholder="Short quote"
                          />
                        </div>
                      </Section>

                      <Section id="brandVoice" title="Brand Voice">
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Tone</label>
                          <select
                            value={aiContext.brandVoice.tone}
                            onChange={(e) => updateCtx('brandVoice', 'tone', e.target.value)}
                            className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          >
                            {['professional', 'casual', 'technical', 'friendly', 'authoritative', 'playful'].map(t => (
                              <option key={t} value={t} className="bg-zinc-800">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Keywords</label>
                          <TagInput
                            tags={aiContext.brandVoice.keywords}
                            onAdd={(t) => updateCtx('brandVoice', 'keywords', [...aiContext.brandVoice.keywords, t])}
                            onRemove={(t) => updateCtx('brandVoice', 'keywords', aiContext.brandVoice.keywords.filter(x => x !== t))}
                            placeholder="e.g. compliance"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Words to Avoid</label>
                          <TagInput
                            tags={aiContext.brandVoice.avoidWords}
                            onAdd={(t) => updateCtx('brandVoice', 'avoidWords', [...aiContext.brandVoice.avoidWords, t])}
                            onRemove={(t) => updateCtx('brandVoice', 'avoidWords', aiContext.brandVoice.avoidWords.filter(x => x !== t))}
                            placeholder="e.g. simple"
                          />
                        </div>
                      </Section>

                      <Section id="industry" title="Industry Context">
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Vertical</label>
                          <input
                            value={aiContext.industry.vertical}
                            onChange={(e) => updateCtx('industry', 'vertical', e.target.value)}
                            placeholder="e.g. RegTech"
                            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Regulations</label>
                          <TagInput
                            tags={aiContext.industry.regulations}
                            onAdd={(t) => updateCtx('industry', 'regulations', [...aiContext.industry.regulations, t])}
                            onRemove={(t) => updateCtx('industry', 'regulations', aiContext.industry.regulations.filter(x => x !== t))}
                            placeholder="e.g. EU AI Act"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 text-xs mb-1 block">Terminology</label>
                          <TagInput
                            tags={aiContext.industry.terminology}
                            onAdd={(t) => updateCtx('industry', 'terminology', [...aiContext.industry.terminology, t])}
                            onRemove={(t) => updateCtx('industry', 'terminology', aiContext.industry.terminology.filter(x => x !== t))}
                            placeholder="e.g. high-risk AI"
                          />
                        </div>
                      </Section>
                    </>
                  );
                })()}
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
                  <p className="text-cyan-400 text-xs">
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
                : "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
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
