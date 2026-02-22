import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';

function resolveImageUrl(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object' && img.url) return img.url;
  return null;
}

/**
 * FeaturedProductsRenderer
 *
 * Grid of product cards for the B2B wholesale storefront.
 * Renders placeholder cards until real product data is wired in.
 * Supports configurable columns, card styles, and pricing/inquiry visibility.
 */

const PLACEHOLDER_PRODUCTS = [
  { id: 'ph-1', name: 'Premium Widget A', price: 24.99, sku: 'WDG-001' },
  { id: 'ph-2', name: 'Industrial Component B', price: 89.50, sku: 'IND-002' },
  { id: 'ph-3', name: 'Bulk Fastener Set', price: 12.75, sku: 'FST-003' },
  { id: 'ph-4', name: 'Precision Tool Kit', price: 149.00, sku: 'TLK-004' },
  { id: 'ph-5', name: 'Safety Equipment Pack', price: 67.25, sku: 'SFT-005' },
  { id: 'ph-6', name: 'Electrical Module X', price: 42.00, sku: 'ELC-006' },
  { id: 'ph-7', name: 'Heavy Duty Bracket', price: 18.90, sku: 'BRK-007' },
  { id: 'ph-8', name: 'Custom Assembly Unit', price: 215.00, sku: 'ASM-008' },
];

/**
 * Map columns number to Tailwind grid classes.
 * Mobile: 1-2 cols, Tablet: 2-3 cols, Desktop: user-defined.
 */
function getGridClasses(columns) {
  const desktop = Math.min(Math.max(columns || 4, 2), 6);
  const desktopMap = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };
  return `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${desktopMap[desktop] || 'lg:grid-cols-4'}`;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ------------------------------------------------------------------ */
/*  DetailedCard                                                       */
/* ------------------------------------------------------------------ */

function DetailedCard({ product, showPricing, onAddToCart, onNavigate, index }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--ws-surface) 92%, transparent), color-mix(in srgb, var(--ws-surface) 80%, transparent))',
        border: '1px solid var(--ws-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 0 0 0 transparent',
        transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.25), 0 0 0 1px var(--ws-primary)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 0 0 0 transparent';
        e.currentTarget.style.borderColor = 'var(--ws-border)';
      }}
      onClick={() => onNavigate?.(product.id)}
    >
      {/* Gradient top accent */}
      <div
        className="h-[2px] w-full"
        style={{
          background: 'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, var(--ws-surface)))',
        }}
      />

      {/* Image */}
      <div
        className="relative flex items-center justify-center aspect-square overflow-hidden"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        {resolveImageUrl(product.featured_image) ? (
          <>
            <img
              src={resolveImageUrl(product.featured_image)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            {/* Hover gradient overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 50%, color-mix(in srgb, var(--ws-bg) 70%, transparent) 100%)',
              }}
            />
          </>
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{
              background: 'linear-gradient(145deg, var(--ws-bg), color-mix(in srgb, var(--ws-surface) 60%, var(--ws-bg)))',
            }}
          >
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 15%, transparent), color-mix(in srgb, var(--ws-primary) 5%, transparent))',
                border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
              }}
            >
              <ShoppingBag
                className="w-7 h-7"
                style={{ color: 'var(--ws-primary)', opacity: 0.7 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2.5 p-5 flex-1">
        {/* SKU pill */}
        <span
          className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--ws-surface) 100%, var(--ws-bg))',
            color: 'var(--ws-muted)',
            border: '1px solid var(--ws-border)',
          }}
        >
          {product.sku}
        </span>

        {/* Product name */}
        <h3
          className="text-[17px] font-bold leading-snug transition-colors duration-300"
          style={{
            color: 'var(--ws-text)',
            fontFamily: 'var(--ws-heading-font)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ws-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ws-text)'; }}
        >
          {product.name}
        </h3>

        {/* Price */}
        {showPricing && (
          <div className="mt-auto pt-2 flex items-baseline gap-1.5">
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--ws-muted)' }}
            >
              From
            </span>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: 'var(--ws-primary)' }}
            >
              ${(product.price || 0).toFixed(2)}
            </span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #000))',
            color: 'var(--ws-bg)',
            boxShadow: '0 4px 16px color-mix(in srgb, var(--ws-primary) 25%, transparent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 28px color-mix(in srgb, var(--ws-primary) 40%, transparent)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px color-mix(in srgb, var(--ws-primary) 25%, transparent)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Plus className="w-4 h-4" />
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  CompactCard                                                        */
/* ------------------------------------------------------------------ */

function CompactCard({ product, showPricing, onAddToCart, onNavigate, index }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
      className="group flex items-center gap-4 rounded-2xl p-4 cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--ws-surface) 92%, transparent), color-mix(in srgb, var(--ws-surface) 80%, transparent))',
        border: '1px solid var(--ws-border)',
        borderLeft: '3px solid var(--ws-primary)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
      onClick={() => onNavigate?.(product.id)}
    >
      {/* Small image */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl overflow-hidden"
        style={{
          background: product.featured_image
            ? 'var(--ws-bg)'
            : 'linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 10%, var(--ws-bg)), var(--ws-bg))',
          border: '1px solid var(--ws-border)',
        }}
      >
        {resolveImageUrl(product.featured_image) ? (
          <img
            src={resolveImageUrl(product.featured_image)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ShoppingBag className="w-6 h-6" style={{ color: 'var(--ws-muted)' }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-sm font-bold truncate transition-colors duration-300"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>
        {showPricing && (
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--ws-muted)' }}>
              From
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--ws-primary)' }}>
              ${(product.price || 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Action */}
      <button
        onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #000))',
          color: 'var(--ws-bg)',
          boxShadow: '0 2px 8px color-mix(in srgb, var(--ws-primary) 20%, transparent)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 4px 16px color-mix(in srgb, var(--ws-primary) 35%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--ws-primary) 20%, transparent)';
        }}
      >
        <Plus className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MinimalCard                                                        */
/* ------------------------------------------------------------------ */

function MinimalCard({ product, showPricing, onNavigate, index }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group flex items-center justify-between gap-4 rounded-xl px-5 py-4 cursor-pointer"
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
        border: '1px solid var(--ws-border)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-surface) 65%, transparent)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 30%, var(--ws-border))';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-surface) 40%, transparent)';
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => onNavigate?.(product.id)}
    >
      <div className="min-w-0">
        <h3
          className="text-sm font-bold truncate transition-colors duration-300"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>
        <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--ws-muted)' }}>
          {product.sku}
        </p>
      </div>

      {showPricing && (
        <span
          className="text-base font-bold flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 65%, var(--ws-text)))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ${(product.price || 0).toFixed(2)}
        </span>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card component map                                                 */
/* ------------------------------------------------------------------ */

const CARD_COMPONENTS = {
  detailed: DetailedCard,
  compact: CompactCard,
  minimal: MinimalCard,
};

/* ------------------------------------------------------------------ */
/*  Main renderer                                                      */
/* ------------------------------------------------------------------ */

export default function FeaturedProductsRenderer({ section, theme }) {
  const navigate = useNavigate();
  const { addToCart, orgId, companyId: ctxCompanyId } = useWholesale();
  const resolvedCompanyId = ctxCompanyId || orgId;

  const {
    heading = '',
    subheading = '',
    productIds = [],
    maxItems = 8,
    columns = 4,
    showPricing = true,
    cardStyle = 'detailed',
  } = section?.props || {};

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedCompanyId) {
      setProducts(PLACEHOLDER_PRODUCTS.slice(0, maxItems));
      setProductsLoading(false);
      return;
    }

    let cancelled = false;
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        let query;
        if (productIds && productIds.length > 0) {
          query = supabase
            .from('products')
            .select('id, name, price, sku, featured_image')
            .in('id', productIds)
            .eq('status', 'published')
            .eq('type', 'physical')
            .limit(maxItems);
        } else {
          // Fetch published physical products for this company
          query = supabase
            .from('products')
            .select('id, name, price, sku, featured_image')
            .eq('company_id', resolvedCompanyId)
            .eq('status', 'published')
            .eq('type', 'physical')
            .order('created_at', { ascending: false })
            .limit(maxItems);
        }

        const { data, error } = await query;
        if (cancelled) return;

        if (error || !data?.length) {
          setProducts(PLACEHOLDER_PRODUCTS.slice(0, maxItems));
        } else {
          setProducts(data.map(p => ({
            ...p,
            price: p.price || 0,
          })));
        }
      } catch (err) {
        if (!cancelled) {
          setProducts(PLACEHOLDER_PRODUCTS.slice(0, maxItems));
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [resolvedCompanyId, JSON.stringify(productIds), maxItems]);

  const CardComponent = CARD_COMPONENTS[cardStyle] || DetailedCard;
  const gridClasses = getGridClasses(columns);

  const handleNavigate = (productId) => {
    navigate(`product/${productId}`);
  };

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price || 0,
      sku: product.sku,
      quantity: 1,
    });
  };

  return (
    <section
      className="w-full px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
        backgroundColor: 'var(--ws-bg)',
      }}
    >
      {/* Section header */}
      {(heading || subheading) && (
        <motion.div
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12 max-w-3xl"
        >
          {/* Gradient accent line */}
          <div
            className="w-16 h-[3px] rounded-full mb-6"
            style={{
              background: 'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent))',
            }}
          />

          {heading && (
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-[1.1]"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="text-base lg:text-lg leading-relaxed max-w-2xl"
              style={{ color: 'var(--ws-muted)' }}
            >
              {subheading}
            </p>
          )}
        </motion.div>
      )}

      {/* Product grid */}
      <div className={`grid gap-6 ${gridClasses}`}>
        {products.map((product, i) => (
          <CardComponent
            key={product.id}
            product={product}
            showPricing={showPricing}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
