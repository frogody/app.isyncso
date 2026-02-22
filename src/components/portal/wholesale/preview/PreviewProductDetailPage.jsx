// ---------------------------------------------------------------------------
// PreviewProductDetailPage.jsx -- Premium B2B wholesale product detail page.
// Glass-morphism design system, bulk pricing with dynamic tier highlighting,
// MOQ enforcement, related products, specifications, and document downloads.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  ClipboardPlus,
  Check,
  ArrowLeft,
  FileText,
  Truck,
  MessageSquareQuote,
  Tag,
  Info,
  BoxesIcon,
  Download,
  Award,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  StatusBadge,
  QuantityInput,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
  resolveImageUrl,
  resolveGalleryUrls,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProductPrice(product) {
  if (!product) return 0;
  return (
    product.b2b_price ??
    product.wholesale_price ??
    product.price ??
    0
  );
}

function getStockStatus(product) {
  const qty = product?.stock_quantity ?? product?.stock;
  if (qty == null)
    return { label: 'In Stock', status: 'success', available: true };
  if (typeof qty === 'string') {
    const lower = qty.toLowerCase();
    if (lower.includes('out'))
      return { label: 'Out of Stock', status: 'error', available: false };
    if (lower.includes('low') || lower.includes('limited'))
      return { label: 'Low Stock', status: 'warning', available: true };
    return { label: 'In Stock', status: 'success', available: true };
  }
  if (typeof qty === 'number') {
    if (qty <= 0)
      return { label: 'Out of Stock', status: 'error', available: false };
    if (qty <= 10)
      return { label: 'Low Stock', status: 'warning', available: true };
    return { label: 'In Stock', status: 'success', available: true };
  }
  return { label: 'In Stock', status: 'success', available: true };
}

function collectImages(product) {
  if (!product) return [];
  const images = [];
  const featuredUrl = resolveImageUrl(product.featured_image);
  if (featuredUrl) images.push(featuredUrl);
  const imageUrl = resolveImageUrl(product.image);
  if (imageUrl && !images.includes(imageUrl)) images.push(imageUrl);
  const galleryUrls = resolveGalleryUrls(product.gallery_images || product.gallery || []);
  galleryUrls.forEach((url) => {
    if (url && !images.includes(url)) images.push(url);
  });
  return images;
}

function parseSpecifications(specs) {
  if (!specs) return [];
  if (Array.isArray(specs)) {
    return specs.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const key = item.key || item.label || item.name || `Spec ${i + 1}`;
        const value = item.value ?? item.description ?? '';
        return { key, value: String(value) };
      }
      return { key: `Spec ${i + 1}`, value: String(item) };
    });
  }
  if (typeof specs === 'object') {
    return Object.entries(specs).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));
  }
  return [];
}

function getBulkTiers(product, basePrice) {
  const tiers =
    product?.bulk_pricing ||
    product?.pricing_tiers ||
    null;
  if (Array.isArray(tiers) && tiers.length > 0) {
    return tiers
      .sort((a, b) => (a.min_qty || 0) - (b.min_qty || 0))
      .map((tier) => ({
        minQty: tier.min_qty || tier.quantity || 0,
        unitPrice: tier.price || tier.unit_price || basePrice,
      }));
  }
  // Fallback: generate sensible B2B tiers
  if (!basePrice) return [];
  return [
    { minQty: 1, unitPrice: basePrice },
    { minQty: 10, unitPrice: +(basePrice * 0.92).toFixed(2) },
    { minQty: 50, unitPrice: +(basePrice * 0.85).toFixed(2) },
    { minQty: 100, unitPrice: +(basePrice * 0.75).toFixed(2) },
    { minQty: 250, unitPrice: +(basePrice * 0.68).toFixed(2) },
  ];
}

function getActiveTierIndex(tiers, qty) {
  let active = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (qty >= tiers[i].minQty) active = i;
  }
  return active;
}

function getMoq(product) {
  return product?.moq || product?.minimum_order_quantity || 1;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImageGallery({ images, activeIndex, onSelect }) {
  if (images.length === 0) {
    return (
      <div
        className="aspect-square rounded-2xl flex items-center justify-center"
        style={{
          ...glassCardStyle,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <Package
          className="w-20 h-20"
          style={{ color: 'var(--ws-muted)', opacity: 0.2 }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="aspect-square rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          ...glassCardStyle,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <img
          src={images[activeIndex] || images[0]}
          alt="Product"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 6).map((url, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all duration-300"
              style={{
                ...glassCardStyle,
                border:
                  idx === activeIndex
                    ? '2px solid transparent'
                    : '1px solid var(--ws-border)',
                backgroundImage:
                  idx === activeIndex
                    ? undefined
                    : undefined,
                boxShadow:
                  idx === activeIndex
                    ? '0 0 0 2px var(--ws-primary), 0 4px 12px rgba(0,0,0,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                opacity: idx === activeIndex ? 1 : 0.65,
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpecificationsTable({ specs }) {
  const rows = useMemo(() => parseSpecifications(specs), [specs]);
  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        ...glassCardStyle,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div style={gradientAccentBar} />
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--ws-border)' }}
      >
        <Layers className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
        <h3
          className="text-base font-bold"
          style={{
            color: 'var(--ws-text)',
            fontFamily: 'var(--ws-heading-font, var(--ws-font))',
          }}
        >
          Specifications
        </h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom:
                  i < rows.length - 1 ? '1px solid var(--ws-border)' : 'none',
                background:
                  i % 2 === 0
                    ? 'transparent'
                    : 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
              }}
            >
              <td
                className="px-5 py-3 font-medium whitespace-nowrap"
                style={{ color: 'var(--ws-muted)', width: '40%' }}
              >
                {row.key}
              </td>
              <td className="px-5 py-3" style={{ color: 'var(--ws-text)' }}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkPricingTable({ tiers, basePrice, quantity, unit }) {
  if (!tiers || tiers.length === 0) return null;
  const activeTier = getActiveTierIndex(tiers, quantity);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        ...glassCardStyle,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div style={gradientAccentBar} />
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--ws-border)' }}
      >
        <Tag className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
        <h3
          className="text-base font-bold"
          style={{
            color: 'var(--ws-text)',
            fontFamily: 'var(--ws-heading-font, var(--ws-font))',
          }}
        >
          Volume Pricing
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ws-border)' }}>
            {['Quantity', `Unit Price`, 'Total', 'Savings'].map((h) => (
              <th
                key={h}
                className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, i) => {
            const isActive = i === activeTier;
            const nextMin = tiers[i + 1]?.minQty;
            const rangeLabel = nextMin
              ? `${tier.minQty} - ${nextMin - 1}`
              : `${tier.minQty}+`;
            const savings =
              basePrice > 0 && tier.unitPrice < basePrice
                ? Math.round(((basePrice - tier.unitPrice) / basePrice) * 100)
                : 0;
            const total = tier.unitPrice * (isActive ? quantity : tier.minQty);
            const isBestValue = i === tiers.length - 1;

            return (
              <tr
                key={i}
                style={{
                  borderBottom:
                    i < tiers.length - 1
                      ? '1px solid var(--ws-border)'
                      : 'none',
                  background: isActive
                    ? 'color-mix(in srgb, var(--ws-primary) 8%, transparent)'
                    : 'transparent',
                }}
              >
                <td className="px-5 py-3" style={{ color: 'var(--ws-text)' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rangeLabel} {unit || 'units'}</span>
                    {isActive && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider"
                        style={{
                          background:
                            'color-mix(in srgb, var(--ws-primary) 15%, transparent)',
                          color: 'var(--ws-primary)',
                          border:
                            '1px solid color-mix(in srgb, var(--ws-primary) 30%, transparent)',
                        }}
                      >
                        Your tier
                      </span>
                    )}
                    {isBestValue && !isActive && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider"
                        style={{
                          background: 'rgba(34,197,94,0.12)',
                          color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.25)',
                        }}
                      >
                        Best value
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className="px-5 py-3 font-semibold"
                  style={{
                    ...gradientTextStyle(),
                  }}
                >
                  {formatCurrency(tier.unitPrice)}
                </td>
                <td
                  className="px-5 py-3 font-medium"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {formatCurrency(total)}
                </td>
                <td className="px-5 py-3">
                  {savings > 0 ? (
                    <StatusBadge status="success" label={`Save ${savings}%`} />
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: 'var(--ws-muted)' }}
                    >
                      Base price
                    </span>
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

function ProductDocuments() {
  const docs = [
    {
      name: 'Technical Datasheet',
      type: 'PDF',
      size: '2.4 MB',
      icon: FileText,
    },
    {
      name: 'Safety Certificate (CE)',
      type: 'PDF',
      size: '1.1 MB',
      icon: ShieldCheck,
    },
    {
      name: 'Quality Assurance Report',
      type: 'PDF',
      size: '3.8 MB',
      icon: Award,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {docs.map((doc, i) => {
        const Icon = doc.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 group"
            style={{
              ...glassCardStyle,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--ws-border)';
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: 'var(--ws-primary)' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--ws-text)' }}
              >
                {doc.name}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--ws-muted)' }}
              >
                {doc.type} -- {doc.size}
              </p>
            </div>
            <Download
              className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--ws-primary)' }}
            />
          </div>
        );
      })}
    </div>
  );
}

function RelatedProducts({ products, currentProduct, nav }) {
  const related = useMemo(() => {
    const currentCategory = currentProduct?.category;
    const currentId = currentProduct?.id;
    // Prefer same category, then fill with others
    const sameCategory = products.filter(
      (p) => p.id !== currentId && p.category === currentCategory,
    );
    const others = products.filter(
      (p) =>
        p.id !== currentId &&
        (!currentCategory || p.category !== currentCategory),
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [products, currentProduct]);

  if (related.length === 0) return null;

  return (
    <motion.div
      variants={motionVariants.container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      <SectionHeader
        title="Related Products"
        subtitle="Other items you may need for your order"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {related.map((product, i) => {
          const img = resolveImageUrl(product.featured_image) || resolveImageUrl(product.image);
          const price = getProductPrice(product);
          return (
            <GlassCard
              key={product.id}
              custom={i}
              variants={motionVariants.staggerItem}
              accentBar
              onClick={() => nav?.goToProduct?.(product.id)}
              className="cursor-pointer"
            >
              <div
                className="aspect-[4/3] flex items-center justify-center overflow-hidden"
                style={{
                  background:
                    'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
                }}
              >
                {img ? (
                  <img
                    src={img}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Package
                    className="w-10 h-10"
                    style={{ color: 'var(--ws-muted)', opacity: 0.15 }}
                  />
                )}
              </div>
              <div className="p-4 flex flex-col gap-2">
                <h3
                  className="text-sm font-semibold truncate"
                  style={{
                    color: 'var(--ws-text)',
                    fontFamily: 'var(--ws-heading-font, var(--ws-font))',
                  }}
                >
                  {product.name}
                </h3>
                {product.sku && (
                  <p
                    className="text-[11px] font-medium uppercase tracking-wider"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    SKU: {product.sku}
                  </p>
                )}
                {price > 0 && (
                  <span
                    className="text-base font-bold"
                    style={gradientTextStyle()}
                  >
                    {formatCurrency(price)}
                  </span>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Demo fallback data
// ---------------------------------------------------------------------------

const DEMO_SPECS = {
  Weight: '2.4 kg',
  Dimensions: '240 x 180 x 55 mm',
  Material: 'Stainless Steel 304',
  Color: 'Silver',
  Warranty: '24 months',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PreviewProductDetailPage({
  config,
  products = [],
  pageData,
  orgId,
  cart,
  nav,
}) {
  const pd = config?.productDetail || {};
  const showSKU = pd.showSKU !== false;
  const showStock = pd.showStock !== false;
  const showSpecifications = pd.showSpecifications !== false;
  const showBulkPricing = pd.showBulkPricing !== false;
  const showRelatedProducts = pd.showRelatedProducts !== false;
  const showInquiryButton = pd.showInquiryButton !== false;

  // ---- State ----
  const [product, setProduct] = useState(null);
  const [dbProduct, setDbProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToOrder, setAddedToOrder] = useState(false);

  // ---- Resolve product from products array ----
  useEffect(() => {
    const productId = pageData?.productId;
    if (productId && products.length > 0) {
      const found = products.find(
        (p) => p.id === productId || String(p.id) === String(productId),
      );
      setProduct(found || products[0]);
    } else if (products.length > 0) {
      setProduct(products[0]);
    }
    setActiveImageIndex(0);
    setAddedToOrder(false);
  }, [pageData?.productId, products]);

  // Set initial quantity to MOQ when product changes
  useEffect(() => {
    if (product) {
      const moq = getMoq(product);
      setQuantity(moq);
    }
  }, [product]);

  // ---- Optionally fetch richer data from DB ----
  useEffect(() => {
    const productId = pageData?.productId;
    if (!productId || !orgId) return;
    let cancelled = false;

    async function fetchFromDB() {
      try {
        const { getB2BProduct } = await import('@/lib/db/queries/b2b');
        const data = await getB2BProduct(productId);
        if (!cancelled && data) setDbProduct(data);
      } catch {
        // Silently ignore -- fallback to products array
      }
    }

    fetchFromDB();
    return () => {
      cancelled = true;
    };
  }, [pageData?.productId, orgId]);

  // ---- Merge product data with DB data ----
  const mergedProduct = useMemo(() => {
    if (!product) return null;
    if (!dbProduct) return product;
    return {
      ...product,
      featured_image:
        dbProduct.featured_image || product.featured_image || product.image,
      gallery_images:
        dbProduct.gallery_images ||
        dbProduct.gallery ||
        product.gallery_images ||
        product.gallery ||
        [],
      specifications:
        dbProduct.physical_products?.[0]?.specifications ||
        dbProduct.specifications ||
        product.specifications,
      description: dbProduct.description || product.description,
    };
  }, [product, dbProduct]);

  // ---- Derived data ----
  const images = useMemo(
    () => collectImages(mergedProduct),
    [mergedProduct],
  );
  const stockInfo = mergedProduct
    ? getStockStatus(mergedProduct)
    : { label: 'In Stock', status: 'success', available: true };
  const basePrice = getProductPrice(mergedProduct);
  const moq = getMoq(mergedProduct);
  const bulkTiers = useMemo(
    () => getBulkTiers(mergedProduct, basePrice),
    [mergedProduct, basePrice],
  );
  const activeTierIdx = getActiveTierIndex(bulkTiers, quantity);
  const activeUnitPrice =
    bulkTiers.length > 0 ? bulkTiers[activeTierIdx].unitPrice : basePrice;
  const lineTotal = activeUnitPrice * quantity;

  const specifications = useMemo(() => {
    if (mergedProduct?.specifications) return mergedProduct.specifications;
    return DEMO_SPECS;
  }, [mergedProduct]);

  // ---- Handlers ----
  const handleAddToOrder = useCallback(() => {
    if (!mergedProduct || addedToOrder || !stockInfo.available) return;
    cart?.addItem(mergedProduct, quantity);
    setAddedToOrder(true);
  }, [mergedProduct, quantity, cart, addedToOrder, stockInfo.available]);

  useEffect(() => {
    if (!addedToOrder) return;
    const timer = setTimeout(() => setAddedToOrder(false), 2500);
    return () => clearTimeout(timer);
  }, [addedToOrder]);

  // ---- Not found state ----
  if (!mergedProduct && products.length === 0) {
    return (
      <div
        className="px-6 sm:px-10 lg:px-16 py-8"
        style={{ fontFamily: 'var(--ws-font)' }}
      >
        <EmptyState
          icon={Package}
          title="Product Not Found"
          description="The product you are looking for is not available or may have been removed from the catalog."
          action={
            <PrimaryButton
              icon={ArrowLeft}
              onClick={() => nav?.goToCatalog?.()}
            >
              Back to Catalog
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  const p = mergedProduct || products[0] || {};
  const productName = p.name || 'Product';
  const productSku = p.sku || '';
  const productCategory = p.category || 'Products';
  const productDescription =
    p.description ||
    'High-quality product designed for professional B2B use. Built with premium materials and backed by our standard warranty. Contact your account manager for custom configurations.';
  const productUnit = p.unit || 'units';
  const packSize = p.pack_size;

  // ---- Breadcrumb items ----
  const breadcrumbItems = [
    { label: 'Home', onClick: () => nav?.goToHome?.() },
    { label: 'Catalog', onClick: () => nav?.goToCatalog?.() },
    { label: productName },
  ];

  return (
    <div
      className="px-6 sm:px-10 lg:px-16 py-8"
      style={{ fontFamily: 'var(--ws-font)', color: 'var(--ws-text)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Main layout: image + info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image gallery -- slides in from left */}
          <motion.div
            variants={motionVariants.slideLeft}
            initial="hidden"
            animate="visible"
          >
            <ImageGallery
              images={images}
              activeIndex={activeImageIndex}
              onSelect={setActiveImageIndex}
            />
          </motion.div>

          {/* Product info -- slides in from right */}
          <motion.div
            variants={motionVariants.slideRight}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5"
          >
            {/* Category + stock row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status="primary" label={productCategory} />
              {showStock && (
                <StatusBadge
                  status={stockInfo.status}
                  label={stockInfo.label}
                  pulse={stockInfo.status === 'warning'}
                />
              )}
            </div>

            {/* Product name */}
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight"
              style={{
                fontFamily: 'var(--ws-heading-font, var(--ws-font))',
                ...gradientTextStyle(),
              }}
            >
              {productName}
            </h1>

            {/* SKU */}
            {showSKU && productSku && (
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--ws-muted)' }}
              >
                SKU: {productSku}
              </p>
            )}

            {/* Price */}
            {basePrice > 0 && (
              <div className="flex items-baseline gap-3">
                <span
                  className="text-3xl sm:text-4xl font-bold"
                  style={gradientTextStyle()}
                >
                  {formatCurrency(activeUnitPrice)}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  per {productUnit === 'units' ? 'unit' : productUnit}
                </span>
                {activeUnitPrice < basePrice && (
                  <span
                    className="text-sm line-through"
                    style={{ color: 'var(--ws-muted)', opacity: 0.6 }}
                  >
                    {formatCurrency(basePrice)}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--ws-muted)' }}
            >
              {productDescription}
            </p>

            {/* Pack size info */}
            {packSize && (
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--ws-muted)' }}
              >
                <BoxesIcon
                  className="w-4 h-4"
                  style={{ color: 'var(--ws-primary)' }}
                />
                <span>Sold in cases of {packSize}</span>
              </div>
            )}

            {/* MOQ notice */}
            {moq > 1 && (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background:
                    'color-mix(in srgb, var(--ws-primary) 6%, transparent)',
                  border:
                    '1px solid color-mix(in srgb, var(--ws-primary) 15%, transparent)',
                  color: 'var(--ws-primary)',
                }}
              >
                <Info className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  Minimum Order: {moq} {productUnit}
                </span>
              </div>
            )}

            {/* Quantity selector + line total */}
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Order Quantity
              </label>
              <div className="flex items-center gap-4 flex-wrap">
                <QuantityInput
                  value={quantity}
                  onChange={setQuantity}
                  min={moq}
                  max={9999}
                  size="lg"
                />
                {basePrice > 0 && (
                  <div className="flex flex-col">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--ws-muted)' }}
                    >
                      Line total
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: 'var(--ws-text)' }}
                    >
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Add to Order button */}
            <PrimaryButton
              size="lg"
              className="w-full"
              icon={addedToOrder ? Check : ClipboardPlus}
              onClick={handleAddToOrder}
              disabled={!stockInfo.available}
            >
              {addedToOrder
                ? 'Added to Order!'
                : !stockInfo.available
                  ? 'Out of Stock'
                  : 'Add to Order'}
            </PrimaryButton>

            {/* Request Quote button */}
            {showInquiryButton && (
              <SecondaryButton
                size="lg"
                className="w-full"
                icon={MessageSquareQuote}
              >
                Request Custom Quote
              </SecondaryButton>
            )}

            {/* Delivery estimate bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                ...glassCardStyle,
                boxShadow: 'none',
              }}
            >
              <Truck
                className="w-5 h-5 flex-shrink-0"
                style={{ color: 'var(--ws-primary)' }}
              />
              <div className="flex flex-col">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--ws-text)' }}
                >
                  Est. delivery: 3-5 business days
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Free shipping on orders over EUR 500
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Specifications */}
        {showSpecifications && (
          <motion.div
            variants={motionVariants.fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-12"
          >
            <SpecificationsTable specs={specifications} />
          </motion.div>
        )}

        {/* Bulk pricing */}
        {showBulkPricing && basePrice > 0 && bulkTiers.length > 0 && (
          <motion.div
            variants={motionVariants.fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-8"
          >
            <BulkPricingTable
              tiers={bulkTiers}
              basePrice={basePrice}
              quantity={quantity}
              unit={productUnit}
            />
          </motion.div>
        )}

        {/* Product documents */}
        <motion.div
          variants={motionVariants.fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-8"
        >
          <SectionHeader
            title="Product Documents"
            subtitle="Datasheets, certificates, and compliance documentation"
          />
          <ProductDocuments />
        </motion.div>

        {/* Related products */}
        {showRelatedProducts && products.length > 1 && (
          <div className="mt-16">
            <RelatedProducts
              products={products}
              currentProduct={p}
              nav={nav}
            />
          </div>
        )}
      </div>
    </div>
  );
}
