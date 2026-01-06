import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, ExternalLink, Play, FileText, DollarSign, Check, Star,
  MessageCircle, Users, Zap, Download, Clock, Shield, Award, ChevronRight,
  Package, Truck, Building2, Barcode, Globe, Tag, CheckCircle, XCircle,
  AlertTriangle, Image as ImageIcon, Video, HelpCircle, Share2, Copy,
  Heart, ShoppingCart, Info, Layers, Ruler, Weight, MapPin, Save,
  LayoutGrid, Settings, History, FolderOpen, TrendingUp, Boxes,
  ChevronDown, MoreHorizontal, Eye, Percent, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, PhysicalProduct, Supplier, ProductBundle } from "@/api/entities";
import {
  MediaGallery,
  SpecificationsTable,
  ProductInquiryModal,
  ProductGridCard,
  BarcodeDisplay,
  ProductImageUploader,
  InlineEditText,
  InlineEditNumber,
  InlineEditSelect,
  ActivityTimeline,
  generateMockActivities,
  QuickActions,
  DocumentsSection,
  PricingTiers,
  VariantsManager,
  DigitalPricingManager,
  BundleManager,
  BundleEditor
} from "@/components/products";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============= CONSTANTS =============

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
  published: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Published', dot: 'bg-green-400' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Draft', dot: 'bg-amber-400' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived', dot: 'bg-zinc-400' },
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'inventory', label: 'Inventory', icon: Package, physicalOnly: true },
  { id: 'specs', label: 'Specifications', icon: Settings, physicalOnly: true },
  { id: 'bundles', label: 'Bundles', icon: Layers, digitalOnly: true },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'activity', label: 'Activity', icon: History },
];

// ============= HELPERS =============

function getStockStatus(inventory) {
  if (!inventory) return { status: 'unknown', label: 'Unknown', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', icon: Info, percent: 0 };
  const qty = inventory.quantity || 0;
  const low = inventory.low_stock_threshold || 10;
  const max = inventory.max_quantity || 100;
  const percent = Math.min((qty / max) * 100, 100);

  if (qty <= 0) return { status: 'out', label: 'Out of Stock', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle, percent: 0 };
  if (qty <= low) return { status: 'low', label: `Low Stock (${qty})`, color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertTriangle, percent };
  return { status: 'in', label: `In Stock (${qty})`, color: 'text-green-400', bgColor: 'bg-green-500/10', icon: CheckCircle, percent };
}

function formatPrice(price, currency = 'EUR') {
  if (!price && price !== 0) return null;
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(num);
}

function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return new Intl.NumberFormat('en-US').format(num);
}

// ============= SUB-COMPONENTS =============

function StatusBadge({ status }) {
  const config = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", config.bg, config.text)}>
      <span className={cn("w-2 h-2 rounded-full animate-pulse", config.dot)} />
      {config.label}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, trend, color = "cyan" }) {
  const colors = {
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <Badge variant="outline" className={cn(
            "text-xs",
            trend > 0 ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {subtext && <p className="text-xs text-zinc-600 mt-0.5">{subtext}</p>}
    </div>
  );
}

function SectionNav({ activeSection, onSectionChange, isPhysical }) {
  const items = NAV_ITEMS.filter(item => {
    if (item.physicalOnly && !isPhysical) return false;
    if (item.digitalOnly && isPhysical) return false;
    return true;
  });

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-lg border border-white/5 overflow-x-auto">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              isActive
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ============= OVERVIEW SECTION =============

function OverviewSection({
  product,
  details,
  supplier,
  isPhysical,
  onUpdate,
  onDetailsUpdate,
  saving
}) {
  const [localImages, setLocalImages] = useState(product.gallery || []);
  const [localFeatured, setLocalFeatured] = useState(product.featured_image);
  const pricing = details?.pricing || {};
  const inventory = details?.inventory || {};
  const stock = getStockStatus(inventory);
  const StockIcon = stock.icon;

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

  const margin = pricing.base_price && pricing.cost_price
    ? ((pricing.base_price - pricing.cost_price) / pricing.base_price * 100).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Images */}
      <div className="lg:col-span-1 space-y-4">
        <GlassCard className="p-4">
          <ProductImageUploader
            images={localImages}
            featuredImage={localFeatured}
            onImagesChange={handleImagesChange}
            onFeaturedChange={handleFeaturedChange}
            maxImages={10}
          />
        </GlassCard>

        {/* Quick Stats */}
        {isPhysical && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
              <p className="text-xs text-zinc-500">Stock Level</p>
              <div className="mt-2">
                <Progress value={stock.percent} className="h-2" />
                <p className={cn("text-sm font-medium mt-1", stock.color)}>
                  {inventory.quantity || 0} units
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
              <p className="text-xs text-zinc-500">Margin</p>
              <p className={cn(
                "text-xl font-bold mt-1",
                margin > 30 ? "text-green-400" : margin > 15 ? "text-amber-400" : "text-red-400"
              )}>
                {margin ? `${margin}%` : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Details */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header Card */}
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={product.status} />
                {saving && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Saving...</span>
                  </div>
                )}
              </div>

              <InlineEditText
                value={product.name}
                onSave={(val) => onUpdate({ name: val })}
                placeholder="Product name"
                textClassName="text-2xl font-bold"
              />

              <InlineEditText
                value={product.tagline}
                onSave={(val) => onUpdate({ tagline: val })}
                placeholder="Add a tagline..."
                textClassName="text-zinc-400"
              />
            </div>
          </div>

          {/* Price & Stock Row */}
          <div className="flex flex-wrap items-end gap-6 pt-4 border-t border-white/5">
            <div className="space-y-1">
              <div className="text-xs text-zinc-500">Price</div>
              <div className="flex items-baseline gap-2">
                <InlineEditNumber
                  value={pricing.base_price}
                  onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, base_price: val } })}
                  placeholder="0.00"
                  prefix={pricing.currency === 'EUR' ? '€' : '$'}
                  textClassName="text-3xl font-bold"
                />
                <InlineEditSelect
                  value={pricing.currency || 'EUR'}
                  options={CURRENCY_OPTIONS}
                  onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, currency: val } })}
                />
              </div>
            </div>

            <div className="flex-1" />

            {isPhysical && (
              <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", stock.bgColor)}>
                <StockIcon className={cn("w-5 h-5", stock.color)} />
                <span className={cn("font-medium", stock.color)}>{stock.label}</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* SKU & Barcode - Physical Only */}
        {isPhysical && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-4">
              <div className="grid grid-cols-2 gap-4 flex-1">
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
        )}

        {/* Description */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Description</span>
          </div>
          <InlineEditText
            value={product.description}
            onSave={(val) => onUpdate({ description: val })}
            placeholder="Add a product description..."
            multiline
            rows={4}
            textClassName="text-zinc-300 whitespace-pre-wrap leading-relaxed"
          />
        </GlassCard>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isPhysical && (
            <>
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                <InlineEditText
                  value={details?.country_of_origin}
                  onSave={(val) => onDetailsUpdate({ country_of_origin: val })}
                  label="Origin"
                  placeholder="Country"
                  textClassName="text-sm"
                />
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                <InlineEditText
                  value={details?.mpn}
                  onSave={(val) => onDetailsUpdate({ mpn: val })}
                  label="MPN"
                  placeholder="Part Number"
                  textClassName="font-mono text-sm"
                />
              </div>
            </>
          )}
          {supplier && (
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Building2 className="w-3 h-3" />
                <span className="text-xs">Supplier</span>
              </div>
              <p className="text-white text-sm">{supplier.name}</p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
            <InlineEditText
              value={product.category}
              onSave={(val) => onUpdate({ category: val })}
              label="Category"
              placeholder="Add category"
              textClassName="text-sm"
            />
          </div>
        </div>

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
      </div>
    </div>
  );
}

// ============= PRICING SECTION =============

function PricingSection({ details, onDetailsUpdate, currency }) {
  const pricing = details?.pricing || {};
  const tiers = pricing.volume_tiers || [];

  const handleTiersChange = (newTiers) => {
    onDetailsUpdate({ pricing: { ...pricing, volume_tiers: newTiers } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Details */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Pricing Details</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InlineEditNumber
                value={pricing.base_price}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, base_price: val } })}
                label="Base Price"
                placeholder="0.00"
                prefix={currency === 'EUR' ? '€' : '$'}
              />
              <InlineEditNumber
                value={pricing.cost_price}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, cost_price: val } })}
                label="Cost Price"
                placeholder="0.00"
                prefix={currency === 'EUR' ? '€' : '$'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InlineEditNumber
                value={pricing.compare_at_price}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, compare_at_price: val } })}
                label="Compare at Price"
                placeholder="0.00"
                prefix={currency === 'EUR' ? '€' : '$'}
              />
              <InlineEditNumber
                value={pricing.wholesale_price}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, wholesale_price: val } })}
                label="Wholesale Price"
                placeholder="0.00"
                prefix={currency === 'EUR' ? '€' : '$'}
              />
            </div>

            {/* Tax Settings */}
            <div className="pt-4 border-t border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={pricing.tax_included || false}
                  onCheckedChange={(val) => onDetailsUpdate({ pricing: { ...pricing, tax_included: val } })}
                />
                <span className="text-sm text-zinc-300">Price includes tax</span>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Margin Analysis */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="font-medium text-white">Margin Analysis</span>
          </div>

          <div className="space-y-4">
            {(() => {
              const base = pricing.base_price || 0;
              const cost = pricing.cost_price || 0;
              const profit = base - cost;
              const margin = base > 0 ? ((profit / base) * 100).toFixed(1) : 0;
              const markup = cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0;

              return (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-400">Gross Profit</span>
                    <span className="text-lg font-bold text-white">
                      {formatPrice(profit, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-400">Profit Margin</span>
                    <span className={cn(
                      "text-lg font-bold",
                      margin > 30 ? "text-green-400" : margin > 15 ? "text-amber-400" : "text-red-400"
                    )}>
                      {margin}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-400">Markup</span>
                    <span className="text-lg font-bold text-white">{markup}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </GlassCard>
      </div>

      {/* Volume Pricing */}
      <GlassCard className="p-6">
        <PricingTiers
          tiers={tiers}
          basePrice={pricing.base_price || 0}
          costPrice={pricing.cost_price || 0}
          currency={currency}
          onTiersChange={handleTiersChange}
        />
      </GlassCard>
    </div>
  );
}

// ============= DIGITAL PRICING SECTION =============

function DigitalPricingSection({ details, onDetailsUpdate, currency }) {
  const pricingConfig = details?.pricing_config || {};

  const handlePricingConfigChange = (newConfig) => {
    onDetailsUpdate({ pricing_config: newConfig });
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <DigitalPricingManager
          pricingConfig={pricingConfig}
          currency={currency}
          onConfigChange={handlePricingConfigChange}
        />
      </GlassCard>
    </div>
  );
}

// ============= BUNDLES SECTION =============

function BundlesSection({ product, details, currency }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user } = useUser();

  const loadBundles = async () => {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      // Load bundles that include this product
      const allBundles = await ProductBundle.filter({
        company_id: user.company_id
      });

      // Filter to bundles containing this product
      const productBundles = allBundles.filter(bundle =>
        bundle.items?.some(item => item.product_id === product?.id)
      );

      setBundles(productBundles);
    } catch (err) {
      console.error('Failed to load bundles:', err);
      toast.error('Failed to load bundles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBundles();
  }, [product?.id, user?.company_id]);

  const handleCreateBundle = () => {
    // Pre-populate with current product
    const newBundle = {
      name: '',
      description: '',
      bundle_type: 'fixed',
      pricing_strategy: 'discount',
      discount_percent: 10,
      items: product ? [{
        id: `item_${Date.now().toString(36)}`,
        product_id: product.id,
        product_type: 'digital',
        name: product.name,
        price: details?.pricing?.base_price || 0,
        quantity: 1
      }] : [],
      status: 'draft'
    };
    setEditingBundle(newBundle);
    setShowEditor(true);
  };

  const handleEditBundle = (bundle) => {
    setEditingBundle(bundle);
    setShowEditor(true);
  };

  const handleDuplicateBundle = async (bundle) => {
    try {
      const duplicated = {
        ...bundle,
        id: undefined,
        name: `${bundle.name} (Copy)`,
        status: 'draft',
        created_at: undefined,
        updated_at: undefined
      };
      await ProductBundle.create({
        ...duplicated,
        company_id: user?.company_id
      });
      toast.success('Bundle duplicated');
      loadBundles();
    } catch (err) {
      console.error('Failed to duplicate bundle:', err);
      toast.error('Failed to duplicate bundle');
    }
  };

  const handleArchiveBundle = async (bundle) => {
    try {
      const newStatus = bundle.status === 'archived' ? 'draft' : 'archived';
      await ProductBundle.update(bundle.id, { status: newStatus });
      toast.success(newStatus === 'archived' ? 'Bundle archived' : 'Bundle unarchived');
      loadBundles();
    } catch (err) {
      console.error('Failed to archive bundle:', err);
      toast.error('Failed to update bundle');
    }
  };

  const handleDeleteBundle = async (bundle) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

    try {
      await ProductBundle.delete(bundle.id);
      toast.success('Bundle deleted');
      loadBundles();
    } catch (err) {
      console.error('Failed to delete bundle:', err);
      toast.error('Failed to delete bundle');
    }
  };

  const handleSaveBundle = async (bundleData) => {
    setSaving(true);
    try {
      if (bundleData.id) {
        await ProductBundle.update(bundleData.id, bundleData);
        toast.success('Bundle updated');
      } else {
        await ProductBundle.create({
          ...bundleData,
          company_id: user?.company_id
        });
        toast.success('Bundle created');
      }
      setShowEditor(false);
      setEditingBundle(null);
      loadBundles();
    } catch (err) {
      console.error('Failed to save bundle:', err);
      toast.error('Failed to save bundle');
    } finally {
      setSaving(false);
    }
  };

  if (showEditor) {
    return (
      <GlassCard className="p-6">
        <BundleEditor
          bundle={editingBundle}
          currency={currency}
          onSave={handleSaveBundle}
          onCancel={() => {
            setShowEditor(false);
            setEditingBundle(null);
          }}
          saving={saving}
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <BundleManager
        bundles={bundles}
        currency={currency}
        loading={loading}
        onCreateBundle={handleCreateBundle}
        onEditBundle={handleEditBundle}
        onDuplicateBundle={handleDuplicateBundle}
        onArchiveBundle={handleArchiveBundle}
        onDeleteBundle={handleDeleteBundle}
      />
    </GlassCard>
  );
}

// ============= INVENTORY SECTION =============

function InventorySection({ details, onDetailsUpdate, currency }) {
  const inventory = details?.inventory || {};
  const shipping = details?.shipping || {};
  const variants = details?.variants || [];

  const handleInventoryUpdate = (field, value) => {
    onDetailsUpdate({ inventory: { ...inventory, [field]: value } });
  };

  const handleShippingUpdate = (field, value) => {
    onDetailsUpdate({ shipping: { ...shipping, [field]: value } });
  };

  const handleVariantsChange = (newVariants) => {
    onDetailsUpdate({ variants: newVariants });
  };

  const stock = getStockStatus(inventory);

  return (
    <div className="space-y-6">
      {/* Stock Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Current Stock"
          value={formatNumber(inventory.quantity || 0)}
          color={stock.status === 'out' ? 'red' : stock.status === 'low' ? 'amber' : 'green'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Alert"
          value={formatNumber(inventory.low_stock_threshold || 10)}
          color="amber"
        />
        <StatCard
          icon={Boxes}
          label="Reserved"
          value={formatNumber(inventory.reserved || 0)}
          color="blue"
        />
        <StatCard
          icon={Truck}
          label="Incoming"
          value={formatNumber(inventory.incoming || 0)}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Management */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Stock Management</span>
          </div>

          <div className="space-y-4">
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
              placeholder="10"
              min={0}
            />
            <InlineEditNumber
              value={inventory.reorder_point}
              onSave={(val) => handleInventoryUpdate('reorder_point', val)}
              label="Reorder Point"
              placeholder="20"
              min={0}
            />
            <InlineEditNumber
              value={inventory.reorder_quantity}
              onSave={(val) => handleInventoryUpdate('reorder_quantity', val)}
              label="Reorder Quantity"
              placeholder="50"
              min={0}
            />

            <div className="pt-4 border-t border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={inventory.track_inventory !== false}
                  onCheckedChange={(val) => handleInventoryUpdate('track_inventory', val)}
                />
                <span className="text-sm text-zinc-300">Track inventory</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-3">
                <Switch
                  checked={inventory.allow_backorder || false}
                  onCheckedChange={(val) => handleInventoryUpdate('allow_backorder', val)}
                />
                <span className="text-sm text-zinc-300">Allow backorders</span>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Shipping Info */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Truck className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">Shipping Details</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InlineEditNumber
                value={shipping.weight}
                onSave={(val) => handleShippingUpdate('weight', val)}
                label="Weight"
                placeholder="0"
                suffix=" kg"
                step={0.1}
              />
              <InlineEditNumber
                value={shipping.length}
                onSave={(val) => handleShippingUpdate('length', val)}
                label="Length"
                placeholder="0"
                suffix=" cm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InlineEditNumber
                value={shipping.width}
                onSave={(val) => handleShippingUpdate('width', val)}
                label="Width"
                placeholder="0"
                suffix=" cm"
              />
              <InlineEditNumber
                value={shipping.height}
                onSave={(val) => handleShippingUpdate('height', val)}
                label="Height"
                placeholder="0"
                suffix=" cm"
              />
            </div>
            <InlineEditText
              value={shipping.shipping_class}
              onSave={(val) => handleShippingUpdate('shipping_class', val)}
              label="Shipping Class"
              placeholder="Standard"
            />
          </div>
        </GlassCard>
      </div>

      {/* Variants */}
      <VariantsManager
        variants={variants}
        basePrice={details?.pricing?.base_price || 0}
        currency={currency}
        onVariantsChange={handleVariantsChange}
      />
    </div>
  );
}

// ============= SPECIFICATIONS SECTION =============

function SpecificationsSection({ details, onDetailsUpdate }) {
  const specs = details?.specifications || [];
  const attributes = details?.attributes || [];

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">Technical Specifications</span>
        </div>

        {specs.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No specifications added yet</p>
            <p className="text-xs text-zinc-600 mt-1">Add technical details like dimensions, materials, etc.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {specs.map((spec, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                <span className="text-zinc-400">{spec.name}</span>
                <span className="text-white font-medium">{spec.value}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {attributes.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-white">Attributes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {attributes.map((attr, index) => (
              <div key={index} className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                <p className="text-xs text-zinc-500 mb-1">{attr.name}</p>
                <p className="text-sm text-white">{attr.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Certifications */}
      {details?.certifications && details.certifications.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="font-medium text-white">Certifications</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {details.certifications.map((cert, index) => (
              <Badge key={index} className="bg-green-500/10 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                {cert.name || cert}
              </Badge>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ============= DOCUMENTS SECTION =============

function DocumentsSectionWrapper({ details, onDetailsUpdate }) {
  const documents = details?.documents || [];

  const handleUpload = async (file) => {
    // In a real implementation, upload to storage
    const newDoc = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      category: 'other',
      uploaded_at: new Date().toISOString(),
    };
    onDetailsUpdate({ documents: [...documents, newDoc] });
  };

  const handleDelete = (doc) => {
    const newDocs = documents.filter(d => d.id !== doc.id);
    onDetailsUpdate({ documents: newDocs });
    toast.success('Document removed');
  };

  return (
    <GlassCard className="p-6">
      <DocumentsSection
        documents={documents}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />
    </GlassCard>
  );
}

// ============= ACTIVITY SECTION =============

function ActivitySectionWrapper({ product, details }) {
  const activities = useMemo(() => {
    return generateMockActivities(product, details);
  }, [product, details]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <History className="w-5 h-5 text-cyan-400" />
        <span className="font-medium text-white">Activity History</span>
      </div>

      <ActivityTimeline activities={activities} maxItems={20} />
    </GlassCard>
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
  const [activeSection, setActiveSection] = useState('overview');

  // Modal states
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const isPhysical = type === 'physical';
  const currency = details?.pricing?.currency || 'EUR';

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
            try {
              const supplierData = await Supplier.get(physicalData[0].supplier_id);
              if (supplierData) setSupplier(supplierData);
            } catch (err) {
              console.log('Could not load supplier:', err);
            }
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

  // Handle product update
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

  // Handle details update
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

  // Quick action handlers
  const handleDuplicate = async () => {
    toast.success('Product duplicated');
  };

  const handleArchive = async (archive = true) => {
    await handleProductUpdate({ status: archive ? 'archived' : 'draft' });
  };

  const handlePublish = async (publish = true) => {
    await handleProductUpdate({
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null
    });
  };

  const handleAdjustStock = async (adjustment, reason) => {
    const inventory = details?.inventory || {};
    const newQuantity = (inventory.quantity || 0) + adjustment;
    await handleDetailsUpdate({
      inventory: { ...inventory, quantity: Math.max(0, newQuantity) }
    });
  };

  const handleRequestQuote = () => {
    setInquiryModalOpen(true);
  };

  const backUrl = isPhysical ? 'ProductsPhysical' : 'ProductsDigital';

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-10 w-48 bg-zinc-800/50" />
          <Skeleton className="h-12 w-full bg-zinc-800/50 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="aspect-square bg-zinc-800/50 rounded-xl" />
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 bg-zinc-800/50 rounded-xl" />
              <Skeleton className="h-32 bg-zinc-800/50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
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
        <div className={cn(
          "absolute top-20 right-1/4 w-96 h-96 rounded-full blur-3xl",
          'bg-cyan-900/10'
        )} />
        <div className={cn(
          "absolute bottom-20 left-1/4 w-80 h-80 rounded-full blur-3xl",
          'bg-cyan-950/10'
        )} />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl(backUrl)}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-lg font-semibold text-white truncate max-w-md">
              {product.name}
            </h1>
          </div>

          <QuickActions
            product={product}
            details={details}
            onDuplicate={handleDuplicate}
            onArchive={handleArchive}
            onPublish={handlePublish}
            onAdjustStock={handleAdjustStock}
            isPhysical={isPhysical}
          />
        </div>

        {/* Section Navigation */}
        <SectionNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isPhysical={isPhysical}
        />

        {/* Section Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'overview' && (
              <OverviewSection
                product={product}
                details={details}
                supplier={supplier}
                isPhysical={isPhysical}
                onUpdate={handleProductUpdate}
                onDetailsUpdate={handleDetailsUpdate}
                saving={saving}
              />
            )}

            {activeSection === 'pricing' && (
              isPhysical ? (
                <PricingSection
                  details={details}
                  onDetailsUpdate={handleDetailsUpdate}
                  currency={currency}
                />
              ) : (
                <DigitalPricingSection
                  details={details}
                  onDetailsUpdate={handleDetailsUpdate}
                  currency={currency}
                />
              )
            )}

            {activeSection === 'inventory' && isPhysical && (
              <InventorySection
                details={details}
                onDetailsUpdate={handleDetailsUpdate}
                currency={currency}
              />
            )}

            {activeSection === 'specs' && isPhysical && (
              <SpecificationsSection
                details={details}
                onDetailsUpdate={handleDetailsUpdate}
              />
            )}

            {activeSection === 'bundles' && !isPhysical && (
              <BundlesSection
                product={product}
                details={details}
                currency={currency}
              />
            )}

            {activeSection === 'documents' && (
              <DocumentsSectionWrapper
                details={details}
                onDetailsUpdate={handleDetailsUpdate}
              />
            )}

            {activeSection === 'activity' && (
              <ActivitySectionWrapper
                product={product}
                details={details}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Related Products */}
        {activeSection === 'overview' && relatedProducts.length > 0 && (
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
