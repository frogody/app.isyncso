// ---------------------------------------------------------------------------
// usePreviewCart.js -- Order state for the B2B wholesale store preview iframe.
// Pure useState-based (no localStorage, no auth). Provides add/remove/update
// operations and computed totals for the preview experience.
//
// B2B wholesale additions: MOQ per item, PO number, delivery date, order notes,
// payment terms display, and volume/bulk pricing calculation.
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo, useEffect } from 'react';

// Default MOQ if product doesn't specify one
const DEFAULT_MOQ = 1;

// Volume discount tiers (applied to order total)
const VOLUME_TIERS = [
  { min: 5000, discount: 0.10, label: '10% Volume Discount (EUR 5,000+)' },
  { min: 2500, discount: 0.05, label: '5% Volume Discount (EUR 2,500+)' },
  { min: 1000, discount: 0.03, label: '3% Volume Discount (EUR 1,000+)' },
];

function loadFromStorage(key) {
  if (!key) return null;
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

/**
 * Resolve the unit price for a given quantity based on volume tiers.
 * Tiers are sorted ascending by min_quantity. The highest tier whose
 * min_quantity <= qty wins.
 */
function resolveUnitPrice(basePrice, volumeTiers, qty) {
  if (!Array.isArray(volumeTiers) || volumeTiers.length === 0) return basePrice;

  const sorted = [...volumeTiers].sort(
    (a, b) => (a.min_quantity || a.min_qty || 0) - (b.min_quantity || b.min_qty || 0),
  );

  let unitPrice = basePrice;
  for (const tier of sorted) {
    const minQty = tier.min_quantity || tier.min_qty || 0;
    const tierPrice = tier.price || tier.unit_price;
    if (qty >= minQty && tierPrice != null) {
      unitPrice = tierPrice;
    }
  }
  return unitPrice;
}

/**
 * @param {Object} [options]
 * @param {string} [options.storageKey] - When provided, persist cart to localStorage under this key.
 */
export default function usePreviewCart({ storageKey } = {}) {
  const stored = loadFromStorage(storageKey);
  const [items, setItems] = useState(stored?.items || []);
  const [poNumber, setPoNumber] = useState(stored?.poNumber || '');
  const [deliveryDate, setDeliveryDate] = useState(stored?.deliveryDate || '');
  const [orderNotes, setOrderNotes] = useState(stored?.orderNotes || '');

  // Persist to localStorage when storageKey is provided
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ items, poNumber, deliveryDate, orderNotes }));
  }, [storageKey, items, poNumber, deliveryDate, orderNotes]);

  const addItem = useCallback((product, qty = 1) => {
    if (!product?.id) return;
    const moq = product.moq || product.minimum_order_quantity || DEFAULT_MOQ;
    const effectiveQty = Math.max(qty, moq);
    const basePrice = product.b2b_price || product.wholesale_price || product.price || 0;
    // Resolve volume tiers from all possible locations
    const volumeTiers =
      product.pricing?.volume_tiers ||
      product.bulk_pricing ||
      product.pricing_tiers ||
      null;

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + effectiveQty;
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: newQty }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name || 'Product',
          sku: product.sku || '',
          basePrice,
          quantity: effectiveQty,
          moq,
          image: product.featured_image || product.image || null,
          unit: product.unit || 'pcs',
          packSize: product.pack_size || null,
          volumeTiers: volumeTiers || null,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        // Enforce MOQ
        const enforced = Math.max(quantity, i.moq || DEFAULT_MOQ);
        return { ...i, quantity: enforced };
      }),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPoNumber('');
    setDeliveryDate('');
    setOrderNotes('');
  }, []);

  // Items with resolved tier-based unit prices
  const pricedItems = useMemo(
    () =>
      items.map((i) => {
        const unitPrice = resolveUnitPrice(
          i.basePrice ?? i.price ?? 0,
          i.volumeTiers || i.bulkPricing,
          i.quantity,
        );
        return {
          ...i,
          price: unitPrice, // effective unit price for current quantity
          lineTotal: unitPrice * i.quantity,
        };
      }),
    [items],
  );

  // Subtotal before discounts
  const subtotal = useMemo(
    () => pricedItems.reduce((sum, i) => sum + i.lineTotal, 0),
    [pricedItems],
  );

  // Volume discount
  const volumeDiscount = useMemo(() => {
    const tier = VOLUME_TIERS.find((t) => subtotal >= t.min);
    if (!tier) return { amount: 0, percentage: 0, label: null };
    return {
      amount: subtotal * tier.discount,
      percentage: tier.discount * 100,
      label: tier.label,
    };
  }, [subtotal]);

  // VAT (21%)
  const vat = useMemo(
    () => (subtotal - volumeDiscount.amount) * 0.21,
    [subtotal, volumeDiscount.amount],
  );

  // Order total
  const total = useMemo(
    () => subtotal - volumeDiscount.amount + vat,
    [subtotal, volumeDiscount.amount, vat],
  );

  const itemCount = useMemo(
    () => pricedItems.reduce((sum, i) => sum + i.quantity, 0),
    [pricedItems],
  );

  // MOQ violations
  const moqViolations = useMemo(
    () => pricedItems.filter((i) => i.quantity < (i.moq || DEFAULT_MOQ)),
    [pricedItems],
  );

  const hasValidOrder = useMemo(
    () => pricedItems.length > 0 && moqViolations.length === 0,
    [pricedItems, moqViolations],
  );

  return {
    items: pricedItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    volumeDiscount,
    vat,
    total,
    itemCount,
    // B2B fields
    poNumber,
    setPoNumber,
    deliveryDate,
    setDeliveryDate,
    orderNotes,
    setOrderNotes,
    moqViolations,
    hasValidOrder,
  };
}
