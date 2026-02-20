import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';

const WholesaleContext = createContext(null);

const CART_STORAGE_KEY_PREFIX = 'b2b_cart_';

/**
 * Default store configuration used when no config is found or while loading.
 */
function getDefaultConfig() {
  return {
    theme: {
      primaryColor: '#06b6d4',
      backgroundColor: '#09090b',
      textColor: '#fafafa',
      surfaceColor: '#18181b',
      borderColor: '#27272a',
      mutedTextColor: '#a1a1aa',
      font: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
    },
    sections: [],
    navigation: [],
    footer: {},
  };
}

/**
 * Build a CSS custom properties object from a theme config.
 */
function buildThemeVars(theme) {
  if (!theme) return {};

  return {
    '--ws-primary': theme.primaryColor || '#06b6d4',
    '--ws-bg': theme.backgroundColor || '#09090b',
    '--ws-text': theme.textColor || '#fafafa',
    '--ws-surface': theme.surfaceColor || '#18181b',
    '--ws-border': theme.borderColor || '#27272a',
    '--ws-muted': theme.mutedTextColor || '#a1a1aa',
    '--ws-font': theme.font || 'Inter, system-ui, sans-serif',
    '--ws-heading-font': theme.headingFont || 'Inter, system-ui, sans-serif',
  };
}

/**
 * Read persisted cart from localStorage.
 */
function loadCartFromStorage(orgId) {
  if (!orgId) return [];
  try {
    const raw = localStorage.getItem(`${CART_STORAGE_KEY_PREFIX}${orgId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist cart to localStorage.
 */
function saveCartToStorage(orgId, items) {
  if (!orgId) return;
  try {
    localStorage.setItem(`${CART_STORAGE_KEY_PREFIX}${orgId}`, JSON.stringify(items));
  } catch (err) {
    console.error('[WholesaleProvider] Failed to persist cart:', err);
  }
}

/**
 * WholesaleProvider
 *
 * React Context provider for the B2B wholesale storefront.
 * Fetches store configuration from Supabase `portal_settings` and provides
 * theme CSS custom properties, organization context, and cart state.
 */
export function WholesaleProvider({ children }) {
  const { org } = useParams();

  const [config, setConfig] = useState(getDefaultConfig());
  const [storePublished, setStorePublished] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(null);
  const [cartItems, setCartItems] = useState(() => loadCartFromStorage(org));

  // Fetch store config from portal_settings
  useEffect(() => {
    if (!org) {
      setConfigLoading(false);
      setConfigError('No organization specified');
      return;
    }

    let cancelled = false;

    const fetchConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);

      try {
        const { data, error } = await supabase
          .from('portal_settings')
          .select('store_config, store_published, organization_id')
          .eq('organization_id', org)
          .single();

        if (cancelled) return;

        if (error) {
          if (error.code === 'PGRST116') {
            // No row found
            setConfigError('Store not found for this organization');
            setConfig(getDefaultConfig());
          } else {
            console.error('[WholesaleProvider] Config fetch error:', error);
            setConfigError(error.message);
            setConfig(getDefaultConfig());
          }
          setStorePublished(false);
        } else {
          setConfig(data.store_config || getDefaultConfig());
          setStorePublished(!!data.store_published);
          setConfigError(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[WholesaleProvider] Unexpected error:', err);
        setConfigError(err.message || 'Failed to load store configuration');
        setConfig(getDefaultConfig());
        setStorePublished(false);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    };

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [org]);

  // Reload cart from storage when org changes
  useEffect(() => {
    setCartItems(loadCartFromStorage(org));
  }, [org]);

  // Persist cart whenever items change
  useEffect(() => {
    saveCartToStorage(org, cartItems);
  }, [org, cartItems]);

  // Cart operations
  const addToCart = useCallback((product, quantity = 1) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Theme CSS custom properties
  const themeVars = useMemo(() => buildThemeVars(config?.theme), [config?.theme]);

  const value = useMemo(
    () => ({
      // Store config
      config,
      storePublished,
      configLoading,
      configError,

      // Organization
      orgId: org || null,

      // Theme
      themeVars,

      // Cart
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
    }),
    [
      config,
      storePublished,
      configLoading,
      configError,
      org,
      themeVars,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
    ]
  );

  return (
    <WholesaleContext.Provider value={value}>
      <div style={themeVars}>{children}</div>
    </WholesaleContext.Provider>
  );
}

/**
 * Hook to consume the wholesale context.
 * Must be used within a WholesaleProvider.
 */
export function useWholesale() {
  const context = useContext(WholesaleContext);
  if (!context) {
    throw new Error('useWholesale must be used within a WholesaleProvider');
  }
  return context;
}

export { WholesaleContext };
export default WholesaleProvider;
