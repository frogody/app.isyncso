import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, ExternalLink, Play, FileText, Euro, Check, Star,
  MessageCircle, Users, Zap, Download, Clock, Shield, Award, ChevronRight,
  Package, Truck, Building2, Barcode, Globe, Tag, CheckCircle, XCircle,
  AlertTriangle, Image as ImageIcon, Video, HelpCircle, Share2, Copy,
  Heart, ShoppingCart, Info, Layers, Ruler, Weight, MapPin, Save,
  LayoutGrid, Settings, History, FolderOpen, TrendingUp, Boxes,
  ChevronDown, MoreHorizontal, Eye, Percent, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  getProductSuppliers,
  addProductSupplier,
  removeProductSupplier,
  setPreferredSupplier,
  getProductPurchaseHistory,
  addStockPurchase
} from '@/lib/db/queries';
import { supabase } from '@/api/supabaseClient';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Published', dot: 'bg-cyan-400' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Draft', dot: 'bg-zinc-400' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived', dot: 'bg-zinc-400' },
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'pricing', label: 'Pricing', icon: Euro },
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
  if (qty <= low) return { status: 'low', label: `Low Stock (${qty})`, color: 'text-cyan-300', bgColor: 'bg-cyan-500/10', icon: AlertTriangle, percent };
  return { status: 'in', label: `In Stock (${qty})`, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', icon: CheckCircle, percent };
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
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  return (
    <div className="stat-card p-3 rounded-xl bg-zinc-900/50 border border-white/5">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <Badge variant="outline" className={cn(
            "text-[10px]",
            trend > 0 ? "border-cyan-500/30 text-cyan-400" : "border-red-500/30 text-red-400"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </Badge>
        )}
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500 mt-1">{label}</p>
      {subtext && <p className="text-[10px] text-zinc-600 mt-0.5">{subtext}</p>}
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
  saving,
  statsGridRef
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column - Images */}
      <div className="lg:col-span-1 space-y-3">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <ProductImageUploader
            images={localImages}
            featuredImage={localFeatured}
            onImagesChange={handleImagesChange}
            onFeaturedChange={handleFeaturedChange}
            maxImages={10}
          />
        </div>

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
                margin > 30 ? "text-cyan-400" : margin > 15 ? "text-cyan-300" : "text-red-400"
              )}>
                {margin ? `${margin}%` : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Details */}
      <div className="lg:col-span-2 space-y-3">
        {/* Header Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
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
        </div>

        {/* SKU & Barcode - Physical Only */}
        {isPhysical && (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-3">
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
          </div>
        )}

        {/* Description */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
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
        </div>

        {/* Key Info Grid */}
        <div ref={statsGridRef} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {isPhysical && (
            <>
              <div className="stat-card p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                <InlineEditText
                  value={details?.country_of_origin}
                  onSave={(val) => onDetailsUpdate({ country_of_origin: val })}
                  label="Origin"
                  placeholder="Country"
                  textClassName="text-sm"
                />
              </div>
              <div className="stat-card p-3 rounded-xl bg-zinc-900/50 border border-white/5">
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
            <div className="stat-card p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Building2 className="w-3 h-3" />
                <span className="text-xs">Supplier</span>
              </div>
              <p className="text-white text-sm">{supplier.name}</p>
            </div>
          )}
          <div className="stat-card p-3 rounded-xl bg-zinc-900/50 border border-white/5">
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
  const [taxIncluded, setTaxIncluded] = useState(pricing.tax_included || false);
  const TAX_RATE = 0.21; // 21% BTW

  // Sync local state with pricing
  useEffect(() => {
    setTaxIncluded(pricing.tax_included || false);
  }, [pricing.tax_included]);

  const handleTiersChange = (newTiers) => {
    onDetailsUpdate({ pricing: { ...pricing, volume_tiers: newTiers } });
  };

  // Handle cost price - user always edits the incl-BTW value (displayCostPrice)
  // We need to convert back to ex-BTW for storage
  const handleCostPriceChange = (val) => {
    if (val > 0) {
      // User entered incl-BTW price, calculate ex-BTW for storage
      const exTaxPrice = Math.round((val / (1 + TAX_RATE)) * 100) / 100;
      onDetailsUpdate({
        pricing: {
          ...pricing,
          cost_price: exTaxPrice,
        }
      });
    } else {
      onDetailsUpdate({ pricing: { ...pricing, cost_price: 0 } });
    }
  };

  // Handle tax toggle
  const handleTaxToggle = (val) => {
    setTaxIncluded(val);
    onDetailsUpdate({ pricing: { ...pricing, tax_included: val } });
  };

  // cost_price is ALWAYS stored as ex-BTW (this is the system standard)
  const costPrice = pricing.cost_price || 0;

  // Base price (ex BTW) - show the stored ex-BTW value
  const displayBasePrice = pricing.base_price || costPrice;

  // Cost price display (incl BTW) - always calculate incl-BTW for display
  const displayCostPrice = costPrice > 0
    ? Math.round(costPrice * (1 + TAX_RATE) * 100) / 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pricing Details */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-6">
            <Euro className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Pricing Details</span>
          </div>

          <div className="space-y-4">
            {/* Tax Settings - moved to top for clarity */}
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={taxIncluded}
                  onCheckedChange={handleTaxToggle}
                  className="data-[state=checked]:bg-cyan-500"
                />
                <div>
                  <span className="text-sm text-white">Invoice prices include BTW</span>
                  <p className="text-xs text-zinc-500">
                    {taxIncluded
                      ? `€${displayCostPrice.toFixed(2)} incl BTW → €${costPrice.toFixed(2)} ex BTW`
                      : 'Prices are entered without tax'
                    }
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InlineEditNumber
                value={displayBasePrice}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, base_price: val } })}
                label="Base Price (ex BTW)"
                placeholder="0.00"
                prefix={currency === 'EUR' ? '€' : '$'}
                disabled={taxIncluded}
              />
              <InlineEditNumber
                value={displayCostPrice}
                onSave={handleCostPriceChange}
                label="Cost Price (incl BTW)"
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
          </div>
        </div>

        {/* Margin Analysis */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
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
                      margin > 30 ? "text-cyan-400" : margin > 15 ? "text-cyan-300" : "text-red-400"
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
        </div>
      </div>

      {/* Volume Pricing */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <PricingTiers
          tiers={tiers}
          basePrice={pricing.base_price || 0}
          costPrice={pricing.cost_price || 0}
          currency={currency}
          onTiersChange={handleTiersChange}
        />
      </div>
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
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <DigitalPricingManager
          pricingConfig={pricingConfig}
          currency={currency}
          onConfigChange={handlePricingConfigChange}
        />
      </div>
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
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
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
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
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
    </div>
  );
}

// ============= INVENTORY SECTION =============

function InventorySection({ product, details, onDetailsUpdate, currency }) {
  const { user } = useUser();
  const physicalInventory = details?.inventory || {};  // From physical_products.inventory JSONB
  const shipping = details?.shipping || {};
  const variants = details?.variants || [];

  // Inventory table data (for incoming/reserved/on_hand from the inventory table)
  const [inventoryRecord, setInventoryRecord] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Supplier management state
  const [productSuppliers, setProductSuppliers] = useState([]);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    quantity: '',
    unit_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
  });

  // Load inventory record from inventory table
  const loadInventoryRecord = async () => {
    if (!product?.id || !user?.company_id) return;
    setLoadingInventory(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (error) throw error;
      setInventoryRecord(data);
    } catch (err) {
      console.error('Failed to load inventory record:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Load suppliers when product changes
  useEffect(() => {
    if (product?.id) {
      loadProductSuppliers();
      loadPurchaseHistory();
      loadInventoryRecord();
    }
  }, [product?.id]);

  // Load available suppliers (all company suppliers)
  useEffect(() => {
    if (user?.company_id) {
      loadAvailableSuppliers();
    }
  }, [user?.company_id]);

  const loadProductSuppliers = async () => {
    if (!product?.id) return;
    setLoadingSuppliers(true);
    try {
      const suppliers = await getProductSuppliers(product.id);
      setProductSuppliers(suppliers);
    } catch (err) {
      console.error('Failed to load product suppliers:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadAvailableSuppliers = async () => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('company_id', user.company_id)
        .order('name');
      setAvailableSuppliers(data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  const loadPurchaseHistory = async () => {
    if (!product?.id) return;
    setLoadingPurchases(true);
    try {
      const purchases = await getProductPurchaseHistory(product.id, { limit: 20 });
      setPurchaseHistory(purchases);
    } catch (err) {
      console.error('Failed to load purchase history:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!selectedSupplierId || !product?.id) return;
    const selectedSupplier = availableSuppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier) return;

    try {
      const newSupplier = await addProductSupplier({
        company_id: user.company_id,
        product_id: product.id,
        supplier_id: selectedSupplierId,
        is_preferred: productSuppliers.length === 0,
      });
      setProductSuppliers(prev => [...prev, newSupplier]);
      setSelectedSupplierId('');
      setShowAddSupplier(false);
      toast.success(`Added ${selectedSupplier.name} as supplier`);
    } catch (err) {
      console.error('Failed to add supplier:', err);
      toast.error('Failed to add supplier');
    }
  };

  const handleRemoveSupplier = async (supplierId) => {
    if (!product?.id) return;
    try {
      await removeProductSupplier(product.id, supplierId);
      setProductSuppliers(prev => prev.filter(ps => ps.supplier_id !== supplierId));
      toast.success('Supplier removed');
    } catch (err) {
      console.error('Failed to remove supplier:', err);
      toast.error('Failed to remove supplier');
    }
  };

  const handleSetPreferred = async (supplierId) => {
    if (!product?.id) return;
    try {
      await setPreferredSupplier(product.id, supplierId);
      setProductSuppliers(prev => prev.map(ps => ({
        ...ps,
        is_preferred: ps.supplier_id === supplierId,
      })));
      toast.success('Preferred supplier updated');
    } catch (err) {
      console.error('Failed to set preferred supplier:', err);
      toast.error('Failed to update preferred supplier');
    }
  };

  const handleAddPurchase = async () => {
    if (!product?.id || !purchaseForm.quantity || !purchaseForm.unit_price) {
      toast.error('Please fill in quantity and unit price');
      return;
    }

    try {
      const newPurchase = await addStockPurchase({
        company_id: user.company_id,
        product_id: product.id,
        supplier_id: purchaseForm.supplier_id || null,
        quantity: parseFloat(purchaseForm.quantity),
        unit_price: parseFloat(purchaseForm.unit_price),
        currency: currency || 'EUR',
        purchase_date: purchaseForm.purchase_date,
        invoice_number: purchaseForm.invoice_number || null,
        source_type: 'manual',
      });
      setPurchaseHistory(prev => [newPurchase, ...prev]);
      setPurchaseForm({
        supplier_id: '',
        quantity: '',
        unit_price: '',
        purchase_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
      });
      setShowAddPurchase(false);
      toast.success('Purchase recorded');
      // Reload suppliers to get updated pricing
      loadProductSuppliers();
    } catch (err) {
      console.error('Failed to add purchase:', err);
      toast.error('Failed to record purchase');
    }
  };

  const handleInventoryUpdate = (field, value) => {
    onDetailsUpdate({ inventory: { ...physicalInventory, [field]: value } });
  };

  const handleShippingUpdate = (field, value) => {
    onDetailsUpdate({ shipping: { ...shipping, [field]: value } });
  };

  const handleVariantsChange = (newVariants) => {
    onDetailsUpdate({ variants: newVariants });
  };

  // Merge inventory data: use inventory table values when available, fallback to physical_products JSONB
  const mergedInventory = {
    quantity: inventoryRecord?.quantity_on_hand ?? physicalInventory.quantity ?? 0,
    low_stock_threshold: physicalInventory.low_stock_threshold ?? 10,
    reserved: inventoryRecord?.quantity_reserved ?? physicalInventory.reserved ?? 0,
    incoming: inventoryRecord?.quantity_incoming ?? physicalInventory.incoming ?? 0,
    reorder_point: physicalInventory.reorder_point,
    reorder_quantity: physicalInventory.reorder_quantity,
    track_inventory: physicalInventory.track_inventory,
    allow_backorder: physicalInventory.allow_backorder,
  };

  const stock = getStockStatus(mergedInventory);

  // Filter out suppliers already linked to product
  const unlinkedSuppliers = availableSuppliers.filter(
    s => !productSuppliers.some(ps => ps.supplier_id === s.id)
  );

  return (
    <div className="space-y-4">
      {/* Stock Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label="Current Stock"
          value={formatNumber(mergedInventory.quantity)}
          color={stock.status === 'out' ? 'red' : 'cyan'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Alert"
          value={formatNumber(mergedInventory.low_stock_threshold)}
          color="cyan"
        />
        <StatCard
          icon={Boxes}
          label="Reserved"
          value={formatNumber(mergedInventory.reserved)}
          color="cyan"
        />
        <StatCard
          icon={Truck}
          label="Incoming"
          value={formatNumber(mergedInventory.incoming)}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Management */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Stock Management</span>
          </div>

          <div className="space-y-4">
            <InlineEditNumber
              value={physicalInventory.quantity}
              onSave={(val) => handleInventoryUpdate('quantity', val)}
              label="Quantity in Stock"
              placeholder="0"
              min={0}
            />
            <InlineEditNumber
              value={physicalInventory.low_stock_threshold}
              onSave={(val) => handleInventoryUpdate('low_stock_threshold', val)}
              label="Low Stock Threshold"
              placeholder="10"
              min={0}
            />
            <InlineEditNumber
              value={physicalInventory.reorder_point}
              onSave={(val) => handleInventoryUpdate('reorder_point', val)}
              label="Reorder Point"
              placeholder="20"
              min={0}
            />
            <InlineEditNumber
              value={physicalInventory.reorder_quantity}
              onSave={(val) => handleInventoryUpdate('reorder_quantity', val)}
              label="Reorder Quantity"
              placeholder="50"
              min={0}
            />

            <div className="pt-4 border-t border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={physicalInventory.track_inventory !== false}
                  onCheckedChange={(val) => handleInventoryUpdate('track_inventory', val)}
                />
                <span className="text-sm text-zinc-300">Track inventory</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-3">
                <Switch
                  checked={physicalInventory.allow_backorder || false}
                  onCheckedChange={(val) => handleInventoryUpdate('allow_backorder', val)}
                />
                <span className="text-sm text-zinc-300">Allow backorders</span>
              </label>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
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
        </div>
      </div>

      {/* Suppliers Section */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Suppliers</span>
            {productSuppliers.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-300">
                {productSuppliers.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSupplier(true)}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            disabled={unlinkedSuppliers.length === 0}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Add Supplier Form */}
        {showAddSupplier && (
          <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-white/5 space-y-3">
            <Label className="text-zinc-400">Select Supplier</Label>
            <div className="flex gap-2">
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="flex-1 bg-zinc-800/50 border-white/10">
                  <SelectValue placeholder="Choose a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddSupplier} disabled={!selectedSupplierId} size="sm">
                Add
              </Button>
              <Button variant="ghost" onClick={() => {setShowAddSupplier(false); setSelectedSupplierId('');}} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Suppliers List */}
        {loadingSuppliers ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : productSuppliers.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No suppliers linked yet</p>
            <p className="text-xs text-zinc-600 mt-1">Add suppliers to track purchase pricing</p>
          </div>
        ) : (
          <div className="space-y-2">
            {productSuppliers.map(ps => (
              <div
                key={ps.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  ps.is_preferred
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    ps.is_preferred ? "bg-cyan-500/20" : "bg-zinc-800"
                  )}>
                    <Building2 className={cn(
                      "w-4 h-4",
                      ps.is_preferred ? "text-cyan-400" : "text-zinc-400"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{ps.suppliers?.name || 'Unknown'}</span>
                      {ps.is_preferred && (
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                          <Star className="w-3 h-3 mr-1" />
                          Preferred
                        </Badge>
                      )}
                    </div>
                    {ps.last_purchase_price && (
                      <p className="text-sm text-zinc-400">
                        Last: {formatPrice(ps.last_purchase_price, currency)}
                        {ps.last_purchase_date && (
                          <span className="text-zinc-500 ml-1">
                            ({new Date(ps.last_purchase_date).toLocaleDateString()})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!ps.is_preferred && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetPreferred(ps.supplier_id)}
                      className="text-zinc-400 hover:text-cyan-400"
                      title="Set as preferred"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSupplier(ps.supplier_id)}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase History Section */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Purchase History</span>
            {purchaseHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-300">
                {purchaseHistory.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddPurchase(true)}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Euro className="w-4 h-4 mr-2" />
            Add Purchase
          </Button>
        </div>

        {/* Add Purchase Form */}
        {showAddPurchase && (
          <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 mb-1.5 block">Supplier (optional)</Label>
                <Select
                  value={purchaseForm.supplier_id}
                  onValueChange={(val) => setPurchaseForm(prev => ({...prev, supplier_id: val}))}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-white/10">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSuppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400 mb-1.5 block">Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, purchase_date: e.target.value}))}
                  className="bg-zinc-800/50 border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-400 mb-1.5 block">Quantity *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, quantity: e.target.value}))}
                  className="bg-zinc-800/50 border-white/10"
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <Label className="text-zinc-400 mb-1.5 block">Unit Price *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={purchaseForm.unit_price}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, unit_price: e.target.value}))}
                  className="bg-zinc-800/50 border-white/10"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-zinc-400 mb-1.5 block">Invoice # (optional)</Label>
                <Input
                  placeholder="INV-001"
                  value={purchaseForm.invoice_number}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, invoice_number: e.target.value}))}
                  className="bg-zinc-800/50 border-white/10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddPurchase(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPurchase} className="bg-cyan-600 hover:bg-cyan-700">
                Record Purchase
              </Button>
            </div>
          </div>
        )}

        {/* Purchase History Table */}
        {loadingPurchases ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : purchaseHistory.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No purchase history yet</p>
            <p className="text-xs text-zinc-600 mt-1">Purchases from invoices will appear here automatically</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Supplier</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Qty</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Total</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Invoice</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {purchaseHistory.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-white/2">
                    <td className="py-3 text-sm text-zinc-300">
                      {new Date(purchase.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm text-white">
                      {purchase.suppliers?.name || <span className="text-zinc-500">-</span>}
                    </td>
                    <td className="py-3 text-sm text-zinc-300 text-right">
                      {formatNumber(purchase.quantity)}
                    </td>
                    <td className="py-3 text-sm text-zinc-300 text-right">
                      {formatPrice(purchase.unit_price, purchase.currency)}
                    </td>
                    <td className="py-3 text-sm text-white font-medium text-right">
                      {formatPrice(purchase.total_amount, purchase.currency)}
                    </td>
                    <td className="py-3 text-sm text-zinc-400 font-mono">
                      {purchase.invoice_number || <span className="text-zinc-600">-</span>}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          purchase.source_type === 'invoice'
                            ? "border-blue-500/30 text-blue-400"
                            : "border-zinc-500/30 text-zinc-400"
                        )}
                      >
                        {purchase.source_type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
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
      </div>

      {attributes.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Attributes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attributes.map((attr, index) => (
              <div key={index} className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                <p className="text-xs text-zinc-500 mb-1">{attr.name}</p>
                <p className="text-sm text-white">{attr.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {details?.certifications && details.certifications.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Certifications</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {details.certifications.map((cert, index) => (
              <Badge key={index} className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                {cert.name || cert}
              </Badge>
            ))}
          </div>
        </div>
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
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <DocumentsSection
        documents={documents}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ============= ACTIVITY SECTION =============

function ActivitySectionWrapper({ product, details }) {
  const activities = useMemo(() => {
    return generateMockActivities(product, details);
  }, [product, details]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-6">
        <History className="w-5 h-5 text-cyan-400" />
        <span className="font-medium text-white">Activity History</span>
      </div>

      <ActivityTimeline activities={activities} maxItems={20} />
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
  const [activeSection, setActiveSection] = useState('overview');

  // Modal states
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const statsGridRef = useRef(null);

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
      // digital_products and physical_products use product_id as primary key, not id
      const detailsId = details.product_id || details.id;

      if (type === 'digital') {
        await DigitalProduct.update(detailsId, updates);
      } else {
        await PhysicalProduct.update(detailsId, updates);
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
      <div className="min-h-screen bg-black">
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
          <Skeleton className="h-10 w-48 bg-zinc-800/50" />
          <Skeleton className="h-12 w-full bg-zinc-800/50 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
      <div className="min-h-screen bg-black">
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 text-center max-w-md mx-auto">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
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
        <div>
            {activeSection === 'overview' && (
              <OverviewSection
                product={product}
                details={details}
                supplier={supplier}
                isPhysical={isPhysical}
                onUpdate={handleProductUpdate}
                onDetailsUpdate={handleDetailsUpdate}
                saving={saving}
                statsGridRef={statsGridRef}
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
                product={product}
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
        </div>

        {/* Related Products */}
        {activeSection === 'overview' && relatedProducts.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Related Products
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
