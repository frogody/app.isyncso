import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  MessageSquare,
  Package,
  Minus,
  Plus,
  Check,
  X,
  Loader2,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import StockIndicator from './StockIndicator';
import BulkPricingTable from './BulkPricingTable';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value, currency = 'EUR') {
  if (value == null) return '--';
  try {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

/**
 * Resolve the effective unit price for the given quantity from bulk tiers.
 * Falls back to the product base price when no tier matches.
 */
function resolveUnitPrice(tiers, quantity, basePrice) {
  if (!tiers || tiers.length === 0) return basePrice || 0;
  for (const tier of tiers) {
    const min = tier.min_quantity ?? 0;
    const max = tier.max_quantity ?? Infinity;
    if (quantity >= min && quantity <= max) return tier.unit_price;
  }
  return basePrice || (tiers[0]?.unit_price ?? 0);
}

/**
 * Collect all displayable image URLs from the product.
 */
function collectImages(product) {
  const images = [];
  if (product?.featured_image) images.push(product.featured_image);
  if (Array.isArray(product?.gallery)) {
    product.gallery.forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
  }
  // Fallback to physical_products images
  const physical = product?.physical_products;
  if (physical) {
    const pp = Array.isArray(physical) ? physical[0] : physical;
    if (pp?.image_url && !images.includes(pp.image_url)) images.push(pp.image_url);
    if (Array.isArray(pp?.images)) {
      pp.images.forEach((url) => {
        if (url && !images.includes(url)) images.push(url);
      });
    }
  }
  return images;
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Strips <script> tags, event handler attributes (on*), and javascript: URIs.
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    // Remove <script> tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handler attributes (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: URIs in href/src/action attributes
    .replace(/(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""')
    // Remove data: URIs that could execute scripts (keep data:image)
    .replace(/(href|src|action)\s*=\s*(?:"data:(?!image)[^"]*"|'data:(?!image)[^']*')/gi, '$1=""');
}

/**
 * Parse specifications JSONB into a flat array of { key, value } pairs.
 */
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Inquiry Modal
// ---------------------------------------------------------------------------

function InquiryModal({ product, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate API call -- replace with real inquiry endpoint when available
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
          fontFamily: 'var(--ws-font)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:opacity-70"
          style={{ color: 'var(--ws-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}
            >
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <h3
              className="text-xl font-bold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Inquiry Sent
            </h3>
            <p className="text-sm text-center" style={{ color: 'var(--ws-muted)' }}>
              We have received your inquiry for{' '}
              <strong style={{ color: 'var(--ws-text)' }}>{product?.name}</strong>.
              {' '}Our team will get back to you shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--ws-primary)',
                color: 'var(--ws-bg)',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3
              className="text-xl font-bold mb-1"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Request a Quote
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--ws-muted)' }}>
              Get custom pricing for{' '}
              <strong style={{ color: 'var(--ws-text)' }}>{product?.name}</strong>
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  placeholder="Tell us about your requirements, quantities, and timeline..."
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--ws-primary)',
                  color: 'var(--ws-bg)',
                }}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Submit Inquiry
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox Overlay
// ---------------------------------------------------------------------------

function Lightbox({ images, activeIndex, onClose, onNavigate }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onNavigate((activeIndex - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight') {
        onNavigate((activeIndex + 1) % images.length);
      }
    },
    [activeIndex, images.length, onClose, onNavigate],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Dark backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Counter */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-white/70 text-sm font-medium">
          {activeIndex + 1} / {images.length}
        </div>

        {/* Previous button */}
        {images.length > 1 && (
          <button
            onClick={() =>
              onNavigate((activeIndex - 1 + images.length) % images.length)
            }
            className="absolute left-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={() =>
              onNavigate((activeIndex + 1) % images.length)
            }
            className="absolute right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Main image */}
        <motion.img
          key={activeIndex}
          src={images[activeIndex]}
          alt={`Product image ${activeIndex + 1}`}
          className="relative z-[1] max-w-[90vw] max-h-[85vh] object-contain rounded-lg select-none"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2 }}
          draggable={false}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Image Gallery (upgraded with lightbox trigger)
// ---------------------------------------------------------------------------

function ImageGallery({ images, activeIndex, onSelect, onOpenLightbox }) {
  if (images.length === 0) {
    return (
      <div
        className="aspect-square rounded-xl flex items-center justify-center"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <Package className="w-20 h-20" style={{ color: 'var(--ws-muted)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="aspect-square rounded-xl overflow-hidden flex items-center justify-center relative group cursor-pointer"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
        onClick={onOpenLightbox}
      >
        <img
          src={images[activeIndex] || images[0]}
          alt="Product"
          className="w-full h-full object-contain p-4"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement.innerHTML =
              '<div class="flex items-center justify-center w-full h-full"><svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ws-muted)"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
          }}
        />
        {/* Zoom overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-xl">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 rounded-full bg-black/50">
            <ZoomIn className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 8).map((url, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden transition-all duration-200"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: idx === activeIndex
                  ? '2px solid var(--ws-primary)'
                  : '1px solid var(--ws-border)',
                opacity: idx === activeIndex ? 1 : 0.6,
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantity Selector
// ---------------------------------------------------------------------------

function QuantitySelector({ value, onChange, min = 1, max = 9999 }) {
  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };
  const handleIncrement = () => {
    onChange(Math.min(max, value + 1));
  };
  const handleInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10);
    if (isNaN(num)) {
      onChange(min);
    } else {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--ws-border)' }}
    >
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:opacity-80 disabled:opacity-30"
        style={{
          backgroundColor: 'var(--ws-surface)',
          color: 'var(--ws-text)',
          borderRight: '1px solid var(--ws-border)',
        }}
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleInput}
        className="w-16 h-10 text-center text-sm font-semibold outline-none bg-transparent"
        style={{
          color: 'var(--ws-text)',
          fontFamily: 'var(--ws-font)',
        }}
        aria-label="Quantity"
      />

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:opacity-80 disabled:opacity-30"
        style={{
          backgroundColor: 'var(--ws-surface)',
          color: 'var(--ws-text)',
          borderLeft: '1px solid var(--ws-border)',
        }}
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Specifications Table
// ---------------------------------------------------------------------------

function SpecificationsTable({ specs }) {
  const rows = useMemo(() => parseSpecifications(specs), [specs]);
  const [expanded, setExpanded] = useState(true);

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-90"
        style={{
          borderBottom: expanded ? '1px solid var(--ws-border)' : 'none',
        }}
      >
        <h3
          className="text-base font-bold"
          style={{
            color: 'var(--ws-text)',
            fontFamily: 'var(--ws-heading-font)',
          }}
        >
          Specifications
        </h3>
        <ChevronDown
          className="w-5 h-5 transition-transform duration-200"
          style={{
            color: 'var(--ws-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex justify-between sm:contents px-5 py-3 text-sm"
                  style={{
                    backgroundColor: i % 2 === 0
                      ? 'transparent'
                      : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span
                    className="px-5 py-3 font-medium"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    {row.key}
                  </span>
                  <span
                    className="px-5 py-3"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enhanced Pricing Tiers Table
// ---------------------------------------------------------------------------

function EnhancedPricingTiersTable({ tiers, currentQuantity, currency, basePrice }) {
  if (!tiers || tiers.length <= 1) return null;

  const activeTierIndex = useMemo(() => {
    for (let i = 0; i < tiers.length; i++) {
      const min = tiers[i].min_quantity ?? 0;
      const max = tiers[i].max_quantity ?? Infinity;
      if (currentQuantity >= min && currentQuantity <= max) return i;
    }
    return -1;
  }, [tiers, currentQuantity]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <h3
        className="px-5 py-4 text-base font-bold"
        style={{
          color: 'var(--ws-text)',
          fontFamily: 'var(--ws-heading-font)',
          borderBottom: '1px solid var(--ws-border)',
        }}
      >
        Volume Pricing
      </h3>

      {/* Desktop */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ws-border)' }}>
              <th
                className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Quantity Range
              </th>
              <th
                className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Price Per Unit
              </th>
              <th
                className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Savings
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, idx) => {
              const isActive = idx === activeTierIndex;
              const savings = basePrice > 0 && tier.unit_price < basePrice
                ? ((1 - tier.unit_price / basePrice) * 100).toFixed(1)
                : null;
              const rangeLabel = (tier.max_quantity == null || tier.max_quantity === Infinity)
                ? `${tier.min_quantity ?? 0}+`
                : `${tier.min_quantity ?? 0} - ${tier.max_quantity}`;

              return (
                <tr
                  key={idx}
                  className="transition-colors duration-200"
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.10)'
                      : 'transparent',
                    borderBottom: idx < tiers.length - 1 ? '1px solid var(--ws-border)' : 'none',
                  }}
                >
                  <td className="px-5 py-3.5">
                    <span
                      className="font-medium"
                      style={{ color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)' }}
                    >
                      {rangeLabel} units
                    </span>
                    {isActive && (
                      <span
                        className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--ws-primary)',
                          color: 'var(--ws-bg)',
                        }}
                      >
                        Current
                      </span>
                    )}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right font-semibold"
                    style={{ color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)' }}
                  >
                    {formatCurrency(tier.unit_price, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {savings ? (
                      <span className="text-sm font-semibold text-green-400">
                        -{savings}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ws-muted)' }}>&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="sm:hidden">
        {tiers.map((tier, idx) => {
          const isActive = idx === activeTierIndex;
          const savings = basePrice > 0 && tier.unit_price < basePrice
            ? ((1 - tier.unit_price / basePrice) * 100).toFixed(1)
            : null;
          const rangeLabel = (tier.max_quantity == null || tier.max_quantity === Infinity)
            ? `${tier.min_quantity ?? 0}+`
            : `${tier.min_quantity ?? 0} - ${tier.max_quantity}`;

          return (
            <div
              key={idx}
              className="px-4 py-3.5 flex items-center justify-between gap-3 transition-colors duration-200"
              style={{
                backgroundColor: isActive
                  ? 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.10)'
                  : 'transparent',
                borderBottom: idx < tiers.length - 1 ? '1px solid var(--ws-border)' : 'none',
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-sm font-medium"
                  style={{ color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)' }}
                >
                  {rangeLabel} units
                </span>
                {isActive && (
                  <span
                    className="self-start text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
                    style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
                  >
                    Current
                  </span>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-0.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)' }}
                >
                  {formatCurrency(tier.unit_price, currency)}
                </span>
                {savings ? (
                  <span className="text-xs font-semibold text-green-400">Save {savings}%</span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>Base price</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enhanced Stock + Availability Detail
// ---------------------------------------------------------------------------

function StockAvailabilityDetail({ product, inventory }) {
  const available = useMemo(() => {
    if (!inventory) return 0;
    return Math.max(0, (inventory.quantity_on_hand ?? inventory.quantity ?? 0) - (inventory.quantity_reserved ?? 0));
  }, [inventory]);

  const restockDate = product?.restock_date || inventory?.expected_delivery_date || null;
  const minOrderQty = product?.min_order_qty || product?.minimum_order_quantity || null;

  const getStockBadge = () => {
    if (available > 10) {
      return {
        label: 'In Stock',
        dotColor: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.10)',
        borderColor: 'rgba(34, 197, 94, 0.25)',
        textColor: '#4ade80',
      };
    }
    if (available > 0) {
      return {
        label: `Only ${available} left in stock`,
        dotColor: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.10)',
        borderColor: 'rgba(245, 158, 11, 0.25)',
        textColor: '#fbbf24',
      };
    }
    return {
      label: 'Out of Stock',
      dotColor: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.10)',
      borderColor: 'rgba(239, 68, 68, 0.25)',
      textColor: '#f87171',
    };
  };

  const badge = getStockBadge();

  return (
    <div className="flex flex-col gap-2">
      {/* Main stock badge */}
      <span
        className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap self-start"
        style={{
          backgroundColor: badge.bgColor,
          color: badge.textColor,
          border: `1px solid ${badge.borderColor}`,
          padding: '4px 12px',
        }}
      >
        <span
          className="flex-shrink-0 rounded-full"
          style={{ width: '7px', height: '7px', backgroundColor: badge.dotColor }}
        />
        {badge.label}
      </span>

      {/* Restock date */}
      {available === 0 && restockDate && (
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--ws-muted)' }}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Expected back in stock: {formatDate(restockDate)}</span>
        </div>
      )}

      {/* Minimum order quantity */}
      {minOrderQty && minOrderQty > 1 && (
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--ws-muted)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Minimum order: {minOrderQty} units</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Related Products Row
// ---------------------------------------------------------------------------

function RelatedProducts({ product, currentProductId, orgId }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const categoryId = product?.category_id || product?.category;
    if (!categoryId) return;

    let cancelled = false;
    const fetchRelated = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, unit_price, featured_image, sku, product_sales_channels!inner(channel)')
          .eq('product_sales_channels.channel', 'b2b')
          .eq('category_id', categoryId)
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(4);

        if (!cancelled && !error && data) {
          setRelated(data);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRelated();
    return () => { cancelled = true; };
  }, [product?.category_id, product?.category, currentProductId]);

  if (loading || related.length === 0) return null;

  return (
    <div className="mt-12">
      <h3
        className="text-lg font-bold mb-6"
        style={{
          color: 'var(--ws-text)',
          fontFamily: 'var(--ws-heading-font)',
        }}
      >
        You May Also Like
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {related.map((item) => {
          const itemPrice = item.price ?? item.unit_price ?? 0;
          const detailUrl = orgId
            ? `/portal/${orgId}/shop/product/${item.id}`
            : `/shop/product/${item.id}`;

          return (
            <Link
              key={item.id}
              to={detailUrl}
              className="group rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: '1px solid var(--ws-border)',
              }}
            >
              <div
                className="aspect-square flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: 'var(--ws-bg)' }}
              >
                {item.featured_image ? (
                  <img
                    src={item.featured_image}
                    alt={item.name}
                    className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <Package className="w-12 h-12" style={{ color: 'var(--ws-muted)' }} />
                )}
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <p
                  className="text-sm font-medium line-clamp-2 leading-snug"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {item.name}
                </p>
                <p
                  className="text-sm font-bold"
                  style={{ color: 'var(--ws-primary)' }}
                >
                  {formatCurrency(itemPrice)}
                </p>
                <span
                  className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-1.5 transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.10)',
                    color: 'var(--ws-primary)',
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Order History for This Product
// ---------------------------------------------------------------------------

function OrderHistory({ productId, client, addToCart, images }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    if (!client?.id || !productId) return;

    let cancelled = false;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sales_order_items')
          .select('quantity, unit_price, sales_order:sales_orders(id, order_number, status, created_at)')
          .eq('product_id', productId)
          .eq('sales_order.client_id', client.id)
          .order('created_at', { ascending: false, foreignTable: 'sales_orders' })
          .limit(5);

        if (!cancelled && !error && data) {
          // Filter out entries where the join failed (sales_order is null)
          const validOrders = data.filter((item) => item.sales_order != null);
          setOrders(validOrders);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrders();
    return () => { cancelled = true; };
  }, [client?.id, productId]);

  if (!client?.id || loading || orders.length === 0) return null;

  const handleReorder = (order) => {
    setReorderingId(order.sales_order?.id);
    addToCart(
      {
        id: productId,
        price: order.unit_price,
        featured_image: images?.[0] || null,
      },
      order.quantity,
    );
    setTimeout(() => setReorderingId(null), 1500);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { bg: 'rgba(34, 197, 94, 0.10)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.25)' },
      delivered: { bg: 'rgba(34, 197, 94, 0.10)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.25)' },
      processing: { bg: 'rgba(59, 130, 246, 0.10)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)' },
      pending: { bg: 'rgba(245, 158, 11, 0.10)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
      cancelled: { bg: 'rgba(239, 68, 68, 0.10)', text: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
    };
    const config = statusMap[status?.toLowerCase()] || statusMap.pending;
    return config;
  };

  return (
    <div
      className="mt-12 rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <h3
        className="px-5 py-4 text-base font-bold"
        style={{
          color: 'var(--ws-text)',
          fontFamily: 'var(--ws-heading-font)',
          borderBottom: '1px solid var(--ws-border)',
        }}
      >
        Your Previous Orders
      </h3>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ws-border)' }}>
              {['Order Date', 'Order #', 'Qty', 'Price Paid', 'Status', ''].map((h, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 2 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--ws-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((item, idx) => {
              const so = item.sales_order;
              const statusCfg = getStatusBadge(so?.status);
              const isReordering = reorderingId === so?.id;

              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: idx < orders.length - 1 ? '1px solid var(--ws-border)' : 'none',
                  }}
                >
                  <td className="px-5 py-3" style={{ color: 'var(--ws-text)' }}>
                    {formatDate(so?.created_at)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--ws-muted)' }}>
                    {so?.order_number || '--'}
                  </td>
                  <td className="px-5 py-3 text-right font-medium" style={{ color: 'var(--ws-text)' }}>
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold" style={{ color: 'var(--ws-text)' }}>
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                      }}
                    >
                      {so?.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleReorder(item)}
                      disabled={isReordering}
                      className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-60"
                      style={{ color: 'var(--ws-primary)' }}
                    >
                      {isReordering ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Added
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reorder
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked */}
      <div className="sm:hidden">
        {orders.map((item, idx) => {
          const so = item.sales_order;
          const statusCfg = getStatusBadge(so?.status);
          const isReordering = reorderingId === so?.id;

          return (
            <div
              key={idx}
              className="px-4 py-3.5 flex flex-col gap-2"
              style={{
                borderBottom: idx < orders.length - 1 ? '1px solid var(--ws-border)' : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                  {formatDate(so?.created_at)}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: statusCfg.bg,
                    color: statusCfg.text,
                    border: `1px solid ${statusCfg.border}`,
                  }}
                >
                  {so?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ws-muted)' }}>
                <span>{so?.order_number}</span>
                <span>Qty: {item.quantity} @ {formatCurrency(item.unit_price)}</span>
              </div>
              <button
                onClick={() => handleReorder(item)}
                disabled={isReordering}
                className="self-start inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-60 mt-1"
                style={{ color: 'var(--ws-primary)' }}
              >
                {isReordering ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Added to cart
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reorder
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ fontFamily: 'var(--ws-font)' }}
    >
      {/* Back link placeholder */}
      <div
        className="w-36 h-5 rounded mb-8 animate-pulse"
        style={{ backgroundColor: 'var(--ws-surface)' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image placeholder */}
        <div
          className="aspect-square rounded-xl animate-pulse"
          style={{ backgroundColor: 'var(--ws-surface)' }}
        />

        {/* Info placeholders */}
        <div className="flex flex-col gap-4">
          <div
            className="h-8 rounded w-3/4 animate-pulse"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-4 rounded w-1/2 animate-pulse"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-16 rounded-xl w-full animate-pulse mt-4"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-10 rounded w-40 animate-pulse mt-4"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-12 rounded-lg w-full animate-pulse mt-4"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not Found
// ---------------------------------------------------------------------------

function NotFound({ navigate, orgId }) {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center gap-4"
      style={{ fontFamily: 'var(--ws-font)' }}
    >
      <Package className="w-16 h-16" style={{ color: 'var(--ws-muted)' }} />
      <h2
        className="text-2xl font-bold"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Product Not Found
      </h2>
      <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
        The product you are looking for does not exist or has been removed.
      </p>
      <button
        onClick={() => navigate(orgId ? `/portal/${orgId}/shop/catalog` : -1)}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
        style={{
          backgroundColor: 'var(--ws-primary)',
          color: 'var(--ws-bg)',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductDetailPage
// ---------------------------------------------------------------------------

export default function ProductDetailPage() {
  const { productId, org } = useParams();
  const navigate = useNavigate();
  const { addToCart, orgId: ctxOrgId, client, isFavorite, toggleFavorite } = useWholesale();
  const orgId = org || ctxOrgId;

  // State
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [clientPrice, setClientPrice] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Fetch product
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setError('No product ID');
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*, physical_products(*), inventory(*), product_sales_channels!inner(channel)')
          .eq('product_sales_channels.channel', 'b2b')
          .eq('id', productId)
          .single();

        if (cancelled) return;

        if (fetchError) {
          console.error('[ProductDetailPage] Fetch error:', fetchError);
          setError(fetchError.message);
          setProduct(null);
        } else {
          setProduct(data);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[ProductDetailPage] Unexpected error:', err);
        setError(err.message || 'Failed to load product');
        setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => { cancelled = true; };
  }, [productId]);

  // Fetch client-specific pricing if client is authenticated
  useEffect(() => {
    if (!client?.id || !productId) return;
    let cancelled = false;

    const fetchClientPrice = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_b2b_client_price', {
          p_client_id: client.id,
          p_product_id: productId,
          p_quantity: quantity,
        });
        if (cancelled || rpcError) return;
        if (data && data.length > 0 && data[0].source !== 'base_price') {
          setClientPrice(data[0]);
        }
      } catch {
        // Silently fall back to base price
      }
    };

    fetchClientPrice();
    return () => { cancelled = true; };
  }, [client?.id, productId, quantity]);

  // Derived data
  const images = useMemo(() => collectImages(product), [product]);

  const inventory = useMemo(() => {
    if (!product?.inventory) return null;
    return Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
  }, [product]);

  const physicalProduct = useMemo(() => {
    if (!product?.physical_products) return null;
    return Array.isArray(product.physical_products)
      ? product.physical_products[0]
      : product.physical_products;
  }, [product]);

  const bulkTiers = useMemo(() => {
    const tiers = product?.bulk_pricing || product?.pricing_tiers || physicalProduct?.bulk_pricing;
    if (!Array.isArray(tiers)) return [];
    return [...tiers].sort((a, b) => (a.min_quantity ?? 0) - (b.min_quantity ?? 0));
  }, [product, physicalProduct]);

  const basePrice = product?.price ?? product?.unit_price ?? physicalProduct?.price ?? 0;
  const effectiveUnitPrice = clientPrice?.unit_price
    ? Number(clientPrice.unit_price)
    : resolveUnitPrice(bulkTiers, quantity, basePrice);
  const lineTotal = effectiveUnitPrice * quantity;
  const currency = product?.currency || 'EUR';

  const sku = product?.sku || physicalProduct?.sku || null;
  const ean = product?.ean || product?.barcode || physicalProduct?.ean || physicalProduct?.barcode || null;

  const specifications = physicalProduct?.specifications || product?.specifications || null;

  // Handlers
  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: effectiveUnitPrice,
        sku,
        featured_image: images[0] || null,
      },
      quantity,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, quantity, effectiveUnitPrice, sku, images, addToCart]);

  const handleBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(orgId ? `/portal/${orgId}/shop/catalog` : '/');
    }
  }, [navigate, orgId]);

  const handleOpenLightbox = useCallback(() => {
    if (images.length > 0) setShowLightbox(true);
  }, [images.length]);

  const handleCloseLightbox = useCallback(() => {
    setShowLightbox(false);
  }, []);

  const handleLightboxNavigate = useCallback((idx) => {
    setActiveImageIndex(idx);
  }, []);

  // Render states
  if (loading) return <Skeleton />;
  if (error || !product) return <NotFound navigate={navigate} orgId={orgId} />;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--ws-bg)',
        color: 'var(--ws-text)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors hover:opacity-80"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>

        {/* ---------------------------------------------------------------- */}
        {/* Top section: Image + Product Info                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery with Lightbox */}
          <ImageGallery
            images={images}
            activeIndex={activeImageIndex}
            onSelect={setActiveImageIndex}
            onOpenLightbox={handleOpenLightbox}
          />

          {/* Product Info */}
          <div className="flex flex-col gap-5">
            {/* Name */}
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {product.name}
            </h1>

            {/* SKU / EAN */}
            {(sku || ean) && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                {sku && <span>SKU: {sku}</span>}
                {sku && ean && (
                  <span
                    className="w-px h-3"
                    style={{ backgroundColor: 'var(--ws-border)' }}
                  />
                )}
                {ean && <span>EAN: {ean}</span>}
              </div>
            )}

            {/* Price display */}
            <div
              className="rounded-xl px-5 py-4"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: '1px solid var(--ws-border)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{ color: 'var(--ws-muted)' }}
              >
                Price per unit
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--ws-primary)' }}>
                {formatCurrency(effectiveUnitPrice, currency)}
              </p>
              {bulkTiers.length > 1 && effectiveUnitPrice < basePrice && (
                <p className="text-xs mt-1" style={{ color: 'var(--ws-muted)' }}>
                  Base price:{' '}
                  <span className="line-through">{formatCurrency(basePrice, currency)}</span>
                </p>
              )}
            </div>

            {/* Quantity + Line total */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Quantity
                </label>
                <QuantitySelector value={quantity} onChange={setQuantity} />
              </div>

              <div className="flex flex-col gap-1.5 ml-auto sm:ml-0">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Line total
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--ws-text)' }}>
                  {formatCurrency(lineTotal, currency)}
                </span>
              </div>
            </div>

            {/* Enhanced Stock + Availability */}
            <StockAvailabilityDetail product={product} inventory={inventory} />

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:opacity-90"
                style={{
                  backgroundColor: addedToCart ? '#22c55e' : 'var(--ws-primary)',
                  color: 'var(--ws-bg)',
                }}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={() => setShowInquiry(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--ws-text)',
                  border: '1px solid var(--ws-border)',
                }}
              >
                <MessageSquare className="w-4 h-4" />
                Request Quote
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleFavorite(productId);
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  color: isFavorite(productId)
                    ? '#f43f5e'
                    : 'var(--ws-text)',
                  border: isFavorite(productId)
                    ? '1px solid rgba(244, 63, 94, 0.4)'
                    : '1px solid var(--ws-border)',
                }}
              >
                <Heart
                  className="w-4 h-4"
                  style={{
                    fill: isFavorite(productId) ? '#f43f5e' : 'none',
                    color: isFavorite(productId) ? '#f43f5e' : 'currentColor',
                  }}
                />
                {isFavorite(productId) ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Description                                                      */}
        {/* ---------------------------------------------------------------- */}
        {product.description && (
          <div
            className="mt-12 rounded-xl px-5 py-6 sm:px-8 sm:py-8"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <h3
              className="text-base font-bold mb-4"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              Description
            </h3>
            {product.description.includes('<') ? (
              <div
                className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed"
                style={{ color: 'var(--ws-muted)' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
              />
            ) : (
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--ws-muted)' }}
              >
                {product.description}
              </p>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Specifications (collapsible)                                     */}
        {/* ---------------------------------------------------------------- */}
        {specifications && (
          <div className="mt-8">
            <SpecificationsTable specs={specifications} />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Enhanced Pricing Tiers Table                                     */}
        {/* ---------------------------------------------------------------- */}
        {bulkTiers.length > 1 && (
          <div className="mt-8">
            <EnhancedPricingTiersTable
              tiers={bulkTiers}
              currentQuantity={quantity}
              currency={currency}
              basePrice={basePrice}
            />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Bulk Pricing Table (original, shown for single-tier)             */}
        {/* ---------------------------------------------------------------- */}
        {bulkTiers.length === 1 && (
          <div className="mt-8">
            <h3
              className="text-base font-bold mb-4"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              Bulk Pricing
            </h3>
            <BulkPricingTable
              tiers={bulkTiers}
              currentQuantity={quantity}
              currency={currency}
            />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Client Order History                                             */}
        {/* ---------------------------------------------------------------- */}
        <OrderHistory
          productId={productId}
          client={client}
          addToCart={addToCart}
          images={images}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Related Products                                                 */}
        {/* ---------------------------------------------------------------- */}
        <RelatedProducts
          product={product}
          currentProductId={productId}
          orgId={orgId}
        />
      </div>

      {/* Inquiry Modal */}
      {showInquiry && (
        <InquiryModal product={product} onClose={() => setShowInquiry(false)} />
      )}

      {/* Lightbox Overlay */}
      {showLightbox && images.length > 0 && (
        <Lightbox
          images={images}
          activeIndex={activeImageIndex}
          onClose={handleCloseLightbox}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </div>
  );
}
