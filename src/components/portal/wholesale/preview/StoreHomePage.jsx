// ---------------------------------------------------------------------------
// StoreHomePage.jsx -- Practical B2B wholesale storefront home page.
// No marketing fluff. Focused on: search, browse, quick ordering, categories.
// Renders entirely from props -- no router, no direct Supabase calls.
// Uses CSS custom properties (--ws-*) for theming.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Package,
  ShoppingBag,
  ClipboardList,
  User,
  ArrowRight,
  Plus,
  Check,
  Grid3X3,
  LayoutGrid,
  Filter,
} from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import {
  glassCardStyle,
  gradientTextStyle,
  resolveImageUrl,
  formatCurrency,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const cardFade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// ---------------------------------------------------------------------------
// SearchHero -- Compact, functional search bar with greeting
// ---------------------------------------------------------------------------

function SearchHero({ config, client, nav }) {
  const [searchValue, setSearchValue] = useState('');
  const storeName =
    config?.navigation?.companyName || config?.seo?.title || 'Store';

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      nav?.navigateTo('catalog', searchValue.trim() ? { search: searchValue.trim() } : undefined);
    },
    [searchValue, nav],
  );

  const greeting = client?.full_name
    ? `Welcome back, ${client.full_name.split(' ')[0]}`
    : storeName;

  return (
    <section
      className="relative"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, var(--ws-primary) 4%, var(--ws-bg)), var(--ws-bg) 100%)`,
      }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          {/* Greeting + quick nav */}
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
              >
                {greeting}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                {client ? 'What are you looking for today?' : config?.seo?.description || 'Browse our wholesale catalog'}
              </p>
            </div>
            {client && (
              <div className="hidden sm:flex items-center gap-2">
                <NavChip icon={ClipboardList} label="Orders" onClick={() => nav?.navigateTo('orders')} />
                <NavChip icon={User} label="Account" onClick={() => nav?.navigateTo('account')} />
              </div>
            )}
          </motion.div>

          {/* Search bar */}
          <motion.form variants={fadeUp} onSubmit={handleSearch} className="relative max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
              style={{ color: 'var(--ws-muted)' }}
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products by name, SKU, or category..."
              className="w-full rounded-xl pl-12 pr-28 py-3.5 text-sm outline-none transition-all duration-200"
              style={{
                background: 'color-mix(in srgb, var(--ws-surface) 70%, transparent)',
                border: '1px solid var(--ws-border)',
                color: 'var(--ws-text)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ws-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ws-primary) 10%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--ws-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: 'var(--ws-primary)',
                color: 'var(--ws-bg)',
              }}
            >
              Search
            </button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// NavChip -- Small navigation pill
// ---------------------------------------------------------------------------

function NavChip({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
        color: 'var(--ws-muted)',
        border: '1px solid var(--ws-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-primary)';
        e.currentTarget.style.color = 'var(--ws-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.color = 'var(--ws-muted)';
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// CategoryBar -- Horizontal scrollable category pills
// ---------------------------------------------------------------------------

function CategoryBar({ products, nav }) {
  const categories = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const cat = p.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [products]);

  if (categories.length <= 1) return null;

  return (
    <section className="w-full px-4 sm:px-6 lg:px-10 pb-2">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => nav?.navigateTo('catalog')}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: 'var(--ws-primary)',
              color: 'var(--ws-bg)',
            }}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All Products
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => nav?.navigateTo('catalog', { category: cat })}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap"
              style={{
                ...glassCardStyle,
                color: 'var(--ws-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
                e.currentTarget.style.color = 'var(--ws-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ws-border)';
                e.currentTarget.style.color = 'var(--ws-muted)';
              }}
            >
              {cat}
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--ws-border) 60%, transparent)',
                  color: 'var(--ws-muted)',
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ProductCard -- Compact product card for homepage grid
// ---------------------------------------------------------------------------

function ProductCard({ product, cart, nav, index }) {
  const [added, setAdded] = useState(false);
  const image = resolveImageUrl(product.featured_image);
  const rawPrice = product.price || product.pricing?.wholesale_price || product.pricing?.base_price;
  const price =
    typeof rawPrice === 'string'
      ? parseFloat(rawPrice) || null
      : rawPrice || null;

  const handleAddToCart = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (added) return;
      cart?.addItem(product, 1);
      setAdded(true);
    },
    [product, cart, added],
  );

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <motion.div
      custom={index}
      variants={cardFade}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <div
        className="group flex flex-col rounded-xl overflow-hidden h-full cursor-pointer"
        style={{
          ...glassCardStyle,
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease, transform 0.25s ease',
        }}
        onClick={() => nav?.goToProduct(product.id)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--ws-border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Image */}
        <div
          className="relative aspect-square overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--ws-bg) 90%, var(--ws-surface))' }}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy" decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 opacity-10" style={{ color: 'var(--ws-muted)' }} />
            </div>
          )}

          {/* Category pill */}
          {product.category && (
            <span
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {product.category}
            </span>
          )}

          {/* Quick add button (shows on hover) */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
            style={{
              background: added ? '#22c55e' : 'var(--ws-primary)',
              color: 'var(--ws-bg)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1 p-3.5 flex-1">
          {product.sku && (
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ color: 'var(--ws-muted)' }}
            >
              {product.sku}
            </p>
          )}
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
          >
            {product.name}
          </h3>
          {price != null && (
            <div className="flex items-baseline gap-1 mt-auto pt-1">
              <span className="text-base font-bold" style={gradientTextStyle()}>
                {formatCurrency(price)}
              </span>
              {product.unit && (
                <span className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>
                  / {product.unit}
                </span>
              )}
            </div>
          )}
          {/* Bulk pricing indicator */}
          {(() => {
            const tiers = product?.pricing?.volume_tiers;
            if (!Array.isArray(tiers) || tiers.length === 0) return null;
            const sorted = [...tiers].sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0));
            const best = sorted[sorted.length - 1];
            if (!best?.price || !best?.min_quantity) return null;
            return (
              <span className="text-[10px] font-medium" style={{ color: 'var(--ws-primary)' }}>
                From {formatCurrency(best.price)} at {best.min_quantity}+
              </span>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ProductGrid -- Featured products with "View All" link
// ---------------------------------------------------------------------------

function ProductGrid({ products, cart, nav, title, count = 18 }) {
  const featured = products.slice(0, count);
  if (featured.length === 0) return null;

  return (
    <section className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
          >
            {title}
          </h2>
          <button
            onClick={() => nav?.navigateTo('catalog')}
            className="inline-flex items-center gap-1 text-sm font-medium transition-opacity"
            style={{ color: 'var(--ws-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
      >
        {featured.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            cart={cart}
            nav={nav}
            index={i}
          />
        ))}
      </motion.div>

      {products.length > count && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-8 text-center">
          <button
            onClick={() => nav?.navigateTo('catalog')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
              color: 'var(--ws-text)',
              border: '1px solid var(--ws-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--ws-primary)';
              e.currentTarget.style.color = 'var(--ws-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--ws-border)';
              e.currentTarget.style.color = 'var(--ws-text)';
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            Browse All {products.length} Products
          </button>
        </motion.div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StoreHomePage({
  config,
  products = [],
  sections = [],
  logoUrl,
  nav,
  cart,
  sectionMap,
  paddingMap,
  getBackgroundStyle: getBackgroundStyleProp,
}) {
  const wholesale = useWholesale();
  const client = wholesale?.client || null;

  return (
    <div style={{ fontFamily: 'var(--ws-font)', color: 'var(--ws-text)' }}>
      {/* 1. Search Hero -- compact greeting + search */}
      <SearchHero config={config} client={client} nav={nav} />

      {/* 2. Category Bar -- horizontal scrollable category pills */}
      <CategoryBar products={products} nav={nav} />

      {/* 3. Product Grid -- featured products */}
      <ProductGrid
        products={products}
        cart={cart}
        nav={nav}
        title="Products"
        count={18}
      />
    </div>
  );
}
