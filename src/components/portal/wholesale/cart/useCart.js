import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useWholesale } from '../WholesaleProvider';

const CART_STORAGE_KEY_PREFIX = 'b2b_cart_';

/**
 * Load persisted cart items from localStorage for the given org.
 */
function loadFromStorage(orgId) {
  if (!orgId) return [];
  try {
    const raw = localStorage.getItem(`${CART_STORAGE_KEY_PREFIX}${orgId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist cart items to localStorage.
 */
function saveToStorage(orgId, items) {
  if (!orgId) return;
  try {
    localStorage.setItem(`${CART_STORAGE_KEY_PREFIX}${orgId}`, JSON.stringify(items));
  } catch (err) {
    console.error('[useCart] Failed to persist cart:', err);
  }
}

/**
 * useCart
 *
 * Enhanced cart state management hook for the B2B wholesale storefront.
 * Replaces / wraps the simple cart in WholesaleProvider with richer item
 * metadata, stock validation, and pre-order support.
 *
 * Item shape:
 * {
 *   productId: string,
 *   name: string,
 *   sku: string,
 *   price: number,
 *   quantity: number,
 *   image: string | null,
 *   stockStatus: 'in_stock' | 'limited' | 'preorder' | 'out_of_stock',
 *   preorder: boolean,
 *   availableQty: number | null,
 *   expectedDeliveryDate: string | null,
 * }
 */
export default function useCart() {
  const { orgId } = useWholesale();

  const [items, setItems] = useState(() => loadFromStorage(orgId));
  const [loading, setLoading] = useState(false);

  // Track orgId changes to reload from storage
  const prevOrgId = useRef(orgId);
  useEffect(() => {
    if (orgId !== prevOrgId.current) {
      setItems(loadFromStorage(orgId));
      prevOrgId.current = orgId;
    }
  }, [orgId]);

  // Persist whenever items change
  useEffect(() => {
    saveToStorage(orgId, items);
  }, [orgId, items]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Derive stock status from a product's inventory data.
   */
  const deriveStockStatus = useCallback((product) => {
    const available =
      (product.quantityOnHand ?? product.quantity_on_hand ?? null) != null
        ? Math.max(
            0,
            (product.quantityOnHand ?? product.quantity_on_hand ?? 0) -
              (product.quantityReserved ?? product.quantity_reserved ?? 0)
          )
        : null;

    const expectedDeliveryDate =
      product.expectedDeliveryDate ?? product.expected_delivery_date ?? null;

    let stockStatus = 'in_stock';
    if (available === 0 && expectedDeliveryDate) {
      stockStatus = 'preorder';
    } else if (available === 0) {
      stockStatus = 'out_of_stock';
    } else if (available != null && available <= 10) {
      stockStatus = 'limited';
    }

    return { stockStatus, availableQty: available, expectedDeliveryDate };
  }, []);

  // ---------------------------------------------------------------------------
  // Cart operations
  // ---------------------------------------------------------------------------

  /**
   * Add a product to the cart.
   *
   * @param {Object} product  - Product data (must include id or productId, name, sku, price).
   * @param {number} qty      - Quantity to add (default 1).
   * @returns {{ added: boolean, warning: string | null }}
   */
  const addItem = useCallback(
    (product, qty = 1) => {
      const productId = product.productId ?? product.id;
      if (!productId) return { added: false, warning: 'Missing product ID' };

      const { stockStatus, availableQty, expectedDeliveryDate } =
        deriveStockStatus(product);

      // Block adding truly out-of-stock items
      if (stockStatus === 'out_of_stock') {
        return { added: false, warning: 'This product is currently out of stock.' };
      }

      let warning = null;

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.productId === productId);
        const currentQty = existingIndex >= 0 ? prev[existingIndex].quantity : 0;
        let newQty = currentQty + qty;

        // Stock validation -- warn if exceeding available quantity
        if (availableQty != null && newQty > availableQty && stockStatus !== 'preorder') {
          warning = `Only ${availableQty} units available. Quantity capped.`;
          newQty = availableQty;
        }

        if (newQty <= 0) return prev;

        const image =
          product.image ??
          product.featured_image ??
          product.featuredImage ??
          null;

        const itemData = {
          productId,
          name: product.name,
          sku: product.sku ?? '',
          price: Number(product.price ?? product.unit_price ?? 0),
          quantity: newQty,
          image,
          stockStatus,
          preorder: stockStatus === 'preorder',
          availableQty,
          expectedDeliveryDate,
        };

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...itemData };
          return updated;
        }

        return [...prev, itemData];
      });

      return { added: true, warning };
    },
    [deriveStockStatus],
  );

  /**
   * Remove an item from the cart by productId.
   */
  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  /**
   * Update the quantity of an item. Removes if qty <= 0.
   *
   * @returns {{ updated: boolean, warning: string | null }}
   */
  const updateQuantity = useCallback((productId, qty) => {
    let warning = null;

    setItems((prev) => {
      if (qty <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }

      return prev.map((item) => {
        if (item.productId !== productId) return item;

        let newQty = qty;
        if (
          item.availableQty != null &&
          newQty > item.availableQty &&
          !item.preorder
        ) {
          warning = `Only ${item.availableQty} units available.`;
          newQty = item.availableQty;
        }

        return { ...item, quantity: newQty };
      });
    });

    return { updated: true, warning };
  }, []);

  /**
   * Clear all items from the cart.
   */
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  /**
   * Get total price for display -- convenience wrapper.
   */
  const getCartTotal = useCallback(() => total, [total]);

  /**
   * Get total item count -- convenience wrapper.
   */
  const getItemCount = useCallback(() => itemCount, [itemCount]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    loading,
    getCartTotal,
    getItemCount,
  };
}
