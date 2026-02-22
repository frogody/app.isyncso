import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Package, Edit, Euro, Truck, Upload, Archive,
  CheckCircle, AlertTriangle, Plus, FileText, User, ChevronDown, ChevronRight,
  Image, Link2, Tag, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

// ─── Field display config ───────────────────────────────────────────

const FIELD_LABELS = {
  name: 'Name',
  description: 'Description',
  short_description: 'Short description',
  base_price: 'Price',
  price: 'Price',
  compare_at_price: 'Compare-at price',
  cost_price: 'Cost price',
  status: 'Status',
  featured_image: 'Featured image',
  gallery: 'Gallery images',
  sku: 'SKU',
  ean: 'EAN / Barcode',
  mpn: 'MPN',
  brand: 'Brand',
  category: 'Category',
  origin_country: 'Origin',
  weight: 'Weight',
  dimensions: 'Dimensions',
  stock_quantity: 'Stock quantity',
  quantity: 'Quantity',
  low_stock_threshold: 'Low stock threshold',
  channels: 'Sales channels',
  tags: 'Tags',
  meta_title: 'SEO title',
  meta_description: 'SEO description',
  slug: 'URL slug',
  margin: 'Margin',
  tax_rate: 'Tax rate',
  currency: 'Currency',
  published_at: 'Published date',
  warranty_info: 'Warranty',
  return_policy: 'Return policy',
  specifications: 'Specifications',
  pricing_tiers: 'Pricing tiers',
  pricing_model: 'Pricing model',
  billing_cycle: 'Billing cycle',
  trial_days: 'Trial period',
  setup_fee: 'Setup fee',
  delivery_time: 'Delivery time',
  service_area: 'Service area',
  availability: 'Availability',
  min_order_quantity: 'Min order qty',
  max_order_quantity: 'Max order qty',
};

// Fields that contain long/complex data we should summarize, not display inline
const COMPLEX_FIELDS = new Set([
  'description', 'short_description', 'featured_image', 'gallery',
  'specifications', 'pricing_tiers', 'meta_description', 'warranty_info',
  'return_policy', 'dimensions',
]);

// Fields that contain URLs or image paths
const URL_FIELDS = new Set(['featured_image', 'gallery', 'slug']);

// Fields with currency values
const CURRENCY_FIELDS = new Set([
  'base_price', 'price', 'compare_at_price', 'cost_price', 'setup_fee',
]);

// ─── Activity icons & colors ────────────────────────────────────────

const ACTIVITY_ICONS = {
  created: Plus,
  updated: Edit,
  stock_adjusted: Package,
  price_changed: Euro,
  shipped: Truck,
  image_added: Upload,
  archived: Archive,
  published: CheckCircle,
  low_stock: AlertTriangle,
  document_added: FileText,
  channel_added: Link2,
  channel_removed: Link2,
  status_changed: Tag,
  default: Edit
};

const ACTIVITY_COLORS = {
  created: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  updated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stock_adjusted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  price_changed: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  shipped: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  image_added: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  published: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  low_stock: 'bg-red-500/20 text-red-400 border-red-500/30',
  document_added: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  channel_added: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  channel_removed: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  status_changed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  default: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
};

// ─── Formatting helpers ─────────────────────────────────────────────

function friendlyFieldName(field) {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatChangeValue(field, val) {
  if (val === null || val === undefined || val === '') return null;

  // Arrays (gallery images, channels, tags, etc.)
  if (Array.isArray(val)) {
    if (val.length === 0) return 'none';
    // For image arrays, just show count
    if (URL_FIELDS.has(field) || field === 'gallery') return `${val.length} image${val.length !== 1 ? 's' : ''}`;
    // For short arrays (channels, tags), show values
    if (val.length <= 4) return val.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ');
    return `${val.length} items`;
  }

  // Objects
  if (typeof val === 'object') {
    if (COMPLEX_FIELDS.has(field)) return '(updated)';
    const keys = Object.keys(val);
    if (keys.length === 0) return 'empty';
    return `${keys.length} fields`;
  }

  // Currency fields
  if (CURRENCY_FIELDS.has(field) && typeof val === 'number') {
    return `€${val.toFixed(2)}`;
  }

  // URLs - just indicate presence
  if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'))) {
    if (URL_FIELDS.has(field) || val.length > 80) return '(updated)';
  }

  // Long strings - truncate
  if (typeof val === 'string' && val.length > 60) {
    return val.substring(0, 57) + '...';
  }

  return String(val);
}

/**
 * Build a compact list of human-readable change descriptions.
 * Returns an array of { label, oldVal, newVal } objects for display,
 * plus a summary string.
 */
function buildChangeItems(changes) {
  if (!changes || typeof changes !== 'object') return { items: [], summary: '' };

  const entries = Object.entries(changes);
  const items = [];

  for (const [field, change] of entries) {
    if (!change || typeof change !== 'object') continue;
    const oldVal = formatChangeValue(field, change.old);
    const newVal = formatChangeValue(field, change.new);
    // Skip if both are null/empty
    if (!oldVal && !newVal) continue;
    items.push({ field, label: friendlyFieldName(field), oldVal, newVal });
  }

  return items;
}

// ─── Components ─────────────────────────────────────────────────────

function ChangesList({ items, t }) {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;

  const MAX_VISIBLE = 3;
  const visible = expanded ? items : items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;

  return (
    <div className={`mt-2 p-2.5 rounded-lg ${t('bg-slate-50', 'bg-zinc-900/50')} border ${t('border-slate-200', 'border-white/5')}`}>
      <div className="space-y-1.5">
        {visible.map(({ field, label, oldVal, newVal }) => (
          <div key={field} className="flex items-baseline gap-1.5 text-xs leading-relaxed flex-wrap">
            <span className={`font-medium ${t('text-slate-600', 'text-zinc-400')}`}>{label}</span>
            {oldVal && newVal ? (
              <>
                <span className={`${t('text-slate-400', 'text-zinc-600')} line-through`}>{oldVal}</span>
                <span className={t('text-slate-300', 'text-zinc-600')}>→</span>
                <span className={t('text-slate-800', 'text-zinc-200')}>{newVal}</span>
              </>
            ) : newVal ? (
              <>
                <span className={t('text-slate-400', 'text-zinc-600')}>set to</span>
                <span className={t('text-slate-800', 'text-zinc-200')}>{newVal}</span>
              </>
            ) : oldVal ? (
              <>
                <span className={`${t('text-slate-400', 'text-zinc-600')} line-through`}>{oldVal}</span>
                <span className={t('text-slate-400', 'text-zinc-600')}>removed</span>
              </>
            ) : null}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`mt-1.5 flex items-center gap-1 text-xs ${t('text-blue-600', 'text-cyan-400')} hover:underline`}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? 'Show less' : `+${items.length - MAX_VISIBLE} more changes`}
        </button>
      )}
    </div>
  );
}

function ActivityItem({ activity, t }) {
  const Icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.default;
  const colorClass = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.default;
  const changeItems = buildChangeItems(activity.changes);

  return (
    <div className="flex gap-3 group">
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center",
        colorClass
      )}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm ${t('text-slate-900', 'text-white')} font-medium`}>{activity.title}</p>
            {activity.description && (
              <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')} mt-0.5`}>{activity.description}</p>
            )}
          </div>
          <span className={`text-xs ${t('text-slate-400', 'text-zinc-600')} whitespace-nowrap flex-shrink-0`}>
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </span>
        </div>

        <ChangesList items={changeItems} t={t} />
      </div>
    </div>
  );
}

export default function ActivityTimeline({
  activities = [],
  maxItems = 10,
  showEmpty = true,
  className
}) {
  const { t } = useTheme();
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0 && showEmpty) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className={`w-12 h-12 rounded-full ${t('bg-slate-100', 'bg-zinc-800')} border ${t('border-slate-200', 'border-white/5')} flex items-center justify-center mx-auto mb-3`}>
          <FileText className={`w-6 h-6 ${t('text-slate-400', 'text-zinc-600')}`} />
        </div>
        <p className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>No activity yet</p>
        <p className={`text-xs ${t('text-slate-400', 'text-zinc-600')} mt-1`}>Changes to this product will appear here</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className={`absolute left-4 top-8 bottom-0 w-px bg-gradient-to-b ${t('from-slate-200', 'from-white/10')} to-transparent`} />

      <div className="space-y-0">
        {displayActivities.map((activity, index) => (
          <ActivityItem key={activity.id || index} activity={activity} t={t} />
        ))}
      </div>

      {activities.length > maxItems && (
        <div className={`pl-11 text-xs ${t('text-slate-500', 'text-zinc-500')}`}>
          +{activities.length - maxItems} more activities
        </div>
      )}
    </div>
  );
}

// Helper to generate mock activities for demo
export function generateMockActivities(product, details) {
  const activities = [];
  const now = new Date();

  if (product?.created_at) {
    activities.push({
      id: 'created',
      type: 'created',
      title: 'Product created',
      timestamp: product.created_at,
    });
  }

  if (product?.updated_at && product.updated_at !== product.created_at) {
    activities.push({
      id: 'updated',
      type: 'updated',
      title: 'Product updated',
      timestamp: product.updated_at,
    });
  }

  if (product?.published_at) {
    activities.push({
      id: 'published',
      type: 'published',
      title: 'Product published',
      timestamp: product.published_at,
    });
  }

  if (details?.inventory?.quantity <= (details?.inventory?.low_stock_threshold || 10)) {
    activities.push({
      id: 'low_stock',
      type: 'low_stock',
      title: 'Low stock warning',
      description: `Only ${details.inventory.quantity} units remaining`,
      timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    });
  }

  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
