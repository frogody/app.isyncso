// ---------------------------------------------------------------------------
// usePreviewCart.js -- Order state for the B2B wholesale store preview iframe.
// Pure useState-based (no localStorage, no auth). Provides add/remove/update
// operations and computed totals for the preview experience.
//
// B2B wholesale additions: MOQ per item, PO number, delivery date, order notes,
// payment terms display, and volume discount calculation.
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from 'react';

// Default MOQ if product doesn't specify one
const DEFAULT_MOQ = 1;

// Volume discount tiers (applied to order total)
const VOLUME_TIERS = [
  { min: 5000, discount: 0.10, label: '10% Volume Discount (EUR 5,000+)' },
  { min: 2500, discount: 0.05, label: '5% Volume Discount (EUR 2,500+)' },
  { min: 1000, discount: 0.03, label: '3% Volume Discount (EUR 1,000+)' },
];

export default function usePreviewCart() {
  const [items, setItems] = useState([]);
  const [poNumber, setPoNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const addItem = useCallback((product, qty = 1) => {
    if (!product?.id) return;
    const moq = product.moq || product.minimum_order_quantity || DEFAULT_MOQ;
    const effectiveQty = Math.max(qty, moq);

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + effectiveQty }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name || 'Product',
          sku: product.sku || '',
          price: product.b2b_price || product.wholesale_price || product.price || 0,
          quantity: effectiveQty,
          moq,
          image: product.featured_image || product.image || null,
          unit: product.unit || 'pcs',
          packSize: product.pack_size || null,
          bulkPricing: product.bulk_pricing || product.pricing_tiers || null,
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

  // Subtotal before discounts
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
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
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  // MOQ violations
  const moqViolations = useMemo(
    () => items.filter((i) => i.quantity < (i.moq || DEFAULT_MOQ)),
    [items],
  );

  const hasValidOrder = useMemo(
    () => items.length > 0 && moqViolations.length === 0,
    [items, moqViolations],
  );

  return {
    items,
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
