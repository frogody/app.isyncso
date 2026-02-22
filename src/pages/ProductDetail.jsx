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
  ChevronDown, MoreHorizontal, Eye, Percent, Calculator, Briefcase, ClipboardList, Plus,
  Megaphone, Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, PhysicalProduct, ServiceProduct, Supplier, ProductBundle } from "@/api/entities";
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
  ServicePricingManager,
  BundleManager,
  BundleEditor
} from "@/components/products";
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';
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
import { calculateDiffs, logProductActivity } from '@/lib/audit';
import { ProductListingBuilder } from '@/components/products/listing';
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
  { value: 'EUR', label: 'EUR' },
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
  { id: 'deliverables', label: 'Deliverables', icon: ClipboardList, serviceOnly: true },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'listing', label: 'Product Listing', icon: Megaphone, physicalOnly: true },
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
  const { t } = useTheme();
  const colors = {
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  return (
    <div className={cn("stat-card p-3 rounded-xl border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
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
      <p className={cn("text-lg font-bold", t('text-slate-900', 'text-white'))}>{value}</p>
      <p className={cn("text-[10px] mt-1", t('text-slate-500', 'text-zinc-500'))}>{label}</p>
      {subtext && <p className={cn("text-[10px] mt-0.5", t('text-slate-400', 'text-zinc-600'))}>{subtext}</p>}
    </div>
  );
}

function SectionNav({ activeSection, onSectionChange, productType }) {
  const { t } = useTheme();
  const isPhysical = productType === 'physical';
  const isService = productType === 'service';
  const isDigital = productType === 'digital';
  const items = NAV_ITEMS.filter(item => {
    if (item.physicalOnly && !isPhysical) return false;
    if (item.digitalOnly && !isDigital) return false;
    if (item.serviceOnly && !isService) return false;
    return true;
  });

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-lg border overflow-x-auto", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              item.id === 'listing' && 'ml-auto',
              item.id === 'listing' && !isActive
                ? "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                : isActive
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : cn(t('text-slate-500', 'text-zinc-400'), t('hover:text-slate-900', 'hover:text-white'), "hover:bg-white/5")
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
  const { t } = useTheme();
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
        <div className={cn("border rounded-xl p-3", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <ProductImageUploader
            images={localImages}
            featuredImage={localFeatured}
            onImagesChange={handleImagesChange}
            onFeaturedChange={handleFeaturedChange}
            maxImages={50}
          />
        </div>

        {/* Quick Stats */}
        {isPhysical && (
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("p-3 rounded-lg border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
              <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>Stock Level</p>
              <div className="mt-2">
                <Progress value={stock.percent} className="h-2" />
                <p className={cn("text-sm font-medium mt-1", stock.color)}>
                  {inventory.quantity || 0} units
                </p>
              </div>
            </div>
            <div className={cn("p-3 rounded-lg border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
              <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>Margin</p>
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
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
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
          <div className={cn("flex flex-wrap items-end gap-6 pt-4 border-t", t('border-slate-200', 'border-white/5'))}>
            <div className="space-y-1">
              <div className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>Price</div>
              <div className="flex items-baseline gap-2">
                <InlineEditNumber
                  value={pricing.base_price}
                  onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, base_price: val } })}
                  placeholder="0.00"
                  prefix={'€'}
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
          <div className={cn("border rounded-xl p-3", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
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
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Description</span>
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
              <div className={cn("stat-card p-3 rounded-xl border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
                <InlineEditText
                  value={details?.country_of_origin}
                  onSave={(val) => onDetailsUpdate({ country_of_origin: val })}
                  label="Origin"
                  placeholder="Country"
                  textClassName="text-sm"
                />
              </div>
              <div className={cn("stat-card p-3 rounded-xl border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
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
            <div className={cn("stat-card p-3 rounded-xl border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
              <div className={cn("flex items-center gap-2 mb-1", t('text-slate-500', 'text-zinc-500'))}>
                <Building2 className="w-3 h-3" />
                <span className="text-xs">Supplier</span>
              </div>
              <p className={cn("text-sm", t('text-slate-900', 'text-white'))}>{supplier.name}</p>
            </div>
          )}
          <div className={cn("stat-card p-3 rounded-xl border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
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
              <Badge key={i} variant="outline" className={cn(t('border-slate-200', 'border-white/10'), t('text-slate-500', 'text-zinc-400'))}>
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
  const { t } = useTheme();
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
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-6">
            <Euro className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Pricing Details</span>
          </div>

          <div className="space-y-4">
            {/* Tax Settings - moved to top for clarity */}
            <div className={cn("p-3 rounded-lg border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={taxIncluded}
                  onCheckedChange={handleTaxToggle}
                  className="data-[state=checked]:bg-cyan-500"
                />
                <div>
                  <span className={cn("text-sm", t('text-slate-900', 'text-white'))}>Invoice prices include BTW</span>
                  <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
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
                prefix={'€'}
                disabled={taxIncluded}
              />
              <InlineEditNumber
                value={displayCostPrice}
                onSave={handleCostPriceChange}
                label="Cost Price (incl BTW)"
                placeholder="0.00"
                prefix={'€'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InlineEditNumber
                value={pricing.compare_at_price}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, compare_at_price: val } })}
                label="Compare at Price"
                placeholder="0.00"
                prefix={'€'}
              />
              <InlineEditNumber
                value={pricing.wholesale_price}
                onSave={(val) => onDetailsUpdate({ pricing: { ...pricing, wholesale_price: val } })}
                label="Wholesale Price"
                placeholder="0.00"
                prefix={'€'}
              />
            </div>
          </div>
        </div>

        {/* Margin Analysis */}
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Margin Analysis</span>
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
                  <div className={cn("flex items-center justify-between p-3 rounded-lg", t('bg-slate-50', 'bg-zinc-900/50'))}>
                    <span className={t('text-slate-500', 'text-zinc-400')}>Gross Profit</span>
                    <span className={cn("text-lg font-bold", t('text-slate-900', 'text-white'))}>
                      {formatPrice(profit, currency)}
                    </span>
                  </div>
                  <div className={cn("flex items-center justify-between p-3 rounded-lg", t('bg-slate-50', 'bg-zinc-900/50'))}>
                    <span className={t('text-slate-500', 'text-zinc-400')}>Profit Margin</span>
                    <span className={cn(
                      "text-lg font-bold",
                      margin > 30 ? "text-cyan-400" : margin > 15 ? "text-cyan-300" : "text-red-400"
                    )}>
                      {margin}%
                    </span>
                  </div>
                  <div className={cn("flex items-center justify-between p-3 rounded-lg", t('bg-slate-50', 'bg-zinc-900/50'))}>
                    <span className={t('text-slate-500', 'text-zinc-400')}>Markup</span>
                    <span className={cn("text-lg font-bold", t('text-slate-900', 'text-white'))}>{markup}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Volume Pricing */}
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <PricingTiers
          tiers={tiers}
          basePrice={pricing.base_price || 0}
          costPrice={pricing.cost_price || 0}
          currency={currency}
          onTiersChange={handleTiersChange}
        />
      </div>

      {/* B2B Storefront Pricing Preview */}
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>B2B Store Pricing</span>
          </div>
          <span className={cn("text-xs px-2.5 py-1 rounded-full border",
            tiers.length > 0
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          )}>
            {tiers.length > 0 ? `${tiers.length} bulk tier${tiers.length > 1 ? 's' : ''} active` : 'No bulk tiers'}
          </span>
        </div>

        {tiers.length > 0 ? (
          <div className="space-y-3">
            <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
              These volume tiers are shown on your B2B storefront product pages. Clients see tiered pricing when ordering.
            </p>
            <div className={cn("rounded-lg overflow-hidden border", t('border-slate-200', 'border-zinc-800'))}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn(t('bg-slate-50', 'bg-zinc-800/50'))}>
                    <th className={cn("text-left px-4 py-2 font-medium text-xs", t('text-slate-500', 'text-zinc-400'))}>Quantity</th>
                    <th className={cn("text-right px-4 py-2 font-medium text-xs", t('text-slate-500', 'text-zinc-400'))}>Unit Price</th>
                    <th className={cn("text-right px-4 py-2 font-medium text-xs", t('text-slate-500', 'text-zinc-400'))}>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={cn("border-t", t('border-slate-100', 'border-zinc-800'))}>
                    <td className={cn("px-4 py-2.5", t('text-slate-700', 'text-zinc-300'))}>1 - {(tiers[0]?.min_quantity || 2) - 1}</td>
                    <td className={cn("px-4 py-2.5 text-right font-medium", t('text-slate-900', 'text-white'))}>{formatPrice(pricing.base_price || 0, currency)}</td>
                    <td className={cn("px-4 py-2.5 text-right text-xs", t('text-slate-400', 'text-zinc-500'))}>Base price</td>
                  </tr>
                  {tiers.map((tier, idx) => {
                    const savings = pricing.base_price > 0 ? Math.round((1 - tier.price / pricing.base_price) * 100) : 0;
                    return (
                      <tr key={idx} className={cn("border-t", t('border-slate-100', 'border-zinc-800'))}>
                        <td className={cn("px-4 py-2.5", t('text-slate-700', 'text-zinc-300'))}>
                          {tier.min_quantity}+{tier.max_quantity ? ` (up to ${tier.max_quantity})` : ''}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right font-medium text-cyan-400")}>{formatPrice(tier.price, currency)}</td>
                        <td className={cn("px-4 py-2.5 text-right text-xs font-medium", savings > 0 ? "text-green-400" : t('text-slate-400', 'text-zinc-500'))}>
                          {savings > 0 ? `-${savings}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={cn("flex flex-col items-center py-6 text-center")}>
            <Store className={cn("w-8 h-8 mb-2", t('text-slate-300', 'text-zinc-600'))} />
            <p className={cn("text-sm", t('text-slate-500', 'text-zinc-500'))}>
              Add volume tiers above to enable bulk pricing on your B2B store
            </p>
            <p className={cn("text-xs mt-1", t('text-slate-400', 'text-zinc-600'))}>
              Clients will see quantity-based discounts on the product detail page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============= DIGITAL PRICING SECTION =============

function DigitalPricingSection({ details, onDetailsUpdate, currency }) {
  const { t } = useTheme();
  const pricingConfig = details?.pricing_config || {};

  const handlePricingConfigChange = (newConfig) => {
    onDetailsUpdate({ pricing_config: newConfig });
  };

  return (
    <div className="space-y-4">
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <DigitalPricingManager
          pricingConfig={pricingConfig}
          currency={currency}
          onConfigChange={handlePricingConfigChange}
        />
      </div>
    </div>
  );
}

// ============= SERVICE PRICING SECTION =============

function ServicePricingSection({ details, onDetailsUpdate, currency }) {
  const { t } = useTheme();
  const pricingConfig = details?.pricing_config || {};

  const handlePricingConfigChange = (newConfig) => {
    onDetailsUpdate({ pricing_config: newConfig });
  };

  return (
    <div className="space-y-4">
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <ServicePricingManager
          pricingConfig={pricingConfig}
          currency={currency}
          onConfigChange={handlePricingConfigChange}
        />
      </div>
    </div>
  );
}

// ============= DELIVERABLES SECTION =============

function DeliverablesSection({ details, onDetailsUpdate }) {
  const { t } = useTheme();
  const deliverables = details?.deliverables || [];
  const sla = details?.sla || {};
  const scope = details?.scope || {};
  const tiers = details?.service_tiers || [];

  const addDeliverable = () => {
    const newItem = {
      id: `del_${Date.now().toString(36)}`,
      name: '',
      description: '',
      format: '',
      timeline: ''
    };
    onDetailsUpdate({ deliverables: [...deliverables, newItem] });
  };

  const updateDeliverable = (index, field, value) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], [field]: value };
    onDetailsUpdate({ deliverables: updated });
  };

  const removeDeliverable = (index) => {
    onDetailsUpdate({ deliverables: deliverables.filter((_, i) => i !== index) });
  };

  const updateSla = (field, value) => {
    onDetailsUpdate({ sla: { ...sla, [field]: value } });
  };

  const updateScope = (field, value) => {
    onDetailsUpdate({ scope: { ...scope, [field]: value } });
  };

  return (
    <div className="space-y-4">
      {/* Deliverables */}
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Deliverables</span>
            {deliverables.length > 0 && (
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 ml-2">
                {deliverables.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addDeliverable}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {deliverables.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className={cn("w-10 h-10 mx-auto mb-3", t('text-slate-300', 'text-zinc-600'))} />
            <p className={cn("text-sm", t('text-slate-500', 'text-zinc-500'))}>No deliverables defined yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverables.map((del, index) => (
              <div key={del.id || index} className={cn("p-3 rounded-lg border", t('bg-slate-50', 'bg-zinc-800/30'), t('border-slate-200', 'border-white/5'))}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Deliverable name"
                      value={del.name || ''}
                      onChange={(e) => updateDeliverable(index, 'name', e.target.value)}
                      className={cn("text-sm", t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10'))}
                    />
                    <Input
                      placeholder="Format (e.g. PDF, presentation)"
                      value={del.format || ''}
                      onChange={(e) => updateDeliverable(index, 'format', e.target.value)}
                      className={cn("text-sm", t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10'))}
                    />
                    <Input
                      placeholder="Description"
                      value={del.description || ''}
                      onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                      className={cn("text-sm col-span-1", t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10'))}
                    />
                    <Input
                      placeholder="Timeline (e.g. Week 2)"
                      value={del.timeline || ''}
                      onChange={(e) => updateDeliverable(index, 'timeline', e.target.value)}
                      className={cn("text-sm", t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10'))}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDeliverable(index)}
                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SLA */}
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Service Level Agreement</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Response Time</Label>
            <Input
              placeholder="e.g. Within 24 hours"
              value={sla.response_time || ''}
              onChange={(e) => updateSla('response_time', e.target.value)}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Revision Rounds</Label>
            <Input
              type="number"
              placeholder="e.g. 3"
              value={sla.revision_rounds || ''}
              onChange={(e) => updateSla('revision_rounds', parseInt(e.target.value) || '')}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Delivery Timeline</Label>
            <Input
              placeholder="e.g. 4-6 weeks"
              value={sla.delivery_timeline || ''}
              onChange={(e) => updateSla('delivery_timeline', e.target.value)}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Availability</Label>
            <Input
              placeholder="e.g. Mon-Fri 9-17 CET"
              value={sla.availability || ''}
              onChange={(e) => updateSla('availability', e.target.value)}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
        </div>
      </div>

      {/* Scope */}
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Scope</span>
        </div>
        <div className="space-y-4">
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Included (comma-separated)</Label>
            <Input
              placeholder="e.g. Research, Analysis, Report"
              value={Array.isArray(scope.included) ? scope.included.join(', ') : scope.included || ''}
              onChange={(e) => updateScope('included', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Excluded (comma-separated)</Label>
            <Input
              placeholder="e.g. Travel expenses, Third-party tools"
              value={Array.isArray(scope.excluded) ? scope.excluded.join(', ') : scope.excluded || ''}
              onChange={(e) => updateScope('excluded', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
          <div>
            <Label className={cn("text-xs mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Prerequisites (comma-separated)</Label>
            <Input
              placeholder="e.g. Access to systems, Stakeholder availability"
              value={Array.isArray(scope.prerequisites) ? scope.prerequisites.join(', ') : scope.prerequisites || ''}
              onChange={(e) => updateScope('prerequisites', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className={cn(t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/10'))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= BUNDLES SECTION =============

function BundlesSection({ product, details, currency }) {
  const { t } = useTheme();
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
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
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
    <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
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
  const { t } = useTheme();
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
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Stock Management</span>
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

            <div className={cn("pt-4 border-t", t('border-slate-200', 'border-white/5'))}>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={physicalInventory.track_inventory !== false}
                  onCheckedChange={(val) => handleInventoryUpdate('track_inventory', val)}
                />
                <span className={cn("text-sm", t('text-slate-600', 'text-zinc-300'))}>Track inventory</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-3">
                <Switch
                  checked={physicalInventory.allow_backorder || false}
                  onCheckedChange={(val) => handleInventoryUpdate('allow_backorder', val)}
                />
                <span className={cn("text-sm", t('text-slate-600', 'text-zinc-300'))}>Allow backorders</span>
              </label>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-6">
            <Truck className="w-5 h-5 text-blue-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Shipping Details</span>
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
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Suppliers</span>
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
          <div className={cn("mb-4 p-4 rounded-lg border space-y-3", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
            <Label className={t('text-slate-500', 'text-zinc-400')}>Select Supplier</Label>
            <div className="flex gap-2">
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className={cn("flex-1", t('bg-slate-50', 'bg-zinc-800/50'), t('border-slate-200', 'border-white/10'))}>
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
            <Building2 className={cn("w-10 h-10 mx-auto mb-3", t('text-slate-300', 'text-zinc-600'))} />
            <p className={cn("text-sm", t('text-slate-500', 'text-zinc-500'))}>No suppliers linked yet</p>
            <p className={cn("text-xs mt-1", t('text-slate-400', 'text-zinc-600'))}>Add suppliers to track purchase pricing</p>
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
                    : cn(t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'), t('hover:bg-slate-50', 'hover:bg-zinc-800/50'))
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    ps.is_preferred ? "bg-cyan-500/20" : t('bg-slate-100', 'bg-zinc-800')
                  )}>
                    <Building2 className={cn(
                      "w-4 h-4",
                      ps.is_preferred ? "text-cyan-400" : "text-zinc-400"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>{ps.suppliers?.name || 'Unknown'}</span>
                      {ps.is_preferred && (
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                          <Star className="w-3 h-3 mr-1" />
                          Preferred
                        </Badge>
                      )}
                    </div>
                    {ps.last_purchase_price && (
                      <p className={cn("text-sm", t('text-slate-500', 'text-zinc-400'))}>
                        Last: {formatPrice(ps.last_purchase_price, currency)}
                        {ps.last_purchase_date && (
                          <span className={cn("ml-1", t('text-slate-400', 'text-zinc-500'))}>
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
                      className={cn(t('text-slate-500', 'text-zinc-400'), "hover:text-cyan-400")}
                      title="Set as preferred"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSupplier(ps.supplier_id)}
                    className={cn(t('text-slate-500', 'text-zinc-400'), "hover:text-red-400")}
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
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Purchase History</span>
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
          <div className={cn("mb-4 p-4 rounded-lg border space-y-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={cn("mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Supplier (optional)</Label>
                <Select
                  value={purchaseForm.supplier_id}
                  onValueChange={(val) => setPurchaseForm(prev => ({...prev, supplier_id: val}))}
                >
                  <SelectTrigger className={cn(t('bg-slate-50', 'bg-zinc-800/50'), t('border-slate-200', 'border-white/10'))}>
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
                <Label className={cn("mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, purchase_date: e.target.value}))}
                  className={cn(t('bg-slate-50', 'bg-zinc-800/50'), t('border-slate-200', 'border-white/10'))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className={cn("mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Quantity *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, quantity: e.target.value}))}
                  className={cn(t('bg-slate-50', 'bg-zinc-800/50'), t('border-slate-200', 'border-white/10'))}
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <Label className={cn("mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Unit Price *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={purchaseForm.unit_price}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, unit_price: e.target.value}))}
                  className={cn(t('bg-slate-50', 'bg-zinc-800/50'), t('border-slate-200', 'border-white/10'))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label className={cn("mb-1.5 block", t('text-slate-500', 'text-zinc-400'))}>Invoice # (optional)</Label>
                <Input
                  placeholder="INV-001"
                  value={purchaseForm.invoice_number}
                  onChange={(e) => setPurchaseForm(prev => ({...prev, invoice_number: e.target.value}))}
                  className={cn(t('bg-slate-50', 'bg-zinc-800/50'), t('border-slate-200', 'border-white/10'))}
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
            <History className={cn("w-10 h-10 mx-auto mb-3", t('text-slate-300', 'text-zinc-600'))} />
            <p className={cn("text-sm", t('text-slate-500', 'text-zinc-500'))}>No purchase history yet</p>
            <p className={cn("text-xs mt-1", t('text-slate-400', 'text-zinc-600'))}>Purchases from invoices will appear here automatically</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn("text-left border-b", t('border-slate-200', 'border-white/5'))}>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider", t('text-slate-500', 'text-zinc-500'))}>Date</th>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider", t('text-slate-500', 'text-zinc-500'))}>Supplier</th>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider text-right", t('text-slate-500', 'text-zinc-500'))}>Qty</th>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider text-right", t('text-slate-500', 'text-zinc-500'))}>Unit Price</th>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider text-right", t('text-slate-500', 'text-zinc-500'))}>Total</th>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider", t('text-slate-500', 'text-zinc-500'))}>Invoice</th>
                  <th className={cn("pb-3 text-xs font-medium uppercase tracking-wider", t('text-slate-500', 'text-zinc-500'))}>Source</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", t('divide-slate-200', 'divide-white/5'))}>
                {purchaseHistory.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-white/2">
                    <td className={cn("py-3 text-sm", t('text-slate-600', 'text-zinc-300'))}>
                      {new Date(purchase.purchase_date).toLocaleDateString()}
                    </td>
                    <td className={cn("py-3 text-sm", t('text-slate-900', 'text-white'))}>
                      {purchase.suppliers?.name || <span className={t('text-slate-400', 'text-zinc-500')}>-</span>}
                    </td>
                    <td className={cn("py-3 text-sm text-right", t('text-slate-600', 'text-zinc-300'))}>
                      {formatNumber(purchase.quantity)}
                    </td>
                    <td className={cn("py-3 text-sm text-right", t('text-slate-600', 'text-zinc-300'))}>
                      {formatPrice(purchase.unit_price, purchase.currency)}
                    </td>
                    <td className={cn("py-3 text-sm font-medium text-right", t('text-slate-900', 'text-white'))}>
                      {formatPrice(purchase.total_amount, purchase.currency)}
                    </td>
                    <td className={cn("py-3 text-sm font-mono", t('text-slate-500', 'text-zinc-400'))}>
                      {purchase.invoice_number || <span className={t('text-slate-400', 'text-zinc-600')}>-</span>}
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
  const { t } = useTheme();
  const specs = details?.specifications || [];
  const attributes = details?.attributes || [];

  return (
    <div className="space-y-4">
      <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Technical Specifications</span>
        </div>

        {specs.length === 0 ? (
          <div className="text-center py-8">
            <Settings className={cn("w-10 h-10 mx-auto mb-3", t('text-slate-300', 'text-zinc-600'))} />
            <p className={cn("text-sm", t('text-slate-500', 'text-zinc-500'))}>No specifications added yet</p>
            <p className={cn("text-xs mt-1", t('text-slate-400', 'text-zinc-600'))}>Add technical details like dimensions, materials, etc.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {specs.map((spec, index) => (
              <div key={index} className={cn("flex items-center justify-between p-3 rounded-lg border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
                <span className={t('text-slate-500', 'text-zinc-400')}>{spec.name}</span>
                <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>{spec.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {attributes.length > 0 && (
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Attributes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attributes.map((attr, index) => (
              <div key={index} className={cn("p-3 rounded-lg border", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-white/5'))}>
                <p className={cn("text-xs mb-1", t('text-slate-500', 'text-zinc-500'))}>{attr.name}</p>
                <p className={cn("text-sm", t('text-slate-900', 'text-white'))}>{attr.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {details?.certifications && details.certifications.length > 0 && (
        <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Certifications</span>
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
  const { t } = useTheme();
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
    <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
      <DocumentsSection
        documents={documents}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ============= ACTIVITY SECTION =============

function buildActivityTitle(userName, action, changes, fallbackSummary) {
  const fieldNames = changes ? Object.keys(changes) : [];

  // Map field keys to human-readable labels
  const LABELS = {
    name: 'product name', description: 'description', short_description: 'short description',
    base_price: 'price', price: 'price', compare_at_price: 'compare-at price',
    cost_price: 'cost price', status: 'status', featured_image: 'featured image',
    gallery: 'product images', sku: 'SKU', ean: 'barcode', brand: 'brand',
    category: 'category', origin_country: 'origin country', weight: 'weight',
    stock_quantity: 'stock level', quantity: 'quantity', channels: 'sales channels',
    tags: 'tags', margin: 'margin', tax_rate: 'tax rate', currency: 'currency',
    pricing_model: 'pricing model', pricing_tiers: 'pricing tiers',
    billing_cycle: 'billing cycle', trial_days: 'trial period',
    setup_fee: 'setup fee', delivery_time: 'delivery time',
    specifications: 'specifications', meta_title: 'SEO title',
    meta_description: 'SEO description', slug: 'URL slug',
    min_order_quantity: 'min order quantity', max_order_quantity: 'max order quantity',
    low_stock_threshold: 'low stock threshold', warranty_info: 'warranty info',
    return_policy: 'return policy', mpn: 'MPN',
  };

  const friendlyField = (f) => LABELS[f] || f.replace(/_/g, ' ');

  switch (action) {
    case 'created':
      return `${userName} created this product`;
    case 'published':
      return `${userName} published the product`;
    case 'archived':
      return `${userName} archived the product`;
    case 'status_changed': {
      const newStatus = changes?.status?.new;
      return newStatus
        ? `${userName} changed status to "${newStatus}"`
        : `${userName} updated the product status`;
    }
    case 'price_changed': {
      const priceField = fieldNames.find(f => ['base_price', 'price', 'compare_at_price', 'cost_price'].includes(f));
      if (priceField && changes[priceField]) {
        const old = changes[priceField].old;
        const nw = changes[priceField].new;
        if (old != null && nw != null) {
          return `${userName} updated ${friendlyField(priceField)} from €${old} to €${nw}`;
        }
      }
      return `${userName} updated pricing`;
    }
    case 'image_added':
      if (changes?.gallery) {
        const oldCount = Array.isArray(changes.gallery.old) ? changes.gallery.old.length : 0;
        const newCount = Array.isArray(changes.gallery.new) ? changes.gallery.new.length : 0;
        const diff = newCount - oldCount;
        if (diff > 0) return `${userName} added ${diff} product image${diff !== 1 ? 's' : ''}`;
        if (diff < 0) return `${userName} removed ${Math.abs(diff)} product image${Math.abs(diff) !== 1 ? 's' : ''}`;
      }
      return `${userName} updated product images`;
    case 'channel_added':
      return typeof fallbackSummary === 'string' && fallbackSummary
        ? `${userName} — ${fallbackSummary}`
        : `${userName} added a sales channel`;
    case 'channel_removed':
      return typeof fallbackSummary === 'string' && fallbackSummary
        ? `${userName} — ${fallbackSummary}`
        : `${userName} removed a sales channel`;
    case 'stock_adjusted':
      return `${userName} adjusted stock levels`;
    case 'deleted':
      return `${userName} deleted the product`;
    case 'supplier_added':
      return `${userName} linked a supplier`;
    case 'supplier_removed':
      return `${userName} removed a supplier`;
    default: {
      // Generic "updated" — list 1-3 field names
      if (fieldNames.length === 0) {
        return typeof fallbackSummary === 'string' && fallbackSummary
          ? `${userName} — ${fallbackSummary}`
          : `${userName} updated the product`;
      }
      if (fieldNames.length <= 3) {
        return `${userName} updated ${fieldNames.map(friendlyField).join(', ')}`;
      }
      return `${userName} updated ${fieldNames.length} fields`;
    }
  }
}

function ActivitySectionWrapper({ product, details }) {
  const { t } = useTheme();
  const [activities, setActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    if (!product?.id) return;
    const fetchActivities = async () => {
      setLoadingActivity(true);
      const { data, error } = await supabase
        .from('product_activity_log')
        .select('*, actor:actor_id(full_name, avatar_url)')
        .eq('product_id', product.id)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        setActivities(data.map(a => {
          const userName = a.actor?.full_name || 'Someone';
          const action = a.action || 'updated';
          // Sanitize changes — keep only valid {old, new} entries
          let safeChanges = null;
          if (a.changes && typeof a.changes === 'object' && !Array.isArray(a.changes)) {
            safeChanges = {};
            for (const [field, change] of Object.entries(a.changes)) {
              if (change && typeof change === 'object' && !Array.isArray(change) && ('old' in change || 'new' in change)) {
                safeChanges[field] = change;
              }
            }
            if (Object.keys(safeChanges).length === 0) safeChanges = null;
          }

          // Build a human-readable title from actor + action + context
          const title = buildActivityTitle(userName, action, safeChanges, a.summary);

          return {
            id: a.id,
            type: action,
            title,
            timestamp: a.performed_at,
            user: userName,
            changes: safeChanges,
          };
        }));
      } else {
        // Fallback to mock data if no real activity entries yet
        setActivities(generateMockActivities(product, details));
      }
      setLoadingActivity(false);
    };
    fetchActivities();
  }, [product?.id, product?.updated_at]);

  return (
    <div className={cn("border rounded-xl p-4", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
      <div className="flex items-center gap-2 mb-6">
        <History className="w-5 h-5 text-cyan-400" />
        <span className={cn("font-medium", t('text-slate-900', 'text-white'))}>Activity History</span>
      </div>

      <ActivityTimeline activities={activities} maxItems={20} />
    </div>
  );
}

// ============= MAIN COMPONENT =============

export default function ProductDetail() {
  const { theme, toggleTheme, t } = useTheme();
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

  const [auditInfo, setAuditInfo] = useState(null);

  // B2B storefront visibility
  const [b2bEnabled, setB2bEnabled] = useState(false);
  const [b2bLoading, setB2bLoading] = useState(false);

  // Modal states
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const statsGridRef = useRef(null);

  const isPhysical = type === 'physical';
  const isService = type === 'service';
  const currency = details?.pricing?.currency || details?.pricing_config?.currency || 'EUR';

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

      // Safely parse JSONB fields that may be stored as strings
      if (typeof productData.featured_image === 'string') {
        try { productData.featured_image = JSON.parse(productData.featured_image); } catch { /* keep as-is */ }
      }
      if (typeof productData.gallery === 'string') {
        try { productData.gallery = JSON.parse(productData.gallery); } catch { /* keep as-is */ }
      }
      if (!Array.isArray(productData.gallery)) {
        productData.gallery = [];
      }
      if (!Array.isArray(productData.tags)) {
        productData.tags = [];
      }

      setProduct(productData);

      // Fetch audit info (created_by / updated_by user names)
      const auditUserIds = [productData.created_by, productData.updated_by].filter(Boolean);
      if (auditUserIds.length > 0) {
        const { data: auditUsers } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', [...new Set(auditUserIds)]);
        if (auditUsers) {
          const userMap = Object.fromEntries(auditUsers.map(u => [u.id, u]));
          setAuditInfo({
            createdBy: userMap[productData.created_by] || null,
            updatedBy: userMap[productData.updated_by] || null,
          });
        }
      }

      if (type === 'digital') {
        const digitalData = await DigitalProduct.filter({ product_id: productData.id }, { limit: 1 });
        if (digitalData && digitalData.length > 0) {
          setDetails(digitalData[0]);
        }
      } else if (type === 'service') {
        const serviceData = await ServiceProduct.filter({ product_id: productData.id }, { limit: 1 });
        if (serviceData && serviceData.length > 0) {
          setDetails(serviceData[0]);
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
        setRelatedProducts((related || []).filter(p => p.id !== productData.id));
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

  // Load B2B channel status
  useEffect(() => {
    if (!product?.id || !user?.company_id) return;
    supabase
      .from('product_sales_channels')
      .select('id, is_active')
      .eq('product_id', product.id)
      .eq('channel', 'b2b')
      .eq('company_id', user.company_id)
      .maybeSingle()
      .then(({ data }) => {
        setB2bEnabled(!!data?.is_active);
      });
  }, [product?.id, user?.company_id]);

  const handleB2bToggle = async (enabled) => {
    if (!product?.id || !user?.company_id) return;
    setB2bLoading(true);
    try {
      if (enabled) {
        await supabase
          .from('product_sales_channels')
          .upsert({
            company_id: user.company_id,
            product_id: product.id,
            channel: 'b2b',
            is_active: true,
            listed_at: new Date().toISOString(),
            listed_by: user.id,
            delisted_at: null,
          }, { onConflict: 'company_id,product_id,channel' });
      } else {
        await supabase
          .from('product_sales_channels')
          .update({ is_active: false, delisted_at: new Date().toISOString() })
          .eq('product_id', product.id)
          .eq('channel', 'b2b')
          .eq('company_id', user.company_id);
      }
      setB2bEnabled(enabled);
      toast.success(enabled ? 'Product visible on B2B store' : 'Product hidden from B2B store');
    } catch (err) {
      console.error('Failed to toggle B2B visibility:', err);
      toast.error('Failed to update B2B visibility');
    } finally {
      setB2bLoading(false);
    }
  };

  // Handle product update
  const handleProductUpdate = async (updates) => {
    if (!product) return;

    setSaving(true);
    try {
      await Product.update(product.id, { ...updates, updated_by: user?.id });
      const changes = calculateDiffs(product, updates);
      if (changes && user?.id) {
        await logProductActivity({
          productId: product.id,
          companyId: user?.company_id,
          actorId: user.id,
          changes,
        });
      }
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
    setSaving(true);
    try {
      if (!details && type === 'service') {
        // No service_products row exists yet — create one
        const newRow = await ServiceProduct.create({
          product_id: product.id,
          company_id: user?.company_id,
          ...updates,
        });
        setDetails(newRow);
      } else if (!details && type === 'digital') {
        const newRow = await DigitalProduct.create({
          product_id: product.id,
          company_id: user?.company_id,
          ...updates,
        });
        setDetails(newRow);
      } else if (!details) {
        // Physical product (default) — auto-create row
        const newRow = await PhysicalProduct.create({
          product_id: product.id,
          company_id: user?.company_id,
          ...updates,
        });
        setDetails(newRow);
      } else {
        // Existing row — update as normal
        const detailsId = details.product_id || details.id;

        if (type === 'digital') {
          await DigitalProduct.update(detailsId, updates);
        } else if (type === 'service') {
          await ServiceProduct.update(detailsId, updates);
        } else {
          await PhysicalProduct.update(detailsId, updates);
        }
        setDetails(prev => ({ ...prev, ...updates }));
      }

      // Log detail-level changes to the product activity feed
      if (product?.id && user?.id) {
        const changes = calculateDiffs(details || {}, updates);
        if (changes) {
          await logProductActivity({
            productId: product.id,
            companyId: user?.company_id,
            actorId: user.id,
            changes,
            metadata: { detail_type: type },
          });
        }
      }
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

  const backTab = isPhysical ? 'physical' : isService ? 'service' : 'digital';

  // Loading State
  if (loading) {
    return (
      <div className={cn("min-h-screen", t('bg-slate-50', 'bg-black'))}>
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
          <Skeleton className={cn("h-10 w-48", t('bg-slate-200', 'bg-zinc-800/50'))} />
          <Skeleton className={cn("h-12 w-full rounded-lg", t('bg-slate-200', 'bg-zinc-800/50'))} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className={cn("aspect-square rounded-xl", t('bg-slate-200', 'bg-zinc-800/50'))} />
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className={cn("h-48 rounded-xl", t('bg-slate-200', 'bg-zinc-800/50'))} />
              <Skeleton className={cn("h-32 rounded-xl", t('bg-slate-200', 'bg-zinc-800/50'))} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !product) {
    return (
      <div className={cn("min-h-screen", t('bg-slate-50', 'bg-black'))}>
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
          <div className={cn("border rounded-xl p-8 text-center max-w-md mx-auto", t('bg-white', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h4 className={cn("text-lg font-medium mb-2", t('text-slate-900', 'text-white'))}>{error || 'Product not found'}</h4>
            <p className={cn("text-sm mb-6", t('text-slate-500', 'text-zinc-500'))}>The product you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('Products')}>
              <Button variant="outline" className={cn(t('border-slate-200', 'border-white/10'), t('text-slate-600', 'text-zinc-300'))}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProductsPageTransition>
    <div className={cn("min-h-screen", t('bg-slate-50', 'bg-black'))}>
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={`/Products?tab=${backTab}`}>
              <Button variant="ghost" size="sm" className={cn(t('text-slate-500', 'text-zinc-400'), t('hover:text-slate-900', 'hover:text-white'), "-ml-2")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className={cn("h-6 w-px", t('bg-slate-200', 'bg-white/10'))} />
            <h1 className={cn("text-lg font-semibold truncate max-w-md", t('text-slate-900', 'text-white'))}>
              {product.name}
            </h1>
            {auditInfo && (
              <div className={cn("flex items-center gap-2 text-xs ml-1", t('text-slate-400', 'text-zinc-500'))}>
                {auditInfo.createdBy && (
                  <span>Created by {auditInfo.createdBy.full_name || 'Unknown'}</span>
                )}
                {auditInfo.updatedBy && (
                  <>
                    <span className={t('text-slate-300', 'text-zinc-600')}>|</span>
                    <span>Last edited by {auditInfo.updatedBy.full_name || 'Unknown'}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border",
              t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10')
            )}>
              <Store className="w-4 h-4 text-cyan-400" />
              <span className={cn("text-xs font-medium", t('text-slate-600', 'text-zinc-400'))}>B2B Store</span>
              <Switch
                checked={b2bEnabled}
                onCheckedChange={handleB2bToggle}
                disabled={b2bLoading}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-lg border transition-colors",
                t('bg-white border-slate-200 hover:bg-slate-50 text-slate-600', 'bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-400')
              )}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
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
        </div>

        {/* Section Navigation */}
        <SectionNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          productType={type}
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
              ) : isService ? (
                <ServicePricingSection
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

            {activeSection === 'bundles' && !isPhysical && !isService && (
              <BundlesSection
                product={product}
                details={details}
                currency={currency}
              />
            )}

            {activeSection === 'deliverables' && isService && (
              <DeliverablesSection
                details={details}
                onDetailsUpdate={handleDetailsUpdate}
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

            {activeSection === 'listing' && isPhysical && (
              <ProductListingBuilder
                product={product}
                details={details}
                onDetailsUpdate={handleDetailsUpdate}
                onProductUpdate={handleProductUpdate}
              />
            )}
        </div>

        {/* Related Products */}
        {activeSection === 'overview' && relatedProducts.length > 0 && (
          <div className="mt-6">
            <h3 className={cn("text-lg font-semibold mb-3 flex items-center gap-2", t('text-slate-900', 'text-white'))}>
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
    </ProductsPageTransition>
  );
}
