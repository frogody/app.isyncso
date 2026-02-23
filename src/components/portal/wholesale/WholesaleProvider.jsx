import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { usePortalClient } from '@/hooks/usePortalClient';

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

const PORTAL_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2b-portal-api`;

async function portalApi(action, data = {}) {
  const res = await fetch(PORTAL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) throw new Error(`Portal API error: ${res.status}`);
  return res.json();
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
  const { client, session, loading: clientLoading, isAuthenticated } = usePortalClient();

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

  // ── Favorites ──────────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!client?.id) return;
    setFavoritesLoading(true);
    try {
      const res = await portalApi('getFavorites', { clientId: client.id });
      if (res.success) setFavorites(res.favorites || []);
    } catch (err) {
      console.error('[WholesaleProvider] fetchFavorites error:', err);
    } finally {
      setFavoritesLoading(false);
    }
  }, [client?.id]);

  const toggleFavorite = useCallback(async (productId) => {
    if (!client?.id) return;
    try {
      const res = await portalApi('toggleFavorite', { clientId: client.id, productId });
      if (res.success) {
        if (res.removed) {
          setFavorites(prev => prev.filter(f => f.product_id !== productId));
        } else {
          // Re-fetch to get full product data
          fetchFavorites();
        }
      }
      return res;
    } catch (err) {
      console.error('[WholesaleProvider] toggleFavorite error:', err);
    }
  }, [client?.id, fetchFavorites]);

  const isFavorite = useCallback((productId) => {
    return favorites.some(f => f.product_id === productId);
  }, [favorites]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!client?.id) return;
    setNotificationsLoading(true);
    try {
      const res = await portalApi('getNotifications', { clientId: client.id, limit: 50 });
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount((res.notifications || []).filter(n => !n.read_at).length);
      }
    } catch (err) {
      console.error('[WholesaleProvider] fetchNotifications error:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [client?.id]);

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!client?.id) return;
    try {
      await portalApi('markNotificationRead', { notificationId, clientId: client.id });
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[WholesaleProvider] markNotificationRead error:', err);
    }
  }, [client?.id]);

  // ── Templates ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!client?.id) return;
    setTemplatesLoading(true);
    try {
      const res = await portalApi('getTemplates', { clientId: client.id });
      if (res.success) setTemplates(res.templates || []);
    } catch (err) {
      console.error('[WholesaleProvider] fetchTemplates error:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [client?.id]);

  const createTemplate = useCallback(async (name, items) => {
    if (!client?.id) return;
    try {
      const res = await portalApi('createTemplate', { clientId: client.id, name, items });
      if (res.success) {
        setTemplates(prev => [res.template, ...prev]);
      }
      return res;
    } catch (err) {
      console.error('[WholesaleProvider] createTemplate error:', err);
    }
  }, [client?.id]);

  const deleteTemplate = useCallback(async (templateId) => {
    if (!client?.id) return;
    try {
      const res = await portalApi('deleteTemplate', { templateId, clientId: client.id });
      if (res.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      }
      return res;
    } catch (err) {
      console.error('[WholesaleProvider] deleteTemplate error:', err);
    }
  }, [client?.id]);

  // ── Dashboard Data ─────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!client?.id) return;
    setDashboardLoading(true);
    try {
      const res = await portalApi('getDashboardData', { clientId: client.id });
      if (res.success) setDashboardData(res.dashboard);
    } catch (err) {
      console.error('[WholesaleProvider] fetchDashboardData error:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [client?.id]);

  // ── Announcements ──────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    if (!org) return;
    setAnnouncementsLoading(true);
    try {
      const res = await portalApi('getAnnouncements', { storeId: org });
      if (res.success) setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error('[WholesaleProvider] fetchAnnouncements error:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [org]);

  // Fetch favorites, notifications, templates when client is authenticated
  useEffect(() => {
    if (client?.id && isAuthenticated) {
      fetchFavorites();
      fetchNotifications();
      fetchTemplates();
    }
  }, [client?.id, isAuthenticated, fetchFavorites, fetchNotifications, fetchTemplates]);

  // Fetch announcements for any visitor (no auth required)
  useEffect(() => {
    if (org) fetchAnnouncements();
  }, [org, fetchAnnouncements]);

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

      // Client (B2B portal auth)
      client: client || null,
      clientLoading,
      isAuthenticated,

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

      // Favorites
      favorites,
      favoritesLoading,
      fetchFavorites,
      toggleFavorite,
      isFavorite,

      // Notifications
      notifications,
      unreadCount,
      notificationsLoading,
      fetchNotifications,
      markNotificationRead,

      // Templates
      templates,
      templatesLoading,
      fetchTemplates,
      createTemplate,
      deleteTemplate,

      // Dashboard
      dashboardData,
      dashboardLoading,
      fetchDashboardData,

      // Announcements
      announcements,
      announcementsLoading,
      fetchAnnouncements,

      // API helper
      portalApi,
    }),
    [
      config,
      storePublished,
      configLoading,
      configError,
      org,
      client,
      clientLoading,
      isAuthenticated,
      themeVars,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      favorites,
      favoritesLoading,
      fetchFavorites,
      toggleFavorite,
      isFavorite,
      notifications,
      unreadCount,
      notificationsLoading,
      fetchNotifications,
      markNotificationRead,
      templates,
      templatesLoading,
      fetchTemplates,
      createTemplate,
      deleteTemplate,
      dashboardData,
      dashboardLoading,
      fetchDashboardData,
      announcements,
      announcementsLoading,
      fetchAnnouncements,
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
