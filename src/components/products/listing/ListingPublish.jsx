import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Store,
  Globe,
  Download,
  Loader2,
  ExternalLink,
  RefreshCw,
  Clock,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Truck,
  Star,
  Package,
  Search,
  Image as ImageIcon,
  Video,
  Type,
  AlignLeft,
  List,
  FileText,
  Tag,
  Eye,
  Minus,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeHTML } from '@/components/ui/SafeHTML';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_MAPPING = [
  {
    field: 'listing_title',
    label: 'Title',
    shopify: 'title',
    bolcom: 'product_title',
    icon: Type,
  },
  {
    field: 'listing_description',
    label: 'Description',
    shopify: 'body_html',
    bolcom: 'description',
    icon: AlignLeft,
  },
  {
    field: 'bullet_points',
    label: 'Bullet Points',
    shopify: null,
    bolcom: 'product_description',
    icon: List,
  },
  {
    field: 'seo_title',
    label: 'SEO Title',
    shopify: 'meta_title',
    bolcom: null,
    icon: Search,
  },
  {
    field: 'seo_description',
    label: 'SEO Description',
    shopify: 'meta_description',
    bolcom: null,
    icon: FileText,
  },
  {
    field: 'hero_image_url',
    label: 'Hero Image',
    shopify: 'images[0]',
    bolcom: 'images[0]',
    icon: ImageIcon,
  },
  {
    field: 'search_keywords',
    label: 'Keywords',
    shopify: 'tags',
    bolcom: 'search_terms',
    icon: Tag,
  },
];

// ---------------------------------------------------------------------------
// Completeness Checklist Data
// ---------------------------------------------------------------------------

function buildChecklist(listing, product) {
  const hasTitle = !!(listing?.title || listing?.listing_title || product?.name);
  const hasDescription = !!(listing?.description || listing?.listing_description || product?.description);
  const bulletCount = listing?.bullet_points?.length || 0;
  const hasSeoTitle = !!listing?.seo_title;
  const hasSeoDescription = !!listing?.seo_description;
  const hasHeroImage = !!(listing?.hero_image_url || product?.featured_image);
  const galleryCount = listing?.gallery_urls?.length || product?.gallery?.length || 0;
  const hasVideo = !!(listing?.video_url || product?.video_url);
  const keywordCount = listing?.keywords?.length || listing?.search_keywords?.length || 0;

  return [
    { key: 'title', label: 'Title generated', completed: hasTitle, tab: 'copywriter' },
    { key: 'description', label: 'Description generated', completed: hasDescription, tab: 'copywriter' },
    { key: 'bullets', label: 'Bullet points (5+)', completed: bulletCount >= 5, tab: 'copywriter' },
    { key: 'seo_title', label: 'SEO title', completed: hasSeoTitle, tab: 'copywriter' },
    { key: 'seo_desc', label: 'SEO description', completed: hasSeoDescription, tab: 'copywriter' },
    { key: 'hero', label: 'Hero image', completed: hasHeroImage, tab: 'images' },
    { key: 'gallery', label: 'Gallery images (3+)', completed: galleryCount >= 3, tab: 'images' },
    { key: 'video', label: 'Product video', completed: hasVideo, tab: 'video' },
    { key: 'keywords', label: 'Search keywords', completed: keywordCount > 0, tab: 'copywriter' },
  ];
}

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, loading, icon: Icon, color }) {
  const { t } = useTheme();
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            'rounded-xl border w-full max-w-md shadow-2xl',
            t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')
          )}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              {Icon && (
                <Icon className={cn('w-4 h-4', color)} />
              )}
              <div>
                <h3 className={cn('text-base font-semibold', t('text-slate-900', 'text-white'))}>{title}</h3>
                <p className={cn('text-sm mt-0.5', t('text-slate-500', 'text-zinc-400'))}>{description}</p>
              </div>
            </div>
          </div>
          <div className={cn(
            'flex items-center justify-end gap-3 px-4 py-3 border-t',
            t('border-slate-100', 'border-zinc-800/50')
          )}>
            <button
              onClick={onClose}
              disabled={loading}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                t('text-slate-600 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-zinc-800')
              )}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all',
                'text-white disabled:opacity-50',
                color === 'text-green-400'
                  ? 'bg-green-600 hover:bg-green-500'
                  : color === 'text-orange-400'
                    ? 'bg-orange-600 hover:bg-orange-500'
                    : 'bg-cyan-600 hover:bg-cyan-500'
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Shopify Preview
// ---------------------------------------------------------------------------

function ShopifyPreview({ listing, product }) {
  const { t } = useTheme();
  const title = listing?.title || listing?.listing_title || product?.name || 'Product Title';
  const description = listing?.description || listing?.listing_description || product?.description || '';
  const price = product?.price || product?.selling_price || '0.00';
  const comparePrice = product?.compare_at_price;
  const heroImage = listing?.hero_image_url || product?.featured_image;
  const galleryImages = listing?.gallery_urls || [];
  const bullets = listing?.bullet_points || [];
  const [activeImage, setActiveImage] = useState(0);
  const allImages = [heroImage, ...galleryImages].filter(Boolean);

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      t('bg-white border-slate-200', 'bg-white border-slate-200')
    )}>
      {/* Shopify-style top bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-white rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-400 flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            yourstore.myshopify.com/products/{(title || '').toLowerCase().replace(/\s+/g, '-').slice(0, 30)}
          </div>
        </div>
      </div>

      {/* Product page content */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Image + Gallery Thumbnails */}
        <div className="bg-slate-50 p-4 flex flex-col items-center justify-center min-h-[320px] border-r border-slate-100">
          {allImages.length > 0 ? (
            <>
              <img
                src={allImages[activeImage] || allImages[0]}
                alt={title}
                className="max-w-full max-h-[240px] object-contain rounded-lg mb-3"
                onError={(e) => { e.target.style.display = 'none'; }}
              loading="lazy" decoding="async" />
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 mt-2">
                  {allImages.slice(0, 5).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={cn(
                        'w-12 h-12 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0',
                        activeImage === idx ? 'border-slate-900 ring-1 ring-slate-900/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
                    </button>
                  ))}
                  {allImages.length > 5 && (
                    <span className="text-xs text-slate-400 ml-1">+{allImages.length - 5}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="w-48 h-48 rounded-xl bg-slate-100 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-slate-300" />
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">
              {product?.brand || 'Your Brand'}
            </p>
            <h2 className="text-xl font-semibold text-slate-900 leading-tight">{title}</h2>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-slate-900">
              {typeof price === 'number' ? `$${price.toFixed(2)}` : `$${price}`}
            </span>
            {comparePrice && (
              <span className="text-base text-slate-400 line-through">
                ${typeof comparePrice === 'number' ? comparePrice.toFixed(2) : comparePrice}
              </span>
            )}
          </div>

          {/* Rating placeholder */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={cn('w-4 h-4', i <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200')} />
            ))}
            <span className="text-xs text-slate-400 ml-1">(12 reviews)</span>
          </div>

          {/* Description snippet */}
          {description && (
            <SafeHTML
              className="text-sm text-slate-600 leading-relaxed line-clamp-4 prose prose-sm max-w-none"
              html={description.slice(0, 300) + (description.length > 300 ? '...' : '')}
            />
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button className="px-3 py-2 text-slate-400 hover:bg-slate-50 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm font-medium text-slate-900 border-x border-slate-200 min-w-[40px] text-center">1</span>
              <button className="px-3 py-2 text-slate-400 hover:bg-slate-50 transition-colors">
                <span className="text-sm font-bold">+</span>
              </button>
            </div>
            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors">
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// bol.com Preview
// ---------------------------------------------------------------------------

function BolcomPreview({ listing, product }) {
  const title = listing?.title || listing?.listing_title || product?.name || 'Productnaam';
  const description = listing?.description || listing?.listing_description || product?.description || '';
  const price = product?.price || product?.selling_price || '0.00';
  const heroImage = listing?.hero_image_url || product?.featured_image;
  const galleryImages = listing?.gallery_urls || [];
  const bullets = listing?.bullet_points || [];
  const [activeBolImg, setActiveBolImg] = useState(0);
  const allBolImages = [heroImage, ...galleryImages].filter(Boolean);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* bol.com header */}
      <div className="bg-[#0000A4] px-4 py-2.5 flex items-center gap-3">
        <span className="text-white font-bold text-sm tracking-tight">bol</span>
        <div className="flex-1 bg-white rounded-md px-3 py-1.5 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Zoeken op bol</span>
        </div>
        <ShoppingCart className="w-5 h-5 text-white" />
      </div>

      {/* Breadcrumb */}
      <div className="px-4 py-2 border-b border-slate-100">
        <p className="text-xs text-[#0000A4]">
          Home {'>'} Categorie {'>'} Subcategorie
        </p>
      </div>

      {/* Product content */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Image + Thumbnails */}
        <div className="p-4 flex flex-col items-center justify-center min-h-[300px] border-r border-slate-100">
          {allBolImages.length > 0 ? (
            <>
              <img
                src={allBolImages[activeBolImg] || allBolImages[0]}
                alt={title}
                className="max-w-full max-h-[220px] object-contain mb-3"
                onError={(e) => { e.target.style.display = 'none'; }}
              loading="lazy" decoding="async" />
              {allBolImages.length > 1 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {allBolImages.slice(0, 5).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBolImg(idx)}
                      className={cn(
                        'w-10 h-10 rounded border overflow-hidden transition-all flex-shrink-0',
                        activeBolImg === idx ? 'border-[#0000A4] ring-1 ring-[#0000A4]/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-48 h-48 rounded-xl bg-slate-50 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-slate-200" />
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="p-4 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 leading-snug">{title}</h2>

          {/* Rating */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={cn('w-3.5 h-3.5', i <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200')} />
            ))}
            <span className="text-xs text-[#0000A4] ml-1">8 reviews</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-2xl font-bold text-slate-900">
              {typeof price === 'number' ? price.toFixed(2).replace('.', ',') : String(price).replace('.', ',')}
            </span>
          </div>

          {/* Free shipping badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md">
              <Truck className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Gratis verzending</span>
            </div>
          </div>

          {/* Delivery */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span>Voor 23:59 besteld, morgen in huis</span>
          </div>

          {/* Bullet points */}
          {bullets.length > 0 && (
            <div className="border-t border-slate-100 pt-3 mt-2">
              <ul className="space-y-1.5">
                {bullets.slice(0, 5).map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <SafeHTML as="span" html={typeof bullet === 'string' ? bullet : bullet.text || bullet.content || ''} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <button className="w-full flex items-center justify-center gap-2 bg-[#FF6600] hover:bg-[#E55C00] text-white font-bold py-3 rounded-lg text-sm transition-colors mt-2">
            <ShoppingCart className="w-4 h-4" />
            In winkelwagen
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic Preview
// ---------------------------------------------------------------------------

function GenericPreview({ listing, product }) {
  const { t } = useTheme();
  const title = listing?.title || listing?.listing_title || product?.name || 'Product Title';
  const description = listing?.description || listing?.listing_description || product?.description || '';
  const price = product?.price || product?.selling_price;
  const heroImage = listing?.hero_image_url || product?.featured_image;
  const galleryImages = listing?.gallery_urls || [];
  const bullets = listing?.bullet_points || [];
  const seoTitle = listing?.seo_title || '';
  const seoDesc = listing?.seo_description || '';
  const keywords = listing?.keywords || listing?.search_keywords || [];
  const videoUrl = listing?.video_url;

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
    )}>
      {/* Header band */}
      <div className={cn(
        'px-4 py-3 border-b flex items-center gap-2',
        t('bg-slate-50 border-slate-100', 'bg-white/[0.02] border-white/5')
      )}>
        <Eye className={cn('w-4 h-4', t('text-slate-400', 'text-zinc-500'))} />
        <span className={cn('text-xs font-medium', t('text-slate-500', 'text-zinc-400'))}>
          Generic Preview -- All Fields
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero Image Large */}
        {heroImage && (
          <div className={cn('rounded-xl overflow-hidden border', t('border-slate-200', 'border-white/10'))}>
            <img
              src={heroImage}
              alt={title}
              className="w-full h-64 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            loading="lazy" decoding="async" />
          </div>
        )}

        {/* Gallery Grid */}
        {galleryImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {galleryImages.slice(0, 4).map((img, idx) => (
              <div key={idx} className={cn('rounded-lg overflow-hidden border aspect-square', t('border-slate-200', 'border-white/10'))}>
                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        )}

        {/* Title + Price row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className={cn('text-lg font-semibold leading-tight', t('text-slate-900', 'text-white'))}>
              {title}
            </h3>
          </div>
          {price && (
            <p className={cn('text-xl font-bold flex-shrink-0', t('text-slate-900', 'text-white'))}>
              {typeof price === 'number' ? `$${price.toFixed(2)}` : `$${price}`}
            </p>
          )}
        </div>

        {/* Description */}
        {description && (
          <div>
            <p className={cn('text-xs font-medium mb-1.5 uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
              Description
            </p>
            <SafeHTML
              className={cn('text-sm leading-relaxed line-clamp-4', t('text-slate-600', 'text-zinc-400'))}
              html={description.slice(0, 400)}
            />
          </div>
        )}

        {/* Bullet points */}
        {bullets.length > 0 && (
          <div>
            <p className={cn('text-xs font-medium mb-1.5 uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
              Key Features
            </p>
            <ul className="space-y-1">
              {bullets.slice(0, 6).map((b, idx) => (
                <li key={idx} className={cn('flex items-start gap-2 text-sm', t('text-slate-700', 'text-zinc-300'))}>
                  <span className="text-cyan-400 mt-0.5">-</span>
                  <SafeHTML as="span" html={typeof b === 'string' ? b : b.text || b.content || ''} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SEO + Keywords */}
        {(seoTitle || seoDesc || keywords.length > 0) && (
          <div className={cn(
            'rounded-xl border p-4 space-y-2',
            t('bg-slate-50 border-slate-100', 'bg-white/[0.02] border-white/5')
          )}>
            <p className={cn('text-xs font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
              SEO Metadata
            </p>
            {seoTitle && (
              <p className={cn('text-sm font-medium', t('text-blue-600', 'text-blue-400'))}>{seoTitle}</p>
            )}
            {seoDesc && (
              <p className={cn('text-xs', t('text-slate-500', 'text-zinc-400'))}>{seoDesc}</p>
            )}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-md',
                      t('bg-slate-200 text-slate-600', 'bg-white/[0.06] text-zinc-400')
                    )}
                  >
                    {typeof kw === 'string' ? kw : kw.keyword || kw.text || ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completeness Progress Bar
// ---------------------------------------------------------------------------

function CompletenessBar({ checklist }) {
  const { t } = useTheme();
  const completed = checklist.filter((i) => i.completed).length;
  const total = checklist.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
          Listing Completeness
        </span>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          pct === 100 ? 'text-cyan-400' : pct >= 60 ? 'text-blue-400' : t('text-slate-600', 'text-zinc-400')
        )}>
          {pct}%
        </span>
      </div>
      <div className={cn('h-2.5 rounded-full overflow-hidden', t('bg-slate-100', 'bg-white/[0.06]'))}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'h-full rounded-full',
            pct === 100
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
              : pct >= 60
                ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
          )}
        />
      </div>
      <p className={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}>
        {completed}/{total} items complete
        {pct === 100 && ' -- Ready to publish'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist Section
// ---------------------------------------------------------------------------

function ChecklistSection({ checklist, onNavigate }) {
  const { t } = useTheme();

  return (
    <div className="space-y-1">
      {checklist.map((item) => (
        <div
          key={item.key}
          className={cn(
            'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
            t('hover:bg-slate-50', 'hover:bg-white/[0.02]')
          )}
        >
          <div className="flex items-center gap-2">
            {item.completed ? (
              <div className="w-5 h-5 rounded-full bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
            ) : (
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex-shrink-0',
                t('border-slate-200', 'border-zinc-700')
              )} />
            )}
            <span className={cn(
              'text-sm',
              item.completed
                ? t('text-slate-400 line-through', 'text-zinc-500 line-through')
                : t('text-slate-700', 'text-zinc-300')
            )}>
              {item.label}
            </span>
          </div>
          {!item.completed && onNavigate && (
            <button
              onClick={() => onNavigate(item.tab)}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Generate
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Mapping Table
// ---------------------------------------------------------------------------

function FieldMappingTable({ channel }) {
  const { t } = useTheme();

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      t('border-slate-200', 'border-white/5')
    )}>
      <table className="w-full text-sm">
        <thead>
          <tr className={cn(
            'border-b',
            t('bg-slate-50 border-slate-200', 'bg-white/[0.02] border-white/5')
          )}>
            <th className={cn('text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
              Listing Field
            </th>
            <th className={cn('text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
              Shopify
            </th>
            <th className={cn('text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
              bol.com
            </th>
          </tr>
        </thead>
        <tbody className={cn('divide-y', t('divide-slate-100', 'divide-white/5'))}>
          {FIELD_MAPPING.map((row) => {
            const Icon = row.icon;
            const shopifyMapped = !!row.shopify;
            const bolcomMapped = !!row.bolcom;

            // Warn if the current channel doesn't map
            const currentChannelUnmapped =
              (channel === 'shopify' && !shopifyMapped) ||
              (channel === 'bolcom' && !bolcomMapped);

            return (
              <tr
                key={row.field}
                className={cn(
                  currentChannelUnmapped ? t('bg-amber-50/50', 'bg-amber-500/[0.03]') : ''
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-3.5 h-3.5', t('text-slate-400', 'text-zinc-500'))} />
                    <span className={cn('font-medium', t('text-slate-700', 'text-zinc-300'))}>{row.label}</span>
                    {currentChannelUnmapped && (
                      <AlertTriangle className="w-3 h-3 text-amber-400 ml-1" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {row.shopify ? (
                    <span className={cn('text-xs font-mono', t('text-slate-600', 'text-zinc-400'))}>{row.shopify}</span>
                  ) : (
                    <span className={cn('text-xs', t('text-slate-300', 'text-zinc-600'))}>--</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {row.bolcom ? (
                    <span className={cn('text-xs font-mono', t('text-slate-600', 'text-zinc-400'))}>{row.bolcom}</span>
                  ) : (
                    <span className={cn('text-xs', t('text-slate-300', 'text-zinc-600'))}>--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sync Status Row
// ---------------------------------------------------------------------------

function SyncStatus({ channel, listing }) {
  const { t } = useTheme();

  // Simulated sync metadata (in production, stored on listing record)
  const lastPublished = listing?.published_at || listing?.last_published_at;
  const updatedAfterPublish = lastPublished && listing?.updated_at && new Date(listing.updated_at) > new Date(lastPublished);

  if (!lastPublished) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
        t('bg-slate-50 text-slate-500', 'bg-white/[0.02] text-zinc-500')
      )}>
        <Info className="w-3.5 h-3.5" />
        Never published to this channel
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-lg text-xs',
      updatedAfterPublish
        ? t('bg-amber-50 text-amber-700', 'bg-amber-500/10 text-amber-400')
        : t('bg-cyan-50 text-cyan-700', 'bg-cyan-500/10 text-cyan-400')
    )}>
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        <span>
          Last published: {new Date(lastPublished).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      {updatedAfterPublish && (
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Out of sync
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ListingPublish({ product, details, listing, onUpdate, channel, onNavigate }) {
  const { t } = useTheme();
  const { user } = useUser();
  const [showMappingTable, setShowMappingTable] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'shopify' | 'bolcom' | 'export' }
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null); // { success, channel, external_url, message }

  const checklist = useMemo(() => buildChecklist(listing, product), [listing, product]);
  const completedCount = checklist.filter((i) => i.completed).length;
  const totalCount = checklist.length;
  const isReady = completedCount >= 5; // At minimum: title, desc, bullets, hero, SEO title

  // Navigate to a different tab in the parent builder
  const handleNavigateToTab = useCallback((tab) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      toast.info(`Switch to the "${tab === 'copywriter' ? 'AI Copywriter' : tab === 'images' ? 'Image Studio' : 'Video Studio'}" tab to complete this item`);
    }
  }, [onNavigate]);

  // Publish handlers
  const handlePublishShopify = useCallback(async () => {
    setPublishing(true);
    setPublishResult(null);
    const toastId = toast.loading('Publishing to Shopify...');
    try {
      const { data, error } = await supabase.functions.invoke('publish-listing', {
        body: {
          product_id: product?.id,
          channel: 'shopify',
          company_id: user?.company_id,
          user_id: user?.id,
          listing_data: listing,
          product_data: {
            name: product?.name,
            price: product?.price || product?.selling_price,
            sku: product?.sku,
            ean: details?.ean || details?.barcode || product?.barcode,
            description: product?.description,
            stock_quantity: product?.stock_quantity || product?.quantity,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);

      setPublishResult({ success: true, channel: 'shopify', external_url: data.external_url, message: data.message });
      toast.success(data.message || 'Published to Shopify!', {
        id: toastId,
        description: data.external_url ? 'View in Shopify Admin' : undefined,
        action: data.external_url ? {
          label: 'Open',
          onClick: () => window.open(data.external_url, '_blank'),
        } : undefined,
      });

      // Refresh listing data
      if (onUpdate) {
        await onUpdate({ publish_status: 'published', published_at: new Date().toISOString() });
      }
    } catch (err) {
      console.error('[ListingPublish] Shopify publish error:', err);
      toast.error('Failed to publish to Shopify', {
        id: toastId,
        description: err.message || 'Check your Shopify connection in Settings.',
      });
      setPublishResult({ success: false, channel: 'shopify', message: err.message });
    } finally {
      setPublishing(false);
      setConfirmDialog(null);
    }
  }, [product, listing, details, user, onUpdate]);

  const handlePublishBolcom = useCallback(async () => {
    setPublishing(true);
    setPublishResult(null);
    const toastId = toast.loading('Publishing to bol.com...');
    try {
      const { data, error } = await supabase.functions.invoke('publish-listing', {
        body: {
          product_id: product?.id,
          channel: 'bolcom',
          company_id: user?.company_id,
          user_id: user?.id,
          listing_data: listing,
          product_data: {
            name: product?.name,
            price: product?.price || product?.selling_price,
            sku: product?.sku,
            ean: details?.ean || details?.barcode || product?.barcode,
            description: product?.description,
            stock_quantity: product?.stock_quantity || product?.quantity,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);

      setPublishResult({ success: true, channel: 'bolcom', external_url: data.external_url, message: data.message });
      toast.success(data.message || 'Published to bol.com!', {
        id: toastId,
        description: data.images_pushed ? `${data.images_pushed} images uploaded` : undefined,
        action: data.external_url ? {
          label: 'View',
          onClick: () => window.open(data.external_url, '_blank'),
        } : undefined,
      });

      if (onUpdate) {
        await onUpdate({ publish_status: 'published', published_at: new Date().toISOString() });
      }
    } catch (err) {
      console.error('[ListingPublish] bol.com publish error:', err);
      toast.error('Failed to publish to bol.com', {
        id: toastId,
        description: err.message || 'Check your bol.com connection in Settings.',
      });
      setPublishResult({ success: false, channel: 'bolcom', message: err.message });
    } finally {
      setPublishing(false);
      setConfirmDialog(null);
    }
  }, [product, listing, details, user, onUpdate]);

  const handleExportZip = useCallback(async () => {
    setPublishing(true);
    const toastId = toast.loading('Preparing export...');
    try {
      // Build a JSON export of all listing data
      const exportData = {
        listing: {
          title: listing?.listing_title || listing?.title || product?.name,
          description: listing?.listing_description || listing?.description,
          bullet_points: listing?.bullet_points || [],
          seo_title: listing?.seo_title,
          seo_description: listing?.seo_description,
          search_keywords: listing?.search_keywords || listing?.keywords || [],
        },
        images: {
          hero: listing?.hero_image_url,
          gallery: listing?.gallery_urls || [],
        },
        product: {
          name: product?.name,
          price: product?.price,
          sku: product?.sku,
          ean: details?.ean || details?.barcode,
        },
        exported_at: new Date().toISOString(),
        channel,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listing-${(product?.name || 'product').toLowerCase().replace(/\s+/g, '-')}-${channel}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Listing data exported', { id: toastId, description: 'JSON file downloaded with all listing data and image URLs.' });
    } catch (err) {
      console.error('[ListingPublish] Export error:', err);
      toast.error('Failed to export', { id: toastId });
    } finally {
      setPublishing(false);
      setConfirmDialog(null);
    }
  }, [listing, product, details, channel]);

  // Determine which preview to show based on channel
  const previewComponent = useMemo(() => {
    switch (channel) {
      case 'shopify':
        return <ShopifyPreview listing={listing} product={product} />;
      case 'bolcom':
        return <BolcomPreview listing={listing} product={product} />;
      default:
        return <GenericPreview listing={listing} product={product} />;
    }
  }, [channel, listing, product]);

  return (
    <div className="space-y-4">
      {/* Channel Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
            {channel === 'shopify'
              ? 'Shopify Preview'
              : channel === 'bolcom'
                ? 'bol.com Preview'
                : 'Listing Preview'}
          </h3>
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg',
            channel === 'shopify'
              ? 'bg-green-500/10 text-green-400'
              : channel === 'bolcom'
                ? 'bg-orange-500/10 text-orange-400'
                : 'bg-cyan-500/10 text-cyan-400'
          )}>
            {channel === 'shopify' ? (
              <ShoppingBag className="w-3.5 h-3.5" />
            ) : channel === 'bolcom' ? (
              <Store className="w-3.5 h-3.5" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            {channel === 'shopify' ? 'Shopify' : channel === 'bolcom' ? 'bol.com' : 'Generic'}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={channel}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {previewComponent}
          </motion.div>
        </AnimatePresence>

        {/* Sync Status */}
        <SyncStatus channel={channel} listing={listing} />

        {/* Publish Result Banner */}
        {publishResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm',
              publishResult.success
                ? t('bg-cyan-50 text-cyan-800 border border-cyan-200', 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20')
                : t('bg-red-50 text-red-800 border border-red-200', 'bg-red-500/10 text-red-300 border border-red-500/20')
            )}
          >
            <div className="flex items-center gap-2">
              {publishResult.success ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-medium">{publishResult.message}</span>
            </div>
            {publishResult.external_url && (
              <a
                href={publishResult.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold hover:underline flex-shrink-0"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}
      </div>

      {/* Completeness Checklist */}
      <div className={cn(
        'rounded-xl border p-4 space-y-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <CompletenessBar checklist={checklist} />
        <div className={cn('border-t pt-4', t('border-slate-100', 'border-white/5'))}>
          <ChecklistSection checklist={checklist} onNavigate={handleNavigateToTab} />
        </div>
      </div>

      {/* Field Mapping */}
      <div className={cn(
        'rounded-xl border p-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <button
          onClick={() => setShowMappingTable((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
            Field Mapping
          </h3>
          <div className={cn(
            'flex items-center gap-1.5 text-xs',
            t('text-slate-400', 'text-zinc-500')
          )}>
            <span>{showMappingTable ? 'Hide' : 'Show'}</span>
            {showMappingTable ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showMappingTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-3">
                <p className={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}>
                  Shows how your listing fields map to each channel.
                  {' '}
                  <AlertTriangle className="w-3 h-3 text-amber-400 inline" />
                  {' '}indicates the field is not used by the current channel.
                </p>
                <FieldMappingTable channel={channel} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Publish Actions */}
      <div className={cn(
        'rounded-xl border p-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <h3 className={cn('text-sm font-semibold mb-4', t('text-slate-900', 'text-white'))}>
          Publish Actions
        </h3>

        <div className="grid sm:grid-cols-3 gap-3">
          {/* Push to Shopify */}
          <button
            onClick={() => setConfirmDialog('shopify')}
            className={cn(
              'group relative overflow-hidden flex items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:border-green-300 hover:bg-green-50/50',
                'bg-white/[0.03] border-white/5 hover:border-green-500/30 hover:bg-green-500/[0.03]'
              )
            )}
          >
            <ShoppingBag className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div>
              <p className={cn('text-sm font-semibold', t('text-slate-800', 'text-zinc-200'))}>
                Push to Shopify
              </p>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Sync listing data
              </p>
            </div>
            <ArrowRight className={cn(
              'w-4 h-4 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5',
              t('text-slate-300', 'text-zinc-600')
            )} />
          </button>

          {/* Push to bol.com */}
          <button
            onClick={() => setConfirmDialog('bolcom')}
            className={cn(
              'group relative overflow-hidden flex items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50',
                'bg-white/[0.03] border-white/5 hover:border-orange-500/30 hover:bg-orange-500/[0.03]'
              )
            )}
          >
            <Store className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div>
              <p className={cn('text-sm font-semibold', t('text-slate-800', 'text-zinc-200'))}>
                Push to bol.com
              </p>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Sync via Retailer API
              </p>
            </div>
            <ArrowRight className={cn(
              'w-4 h-4 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5',
              t('text-slate-300', 'text-zinc-600')
            )} />
          </button>

          {/* Export as ZIP */}
          <button
            onClick={() => setConfirmDialog('export')}
            className={cn(
              'group relative overflow-hidden flex items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200',
              t(
                'bg-slate-50 border-slate-200 hover:border-slate-300',
                'bg-white/[0.03] border-white/5 hover:border-white/10'
              )
            )}
          >
            <Download className={cn('w-4 h-4 flex-shrink-0', t('text-slate-500', 'text-zinc-400'))} />
            <div>
              <p className={cn('text-sm font-semibold', t('text-slate-800', 'text-zinc-200'))}>
                Export as ZIP
              </p>
              <p className={cn('text-xs mt-0.5', t('text-slate-500', 'text-zinc-500'))}>
                Images, copy, metadata
              </p>
            </div>
            <ArrowRight className={cn(
              'w-4 h-4 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5',
              t('text-slate-300', 'text-zinc-600')
            )} />
          </button>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDialog === 'shopify'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handlePublishShopify}
        title="Push to Shopify"
        description="This will sync your listing title, description, images, and SEO metadata to your Shopify store."
        confirmLabel={publishing ? 'Publishing...' : 'Push to Shopify'}
        loading={publishing}
        icon={ShoppingBag}
        color="text-green-400"
      />

      <ConfirmDialog
        open={confirmDialog === 'bolcom'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handlePublishBolcom}
        title="Push to bol.com"
        description="This will sync your listing title, bullet points, images, and product data to bol.com via the Retailer API."
        confirmLabel={publishing ? 'Publishing...' : 'Push to bol.com'}
        loading={publishing}
        icon={Store}
        color="text-orange-400"
      />

      <ConfirmDialog
        open={confirmDialog === 'export'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleExportZip}
        title="Export as ZIP"
        description="This will bundle all listing images, copywriting content, and metadata into a downloadable ZIP file."
        confirmLabel={publishing ? 'Exporting...' : 'Download ZIP'}
        loading={publishing}
        icon={Download}
        color="text-cyan-400"
      />
    </div>
  );
}
