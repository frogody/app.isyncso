import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Search,
  Play,
  Tag,
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import ListingGenerationView from './ListingGenerationView';

// --- Image Gallery with thumbnail strip ---

function ImageGallery({ heroUrl, galleryUrls, productFallbackImage, t }) {
  const allImages = useMemo(() => {
    const imgs = [];
    if (heroUrl) imgs.push(heroUrl);
    if (galleryUrls?.length) {
      galleryUrls.forEach((url) => {
        if (url && !imgs.includes(url)) imgs.push(url);
      });
    }
    if (imgs.length === 0 && productFallbackImage) {
      imgs.push(productFallbackImage);
    }
    return imgs;
  }, [heroUrl, galleryUrls, productFallbackImage]);

  const [selectedIdx, setSelectedIdx] = useState(0);

  if (allImages.length === 0) return null;

  const currentImage = allImages[selectedIdx] || allImages[0];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className={cn(
        'relative aspect-square rounded-2xl overflow-hidden border',
        t('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-white/5')
      )}>
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={currentImage}
            alt="Product"
            className="w-full h-full object-contain"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>

        {/* Nav arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIdx((prev) => (prev - 1 + allImages.length) % allImages.length)}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all',
                t('bg-white/90 hover:bg-white shadow-md', 'bg-zinc-900/80 hover:bg-zinc-900 border border-white/10')
              )}
            >
              <ChevronLeft className={cn('w-4 h-4', t('text-slate-700', 'text-zinc-300'))} />
            </button>
            <button
              onClick={() => setSelectedIdx((prev) => (prev + 1) % allImages.length)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all',
                t('bg-white/90 hover:bg-white shadow-md', 'bg-zinc-900/80 hover:bg-zinc-900 border border-white/10')
              )}
            >
              <ChevronRight className={cn('w-4 h-4', t('text-slate-700', 'text-zinc-300'))} />
            </button>
          </>
        )}

        {/* Image counter badge */}
        {allImages.length > 1 && (
          <div className={cn(
            'absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs font-medium',
            t('bg-white/90 text-slate-700', 'bg-zinc-900/80 text-zinc-300 border border-white/10')
          )}>
            {selectedIdx + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200',
                idx === selectedIdx
                  ? 'border-cyan-400 shadow-sm shadow-cyan-500/20'
                  : cn(t('border-slate-200 hover:border-slate-300', 'border-white/5 hover:border-white/15'))
              )}
            >
              <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Price Display ---

function PriceDisplay({ price, currency, t }) {
  if (!price) return null;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(price);

  return (
    <div className="flex items-baseline gap-2">
      <span className={cn('text-3xl font-bold tracking-tight', t('text-slate-900', 'text-white'))}>
        {formatted}
      </span>
      <span className={cn('text-sm', t('text-slate-500', 'text-zinc-500'))}>incl. VAT</span>
    </div>
  );
}

// --- Trust Badges ---

function TrustBadges({ t }) {
  const badges = [
    { icon: Truck, label: 'Free Shipping' },
    { icon: ShieldCheck, label: 'Secure Checkout' },
    { icon: RotateCcw, label: '30-Day Returns' },
  ];

  return (
    <div className={cn(
      'flex items-center gap-4 py-3 px-4 rounded-xl border',
      t('bg-slate-50 border-slate-200', 'bg-white/[0.02] border-white/5')
    )}>
      {badges.map((badge, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <badge.icon className={cn('w-3.5 h-3.5', t('text-slate-400', 'text-zinc-500'))} />
          <span className={cn('text-xs font-medium', t('text-slate-500', 'text-zinc-500'))}>{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- SEO Preview Card (Google result mockup) ---

function SEOPreview({ seoTitle, seoDescription, t }) {
  if (!seoTitle && !seoDescription) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className={cn('w-4 h-4', t('text-slate-400', 'text-zinc-500'))} />
        <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
          Search Engine Preview
        </h3>
      </div>
      <div className={cn(
        'rounded-xl border p-5 space-y-1.5',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        {/* Google-style result */}
        <div className={cn('text-xs', t('text-green-700', 'text-green-400/80'))}>
          www.yourstore.com &rsaquo; products
        </div>
        <div className={cn('text-lg font-medium leading-snug', t('text-blue-700', 'text-blue-400'))}>
          {seoTitle || 'Product Title'}
        </div>
        <div className={cn('text-sm leading-relaxed line-clamp-2', t('text-slate-600', 'text-zinc-400'))}>
          {seoDescription || 'Product description will appear here in search results.'}
        </div>
      </div>
    </div>
  );
}

// --- Video Section ---

function VideoSection({ videoUrl, t }) {
  if (!videoUrl) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Play className={cn('w-4 h-4', t('text-slate-400', 'text-zinc-500'))} />
        <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
          Product Video
        </h3>
      </div>
      <div className={cn(
        'relative rounded-2xl overflow-hidden border aspect-video',
        t('bg-black border-slate-200', 'bg-black border-white/5')
      )}>
        <video
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
          poster=""
        />
      </div>
    </div>
  );
}

// --- Keywords Badges ---

function KeywordsBadges({ keywords, t }) {
  if (!keywords?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className={cn('w-4 h-4', t('text-slate-400', 'text-zinc-500'))} />
        <h3 className={cn('text-sm font-semibold', t('text-slate-900', 'text-white'))}>
          Search Keywords
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw, idx) => (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium',
              t('bg-slate-100 text-slate-600', 'bg-white/[0.06] text-zinc-400')
            )}
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Empty State ---

function EmptyState({ onGenerateAll, loading, t }) {
  return (
    <div className={cn(
      'relative rounded-2xl border overflow-hidden',
      t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
    )}>
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          'absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl',
          t('bg-cyan-100/40', 'bg-cyan-500/5')
        )} />
      </div>

      <div className="relative flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className={cn(
          'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
          t('bg-slate-100', 'bg-white/[0.04]')
        )}>
          <Package className={cn('w-10 h-10', t('text-slate-300', 'text-zinc-600'))} />
        </div>

        <h3 className={cn('text-xl font-semibold mb-2', t('text-slate-900', 'text-white'))}>
          No Listing Content Yet
        </h3>
        <p className={cn('text-sm max-w-md mb-8', t('text-slate-500', 'text-zinc-500'))}>
          Generate a complete product listing with AI-powered copy, professional images, SEO optimization, and a product video -- all in one click.
        </p>

        <button
          onClick={onGenerateAll}
          disabled={loading}
          className={cn(
            'relative overflow-hidden group rounded-2xl px-8 py-4 transition-all duration-300',
            'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
            'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30',
            loading && 'opacity-70 cursor-not-allowed'
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="relative flex items-center gap-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
            <span className="text-base font-semibold text-white">
              {loading ? 'Generating...' : 'Generate Everything with AI'}
            </span>
            <ArrowRight className="w-4 h-4 text-white/60 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <div className={cn('flex items-center gap-6 mt-6 text-xs', t('text-slate-400', 'text-zinc-600'))}>
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> Hero + Gallery
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> SEO Copy
          </span>
          <span className="flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Product Video
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ListingPreview({
  product,
  details,
  listing,
  onGenerateAll,
  loading,
  generatingProgress,
  onTabChange,
}) {
  const { t } = useTheme();

  // If generation is in progress, show the generation view
  if (generatingProgress) {
    return (
      <ListingGenerationView
        progress={generatingProgress}
        listing={listing}
        product={product}
        onNavigateToPublish={() => onTabChange?.('publish')}
      />
    );
  }

  // Resolve image URLs
  const heroUrl = listing?.hero_image_url || null;
  const galleryUrls = listing?.gallery_urls || [];
  const productFallbackImage = typeof product?.featured_image === 'string'
    ? product.featured_image
    : product?.featured_image?.url || null;

  // Resolve text content
  const title = listing?.listing_title || product?.name || '';
  const tagline = listing?.short_tagline || '';
  const description = listing?.listing_description || '';
  const bulletPoints = listing?.bullet_points || [];
  const seoTitle = listing?.seo_title || '';
  const seoDescription = listing?.seo_description || '';
  const keywords = listing?.search_keywords || [];
  const videoUrl = listing?.video_url || '';

  // Check if we have any listing data at all
  const hasListingContent = !!(
    listing?.listing_title ||
    listing?.listing_description ||
    listing?.hero_image_url ||
    listing?.gallery_urls?.length ||
    listing?.bullet_points?.length ||
    listing?.video_url
  );

  // If no listing content, show the empty state with generate CTA
  if (!hasListingContent) {
    return <EmptyState onGenerateAll={onGenerateAll} loading={loading} t={t} />;
  }

  return (
    <div className="space-y-6">
      {/* Product Page Preview */}
      <div className={cn(
        'rounded-2xl border overflow-hidden',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        {/* Store header bar */}
        <div className={cn(
          'flex items-center justify-between px-6 py-3 border-b',
          t('bg-slate-50 border-slate-200', 'bg-white/[0.02] border-white/5')
        )}>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', 'bg-cyan-400')} />
            <span className={cn('text-xs font-medium', t('text-slate-500', 'text-zinc-500'))}>
              Live Preview
            </span>
          </div>
          <div className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>
            yourstore.com/products/{product?.slug || 'product'}
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {/* Main product layout: image left, info right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Image Gallery */}
            <ImageGallery
              heroUrl={heroUrl}
              galleryUrls={galleryUrls}
              productFallbackImage={productFallbackImage}
              t={t}
            />

            {/* Right: Product Info */}
            <div className="space-y-6">
              {/* Brand */}
              {product?.brand && (
                <span className={cn('text-xs font-semibold uppercase tracking-wider', 'text-cyan-400')}>
                  {product.brand}
                </span>
              )}

              {/* Title */}
              <h1 className={cn('text-2xl lg:text-3xl font-bold leading-tight', t('text-slate-900', 'text-white'))}>
                {title}
              </h1>

              {/* Tagline */}
              {tagline && (
                <p className={cn('text-base leading-relaxed', t('text-slate-500', 'text-zinc-400'))}>
                  {tagline}
                </p>
              )}

              {/* Rating placeholder */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-4 h-4',
                        star <= 4 ? 'text-amber-400 fill-amber-400' : cn(t('text-slate-200', 'text-zinc-700'))
                      )}
                    />
                  ))}
                </div>
                <span className={cn('text-xs', t('text-slate-400', 'text-zinc-500'))}>
                  4.0 (Preview)
                </span>
              </div>

              {/* Price */}
              <PriceDisplay price={product?.price} currency={product?.currency} t={t} />

              {/* Bullet Points */}
              {bulletPoints.length > 0 && (
                <ul className="space-y-2.5">
                  {bulletPoints.map((point, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                      <span className={cn('text-sm leading-relaxed', t('text-slate-600', 'text-zinc-300'))}>
                        {point}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}

              {/* Add to Cart / Wishlist mock buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all',
                  'bg-gradient-to-r from-cyan-600 to-blue-600 text-white',
                  'shadow-md shadow-cyan-500/15 hover:shadow-cyan-500/25'
                )}>
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center border transition-all',
                  t(
                    'bg-white border-slate-200 text-slate-400 hover:text-red-400 hover:border-red-200',
                    'bg-white/[0.04] border-white/5 text-zinc-500 hover:text-red-400 hover:border-red-400/20'
                  )
                )}>
                  <Heart className="w-4 h-4" />
                </button>
                <button className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center border transition-all',
                  t(
                    'bg-white border-slate-200 text-slate-400 hover:text-cyan-500 hover:border-cyan-200',
                    'bg-white/[0.04] border-white/5 text-zinc-500 hover:text-cyan-400 hover:border-cyan-400/20'
                  )
                )}>
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Trust badges */}
              <TrustBadges t={t} />
            </div>
          </div>

          {/* Description section */}
          {description && (
            <div className={cn('mt-10 pt-8 border-t', t('border-slate-200', 'border-white/5'))}>
              <h2 className={cn('text-lg font-semibold mb-4', t('text-slate-900', 'text-white'))}>
                Product Description
              </h2>
              <div
                className={cn(
                  'prose prose-sm max-w-none',
                  t(
                    'prose-slate',
                    'prose-invert prose-p:text-zinc-300 prose-strong:text-white prose-li:text-zinc-300 prose-headings:text-white'
                  )
                )}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Video Section */}
      {videoUrl && (
        <div className={cn(
          'rounded-2xl border p-6',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <VideoSection videoUrl={videoUrl} t={t} />
        </div>
      )}

      {/* SEO Preview */}
      {(seoTitle || seoDescription) && (
        <div className={cn(
          'rounded-2xl border p-6',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <SEOPreview seoTitle={seoTitle} seoDescription={seoDescription} t={t} />
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className={cn(
          'rounded-2xl border p-6',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <KeywordsBadges keywords={keywords} t={t} />
        </div>
      )}
    </div>
  );
}
