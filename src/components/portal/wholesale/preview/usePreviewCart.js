// ---------------------------------------------------------------------------
// usePreviewCart.js -- Cart state for the store builder preview iframe.
// Pure useState-based (no localStorage, no auth). Provides add/remove/update
// operations and computed totals for the preview experience.
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from 'react';

export default function usePreviewCart() {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product, qty = 1) => {
    if (!product?.id) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + qty }
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
          quantity: qty,
          image: product.featured_image || product.image || null,
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
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  return { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount };
}
