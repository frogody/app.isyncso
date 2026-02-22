// ---------------------------------------------------------------------------
// StoreHomePage.jsx -- Professional B2B wholesale storefront home page.
// Renders a personalized welcome hero, quick action cards, featured product
// grid, and configured store builder sections at the bottom.
//
// Renders entirely from props -- no router, no direct Supabase calls.
// Uses CSS custom properties (--ws-*) for theming.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  TrendingUp,
  Clock,
  Shield,
  Truck,
  Star,
} from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import {
  GlassCard,
  GlassInput,
  TrustBar,
  motionVariants,
  glassCardStyle,
  gradientTextStyle,
  gradientAccentBar,
  resolveImageUrl,
  formatCurrency,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const heroChild = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const productStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.3 },
  },
};

const productItem = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// ---------------------------------------------------------------------------
// WelcomeHero
// ---------------------------------------------------------------------------

function WelcomeHero({ config, client, nav, logoUrl }) {
  const [searchValue, setSearchValue] = useState('');
  const storeName =
    config?.navigation?.companyName ||
    config?.seo?.title ||
    'Your Store';
  const tagline =
    config?.seo?.description || 'Your trusted B2B wholesale partner';

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      if (searchValue.trim()) {
        nav?.navigateTo('catalog', { search: searchValue.trim() });
      } else {
        nav?.navigateTo('catalog');
      }
    },
    [searchValue, nav],
  );

  const greeting = client?.full_name
    ? `Welcome back, ${client.full_name.split(' ')[0]}`
    : `Welcome to ${storeName}`;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 8%, var(--ws-bg)), var(--ws-bg) 60%, color-mix(in srgb, var(--ws-primary) 5%, var(--ws-bg)))`,
      }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in srgb, var(--ws-primary) 6%, transparent), transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          {/* Greeting */}
          <motion.p
            variants={heroChild}
            className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--ws-primary)' }}
          >
            {greeting}
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={heroChild}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4"
            style={{
              color: 'var(--ws-text)',
              fontFamily: 'var(--ws-heading-font)',
            }}
          >
            {client
              ? 'Ready to place your next order?'
              : `${storeName}`}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={heroChild}
            className="text-base sm:text-lg leading-relaxed mb-8 max-w-2xl"
            style={{ color: 'var(--ws-muted)' }}
          >
            {tagline}
          </motion.p>

          {/* Search bar */}
          <motion.form
            variants={heroChild}
            onSubmit={handleSearch}
            className="relative max-w-xl mb-8"
          >
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
              style={{ color: 'var(--ws-muted)' }}
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products by name, SKU, or category..."
              className="w-full rounded-2xl pl-12 pr-32 py-4 text-sm outline-none transition-all duration-200"
              style={{
                background:
                  'color-mix(in srgb, var(--ws-surface) 70%, transparent)',
                border: '1px solid var(--ws-border)',
                color: 'var(--ws-text)',
                backdropFilter: 'blur(8px)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ws-primary)';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px color-mix(in srgb, var(--ws-primary) 12%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--ws-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                color: '#fff',
                boxShadow:
                  '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 16px color-mix(in srgb, var(--ws-primary) 35%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)';
              }}
            >
              Search
            </button>
          </motion.form>

          {/* CTA Buttons */}
          <motion.div variants={heroChild} className="flex flex-wrap gap-3">
            <button
              onClick={() => nav?.navigateTo('catalog')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                color: '#fff',
                boxShadow:
                  '0 2px 12px color-mix(in srgb, var(--ws-primary) 30%, transparent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 20px color-mix(in srgb, var(--ws-primary) 40%, transparent)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 12px color-mix(in srgb, var(--ws-primary) 30%, transparent)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Catalog
            </button>

            {client && (
              <button
                onClick={() => nav?.navigateTo('orders')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background:
                    'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
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
                <ClipboardList className="w-4 h-4" />
                View Orders
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// QuickActionCards -- contextual action cards below the hero
// ---------------------------------------------------------------------------

function QuickActionCards({ nav, client }) {
  const actions = [
    {
      icon: ShoppingBag,
      title: 'Browse Products',
      description: 'Explore our full catalog of wholesale products',
      page: 'catalog',
    },
    {
      icon: ClipboardList,
      title: 'Order History',
      description: 'Track and reorder from your past orders',
      page: 'orders',
    },
    {
      icon: User,
      title: 'Account Settings',
      description: 'Manage your company details and preferences',
      page: 'account',
    },
  ];

  if (!client) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-6 relative z-10">
      <motion.div
        variants={cardStagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.page}
              variants={cardItem}
              onClick={() => nav?.navigateTo(action.page)}
              className="group flex items-start gap-4 p-5 rounded-2xl text-left transition-all duration-300"
              style={{
                ...glassCardStyle,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
                e.currentTarget.style.boxShadow =
                  '0 12px 32px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ws-border)';
                e.currentTarget.style.boxShadow =
                  '0 1px 3px rgba(0,0,0,0.08)';
              }}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  background:
                    'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
                  border:
                    '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: 'var(--ws-primary)' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-semibold mb-0.5"
                  style={{
                    color: 'var(--ws-text)',
                    fontFamily: 'var(--ws-heading-font)',
                  }}
                >
                  {action.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  {action.description}
                </p>
              </div>
              <ArrowRight
                className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5"
                style={{ color: 'var(--ws-primary)' }}
              />
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ProductCard -- featured product card for home page
// ---------------------------------------------------------------------------

function HomeProductCard({ product, cart, nav, index }) {
  const [added, setAdded] = useState(false);
  const image = resolveImageUrl(product.featured_image);
  const price =
    typeof product.price === 'string'
      ? parseFloat(product.price) || null
      : product.price;

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
      variants={productItem}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <div
        className="group flex flex-col rounded-2xl overflow-hidden h-full cursor-pointer"
        style={{
          ...glassCardStyle,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition:
            'box-shadow 0.35s ease, border-color 0.35s ease, transform 0.3s ease',
        }}
        onClick={() => nav?.goToProduct(product.id)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor =
            'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
          e.currentTarget.style.boxShadow =
            '0 16px 40px rgba(0,0,0,0.2)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--ws-border)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Gradient accent bar */}
        <div style={gradientAccentBar} />

        {/* Image */}
        <div
          className="relative aspect-square overflow-hidden"
          style={{
            background:
              'color-mix(in srgb, var(--ws-bg) 90%, var(--ws-surface))',
          }}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package
                className="w-12 h-12 opacity-15"
                style={{ color: 'var(--ws-muted)' }}
              />
            </div>
          )}

          {/* Hover gradient overlay */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, color-mix(in srgb, var(--ws-bg) 40%, transparent) 0%, transparent 50%)',
            }}
          />

          {/* Category pill */}
          {product.category && (
            <span
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(0,0,0,0.55)',
                color: 'var(--ws-text)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {product.category}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1.5 p-4 sm:p-5 flex-1">
          {/* SKU */}
          {product.sku && (
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--ws-muted)' }}
            >
              {product.sku}
            </p>
          )}

          {/* Product name */}
          <h3
            className="text-sm font-bold leading-snug line-clamp-2"
            style={{
              color: 'var(--ws-text)',
              fontFamily: 'var(--ws-heading-font, var(--ws-font))',
            }}
          >
            {product.name}
          </h3>

          {/* Price */}
          {price != null && (
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className="text-lg font-bold"
                style={gradientTextStyle()}
              >
                {formatCurrency(price)}
              </span>
              {product.unit && (
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  / {product.unit}
                </span>
              )}
            </div>
          )}

          {/* Spacer + Add to Cart */}
          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-250"
              style={{
                background: added
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                color: '#fff',
                boxShadow: added
                  ? '0 2px 12px rgba(34,197,94,0.3)'
                  : '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)',
              }}
              onMouseEnter={(e) => {
                if (!added) {
                  e.currentTarget.style.boxShadow =
                    '0 4px 20px color-mix(in srgb, var(--ws-primary) 40%, transparent)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!added) {
                  e.currentTarget.style.boxShadow =
                    '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FeaturedProductsSection
// ---------------------------------------------------------------------------

function FeaturedProductsSection({ products, cart, nav }) {
  const featured = products.slice(0, 8);

  if (featured.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Section header */}
      <motion.div
        variants={motionVariants.heading}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mb-10"
      >
        <div
          className="h-[2px] w-16 mb-5 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent))',
          }}
        />
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font, var(--ws-font))',
              }}
            >
              Featured Products
            </h2>
            <p
              className="mt-1.5 text-sm sm:text-base"
              style={{ color: 'var(--ws-muted)' }}
            >
              Hand-picked products from our wholesale catalog
            </p>
          </div>
          <button
            onClick={() => nav?.navigateTo('catalog')}
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--ws-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            View All Products
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Product grid */}
      <motion.div
        variants={productStagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {featured.map((product, i) => (
          <HomeProductCard
            key={product.id}
            product={product}
            cart={cart}
            nav={nav}
            index={i}
          />
        ))}
      </motion.div>

      {/* View all link -- bottom */}
      {products.length > 8 && (
        <motion.div
          variants={motionVariants.fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <button
            onClick={() => nav?.navigateTo('catalog')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background:
                'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
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
            View All {products.length} Products
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TrustSection -- trust signals strip
// ---------------------------------------------------------------------------

function TrustSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <TrustBar />
    </section>
  );
}

// ---------------------------------------------------------------------------
// StoreSections -- renders configured store builder sections at the bottom
// ---------------------------------------------------------------------------

function StoreSections({ sections, sectionMap, paddingMap, getBackgroundStyle, theme }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div>
      {sections.map((section) => {
        const Component = sectionMap?.[section.type];
        if (!Component) return null;

        const paddingClass =
          (paddingMap && paddingMap[section.padding]) || 'py-12';
        const bgStyle = getBackgroundStyle
          ? getBackgroundStyle(section.background)
          : {};

        return (
          <div
            key={section.id}
            data-section-id={section.id}
            className={`section-${section.type} ${section.customClass || ''} ${paddingClass}`}
            style={bgStyle}
          >
            <Component section={section} theme={theme} />
          </div>
        );
      })}
    </div>
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
  const theme = config?.theme ?? {};

  return (
    <div
      style={{
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
      }}
    >
      {/* 1. Welcome Hero */}
      <WelcomeHero
        config={config}
        client={client}
        nav={nav}
        logoUrl={logoUrl}
      />

      {/* 2. Quick Action Cards (authenticated only) */}
      <QuickActionCards nav={nav} client={client} />

      {/* 3. Trust Signals */}
      <TrustSection />

      {/* 4. Featured Products */}
      <FeaturedProductsSection
        products={products}
        cart={cart}
        nav={nav}
      />

      {/* 5. Store Builder Sections */}
      <StoreSections
        sections={sections}
        sectionMap={sectionMap}
        paddingMap={paddingMap}
        getBackgroundStyle={getBackgroundStyleProp}
        theme={theme}
      />
    </div>
  );
}
