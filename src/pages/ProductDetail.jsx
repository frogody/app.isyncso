import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Cloud, Box, ArrowLeft, Edit2, ExternalLink, Play, FileText,
  DollarSign, Check, Star, MessageCircle, Users, Zap, Download,
  Clock, Shield, Award, ChevronRight, Package, Truck, Building2,
  Barcode, Globe, Tag, CheckCircle, XCircle, AlertTriangle,
  Image as ImageIcon, Video, HelpCircle, Share2, Copy, Heart,
  ShoppingCart, Info, Layers, Ruler, Weight, MapPin, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, PhysicalProduct, Supplier } from "@/api/entities";
import {
  MediaGallery,
  SpecificationsTable,
  ProductInquiryModal,
  ProductGridCard,
  BarcodeDisplay,
  ProductImageUploader,
  InlineEditText,
  InlineEditNumber,
  InlineEditSelect
} from "@/components/products";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
];

const STATUS_COLORS = {
  published: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Published' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

function getStockStatus(inventory) {
  if (!inventory) return { status: 'unknown', label: 'Unknown', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', icon: Info };
  const qty = inventory.quantity || 0;
  const low = inventory.low_stock_threshold || 10;
  if (qty <= 0) return { status: 'out', label: 'Out of Stock', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle };
  if (qty <= low) return { status: 'low', label: `Low Stock (${qty} left)`, color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertTriangle };
  return { status: 'in', label: `In Stock (${qty} available)`, color: 'text-green-400', bgColor: 'bg-green-500/10', icon: CheckCircle };
}

function formatPrice(price, currency = 'USD') {
  if (!price && price !== 0) return null;
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(num);
}

// ============= PHYSICAL PRODUCT DETAIL (INLINE EDIT) =============

function PhysicalProductDetail({
  product,
  details,
  supplier,
  onUpdate,
  onDetailsUpdate,
  onRequestQuote,
  relatedProducts,
  saving
}) {
  const pricing = details?.pricing || {};
  const inventory = details?.inventory || {};
  const shipping = details?.shipping || {};
  const stock = getStockStatus(inventory);
  const StockIcon = stock.icon;

  const hasPrice = pricing.base_price && parseFloat(pricing.base_price) > 0;

  // Local state for gallery/featured (for immediate UI update)
  const [localImages, setLocalImages] = useState(product.gallery || []);
  const [localFeatured, setLocalFeatured] = useState(product.featured_image);

  useEffect(() => {
    setLocalImages(product.gallery || []);
    setLocalFeatured(product.featured_image);
  }, [product.gallery, product.featured_image]);

  const handleImagesChange = async (newImages) => {
    setLocalImages(newImages);
    await onUpdate({ gallery: newImages });
  };

  const handleFeaturedChange = async (newFeatured) => {
    setLocalFeatured(newFeatured);
    await onUpdate({ featured_image: newFeatured });
  };

  const handlePricingUpdate = async (field, value) => {
    const newPricing = { ...pricing, [field]: value };
    await onDetailsUpdate({ pricing: newPricing });
  };

  const handleInventoryUpdate = async (field, value) => {
    const newInventory = { ...inventory, [field]: value };
    await onDetailsUpdate({ inventory: newInventory });
  };

  const handleShippingUpdate = async (field, value) => {
    const newShipping = { ...shipping, [field]: value };
    await onDetailsUpdate({ shipping: newShipping });
  };

  return (
    <div className="space-y-6">
      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Image Gallery with Upload */}
        <div className="lg:col-span-2">
          <GlassCard className="p-4">
            <ProductImageUploader
              images={localImages}
              featuredImage={localFeatured}
              onImagesChange={handleImagesChange}
              onFeaturedChange={handleFeaturedChange}
              maxImages={10}
            />
          </GlassCard>
        </div>

        {/* Right: Product Info - All Inline Editable */}
        <div className="lg:col-span-3 space-y-4">
          {/* Status & Title */}
          <GlassCard className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 space-y-3">
                {/* Status Selector */}
                <div className="flex items-center gap-3">
                  <InlineEditSelect
                    value={product.status}
                    options={STATUS_OPTIONS}
                    onSave={(val) => onUpdate({ status: val })}
                    label="Status"
                  />
                </div>

                {/* Product Name */}
                <InlineEditText
                  value={product.name}
                  onSave={(val) => onUpdate({ name: val })}
                  placeholder="Product name"
                  textClassName="text-2xl font-bold"
                />

                {/* Tagline */}
                <InlineEditText
                  value={product.tagline}
                  onSave={(val) => onUpdate({ tagline: val })}
                  placeholder="Add a tagline..."
                  textClassName="text-zinc-400"
                />
              </div>

              {saving && (
                <div className="flex items-center gap-2 text-orange-400">
                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
            </div>

            {/* Price & Stock */}
            <div className="flex flex-wrap items-end gap-6 pt-4 border-t border-white/5">
              <div className="space-y-1">
                <div className="text-xs text-zinc-500">Price</div>
                <div className="flex items-baseline gap-2">
                  <InlineEditNumber
                    value={pricing.base_price}
                    onSave={(val) => handlePricingUpdate('base_price', val)}
                    placeholder="0.00"
                    prefix={pricing.currency === 'EUR' ? '' : '$'}
                    textClassName="text-3xl font-bold"
                  />
                  <InlineEditSelect
                    value={pricing.currency || 'EUR'}
                    options={CURRENCY_OPTIONS}
                    onSave={(val) => handlePricingUpdate('currency', val)}
                  />
                </div>
              </div>

              <div className="flex-1" />

              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${stock.bgColor}`}>
                <StockIcon className={`w-5 h-5 ${stock.color}`} />
                <span className={`font-medium ${stock.color}`}>{stock.label}</span>
              </div>
            </div>
          </GlassCard>

          {/* SKU & Barcode */}
          <GlassCard className="p-3">
            <div className="flex items-center gap-4">
              <div className="grid grid-cols-2 gap-3 flex-1">
                <InlineEditText
                  value={details?.sku}
                  onSave={(val) => onDetailsUpdate({ sku: val })}
                  label="SKU"
                  placeholder="Enter SKU..."
                  textClassName="font-mono text-sm"
                />
                <InlineEditText
                  value={details?.barcode}
                  onSave={(val) => onDetailsUpdate({ barcode: val })}
                  label="EAN / Barcode"
                  placeholder="Enter barcode..."
                  textClassName="font-mono text-sm"
                />
              </div>
              {(details?.barcode || details?.sku) && (
                <BarcodeDisplay
                  code={details.barcode || details.sku}
                  displayMode="inline"
                  height={40}
                  showControls={false}
                />
              )}
            </div>
          </GlassCard>

          {/* Origin & Country */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
              <InlineEditText
                value={details?.country_of_origin}
                onSave={(val) => onDetailsUpdate({ country_of_origin: val })}
                label="Country of Origin"
                placeholder="e.g. NL"
                textClassName="text-sm"
              />
            </div>
            {supplier && (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs">Supplier</span>
                </div>
                <p className="text-white text-sm">{supplier.name}</p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
              <InlineEditText
                value={details?.mpn}
                onSave={(val) => onDetailsUpdate({ mpn: val })}
                label="MPN"
                placeholder="Manufacturer Part Number"
                textClassName="font-mono text-sm"
              />
            </div>
          </div>

          {/* Inventory & Shipping */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-orange-400" />
              <span className="font-medium text-white">Inventory & Shipping</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InlineEditNumber
                value={inventory.quantity}
                onSave={(val) => handleInventoryUpdate('quantity', val)}
                label="Quantity in Stock"
                placeholder="0"
                min={0}
              />
              <InlineEditNumber
                value={inventory.low_stock_threshold}
                onSave={(val) => handleInventoryUpdate('low_stock_threshold', val)}
                label="Low Stock Threshold"
                placeholder="5"
                min={0}
              />
              <InlineEditNumber
                value={shipping.weight}
                onSave={(val) => handleShippingUpdate('weight', val)}
                label="Weight (kg)"
                placeholder="0"
                step={0.1}
              />
              <InlineEditNumber
                value={pricing.cost_price}
                onSave={(val) => handlePricingUpdate('cost_price', val)}
                label="Cost Price"
                placeholder="0.00"
                prefix={pricing.currency === 'EUR' ? '' : '$'}
              />
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12"
              onClick={onRequestQuote}
            >
              <MessageCircle className="w-5 h-5 mr-2" /> Request Quote
            </Button>
            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white h-12 px-4">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white h-12 px-4">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Description - Inline Editable */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-orange-400" />
          <span className="font-medium text-white">Description</span>
        </div>
        <InlineEditText
          value={product.description}
          onSave={(val) => onUpdate({ description: val })}
          placeholder="Add a product description..."
          multiline
          rows={6}
          textClassName="text-zinc-300 whitespace-pre-wrap leading-relaxed"
        />
      </GlassCard>

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="border-white/10 text-zinc-400">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            Related Products
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((relatedProduct) => (
              <ProductGridCard
                key={relatedProduct.id}
                product={relatedProduct}
                onClick={() => {
                  window.location.href = createPageUrl('ProductDetail') + `?type=${relatedProduct.type}&slug=${relatedProduct.slug}`;
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= DIGITAL PRODUCT DETAIL (INLINE EDIT) =============

function DigitalProductDetail({
  product,
  details,
  onUpdate,
  onDetailsUpdate,
  onRequestQuote,
  relatedProducts,
  saving
}) {
  const [localImages, setLocalImages] = useState(product.gallery || []);
  const [localFeatured, setLocalFeatured] = useState(product.featured_image);

  useEffect(() => {
    setLocalImages(product.gallery || []);
    setLocalFeatured(product.featured_image);
  }, [product.gallery, product.featured_image]);

  const handleImagesChange = async (newImages) => {
    setLocalImages(newImages);
    await onUpdate({ gallery: newImages });
  };

  const handleFeaturedChange = async (newFeatured) => {
    setLocalFeatured(newFeatured);
    await onUpdate({ featured_image: newFeatured });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <GlassCard className="p-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <InlineEditSelect
                value={product.status}
                options={STATUS_OPTIONS}
                onSave={(val) => onUpdate({ status: val })}
                label="Status"
              />
              {saving && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
            </div>

            {/* Name */}
            <InlineEditText
              value={product.name}
              onSave={(val) => onUpdate({ name: val })}
              placeholder="Product name"
              textClassName="text-3xl font-bold"
            />

            {/* Tagline */}
            <InlineEditText
              value={product.tagline || product.short_description}
              onSave={(val) => onUpdate({ tagline: val })}
              placeholder="Add a tagline..."
              textClassName="text-lg text-zinc-400"
            />

            {details?.trial_available && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>{details.trial_days || 14}-day free trial available</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {details?.demo_url && (
                <a href={details.demo_url} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                    <Play className="w-4 h-4 mr-2" /> Try Demo
                  </Button>
                </a>
              )}
              <Button
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={onRequestQuote}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Request Demo
              </Button>
            </div>
          </div>

          {/* Image Upload Area */}
          <div className="aspect-video rounded-xl bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 overflow-hidden border border-cyan-500/20 p-4">
            <ProductImageUploader
              images={localImages}
              featuredImage={localFeatured}
              onImagesChange={handleImagesChange}
              onFeaturedChange={handleFeaturedChange}
              maxImages={10}
            />
          </div>
        </div>
      </GlassCard>

      {/* Description */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">About</span>
        </div>
        <InlineEditText
          value={product.description}
          onSave={(val) => onUpdate({ description: val })}
          placeholder="Add a product description..."
          multiline
          rows={6}
          textClassName="text-zinc-300 whitespace-pre-wrap leading-relaxed"
        />
      </GlassCard>

      {/* Features */}
      {details?.features && details.features.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {details.features.map((feature, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-cyan-400" />
                </div>
                <h4 className="font-medium text-white mb-1">{feature.title || feature.name || feature}</h4>
                {feature.description && (
                  <p className="text-sm text-zinc-500">{feature.description}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="border-white/10 text-zinc-400">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Related Products
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((relatedProduct) => (
              <ProductGridCard
                key={relatedProduct.id}
                product={relatedProduct}
                onClick={() => {
                  window.location.href = createPageUrl('ProductDetail') + `?type=${relatedProduct.type}&slug=${relatedProduct.slug}`;
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= MAIN COMPONENT =============

export default function ProductDetail() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'digital';
  const slug = searchParams.get('slug');

  const [product, setProduct] = useState(null);
  const [details, setDetails] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const loadProduct = async () => {
    if (!slug) {
      setError('No product slug provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const products = await Product.filter({ slug, type }, { limit: 1 });

      if (!products || products.length === 0) {
        setError('Product not found');
        setLoading(false);
        return;
      }

      const productData = products[0];
      setProduct(productData);

      if (type === 'digital') {
        const digitalData = await DigitalProduct.filter({ product_id: productData.id }, { limit: 1 });
        if (digitalData && digitalData.length > 0) {
          setDetails(digitalData[0]);
        }
      } else {
        const physicalData = await PhysicalProduct.filter({ product_id: productData.id }, { limit: 1 });
        if (physicalData && physicalData.length > 0) {
          setDetails(physicalData[0]);
          if (physicalData[0].supplier_id) {
            const supplierData = await Supplier.get(physicalData[0].supplier_id);
            if (supplierData) setSupplier(supplierData);
          }
        }
      }

      // Load related products
      try {
        const related = await Product.filter(
          { type, category: productData.category, status: 'published' },
          { limit: 5 }
        );
        setRelatedProducts(related.filter(p => p.id !== productData.id));
      } catch (relatedErr) {
        console.log('Could not load related products:', relatedErr);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [slug, type]);

  // Handle product update (inline save)
  const handleProductUpdate = async (updates) => {
    if (!product) return;

    setSaving(true);
    try {
      await Product.update(product.id, updates);
      setProduct(prev => ({ ...prev, ...updates }));
      toast.success('Saved');
    } catch (err) {
      console.error('Failed to update product:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle details update (inline save)
  const handleDetailsUpdate = async (updates) => {
    if (!details) return;

    setSaving(true);
    try {
      if (type === 'digital') {
        await DigitalProduct.update(details.id, updates);
      } else {
        await PhysicalProduct.update(details.id, updates);
      }
      setDetails(prev => ({ ...prev, ...updates }));
      toast.success('Saved');
    } catch (err) {
      console.error('Failed to update details:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestQuote = () => {
    setInquiryModalOpen(true);
  };

  const isDigital = type === 'digital';
  const backUrl = isDigital ? 'ProductsDigital' : 'ProductsPhysical';

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-10 w-48 bg-zinc-800/50" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-square bg-zinc-800/50 rounded-xl" />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-48 bg-zinc-800/50 rounded-xl" />
              <Skeleton className="h-24 bg-zinc-800/50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6">
          <GlassCard className="p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">{error || 'Product not found'}</h4>
            <p className="text-sm text-zinc-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('Products')}>
              <Button variant="outline" className="border-white/10 text-zinc-300">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
              </Button>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-20 right-1/4 w-96 h-96 ${isDigital ? 'bg-cyan-900/10' : 'bg-orange-900/10'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-20 left-1/4 w-80 h-80 ${isDigital ? 'bg-cyan-950/10' : 'bg-orange-950/10'} rounded-full blur-3xl`} />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Back Button */}
        <Link to={createPageUrl(backUrl)}>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isDigital ? 'Digital' : 'Physical'} Products
          </Button>
        </Link>

        {/* Content */}
        {isDigital ? (
          <DigitalProductDetail
            product={product}
            details={details}
            onUpdate={handleProductUpdate}
            onDetailsUpdate={handleDetailsUpdate}
            onRequestQuote={handleRequestQuote}
            relatedProducts={relatedProducts}
            saving={saving}
          />
        ) : (
          <PhysicalProductDetail
            product={product}
            details={details}
            supplier={supplier}
            onUpdate={handleProductUpdate}
            onDetailsUpdate={handleDetailsUpdate}
            onRequestQuote={handleRequestQuote}
            relatedProducts={relatedProducts}
            saving={saving}
          />
        )}
      </div>

      {/* Inquiry Modal */}
      <ProductInquiryModal
        open={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        product={product}
        productDetails={details}
      />
    </div>
  );
}
