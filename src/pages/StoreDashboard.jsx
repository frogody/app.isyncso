/**
 * StoreDashboard - Multi-view store dashboard with channel tabs.
 * Views: All Channels | B2B Wholesale | bol.com | Shopify
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  Radio,
  ArrowRight,
  Package,
  Tag,
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
  Store,
  ShoppingBag,
  Globe,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  MessageSquare,
  Users,
  Layers,
  ExternalLink,
  Settings,
  BarChart3,
  Truck,
  CreditCard,
  UserCheck,
  PlusCircle,
  Eye,
} from 'lucide-react';

import { ORDER_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/components/b2b-admin/shared/b2bConstants';

// ---------------------------------------------------------------------------
// Motion presets
// ---------------------------------------------------------------------------

const SLIDE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = (delay = 0) => ({
  ...SLIDE_UP,
  transition: { ...SLIDE_UP.transition, delay },
});

// ---------------------------------------------------------------------------
// Channel definitions
// ---------------------------------------------------------------------------

const CHANNELS = {
  all: {
    key: 'all',
    label: 'All Channels',
    icon: Layers,
    color: 'cyan',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/20',
  },
  b2b: {
    key: 'b2b',
    label: 'B2B Wholesale',
    icon: Store,
    color: 'cyan',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/20',
  },
  bolcom: {
    key: 'bolcom',
    label: 'bol.com',
    icon: Globe,
    color: 'blue',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    ring: 'ring-blue-500/20',
  },
  shopify: {
    key: 'shopify',
    label: 'Shopify',
    icon: ShoppingBag,
    color: 'green',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
    ring: 'ring-green-500/20',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const colorClass = ORDER_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

function SourceBadge({ source }) {
  const map = {
    b2b: { label: 'B2B', cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    shopify: { label: 'Shopify', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
    bolcom: { label: 'bol.com', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    manual: { label: 'Manual', cls: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30' },
    email: { label: 'Email', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    api: { label: 'API', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  };
  const info = map[source] || map.manual;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${info.cls}`}>
      {info.label}
    </span>
  );
}

function GlassCard({ children, className = '', padding = 'md' }) {
  const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div className={`rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm ${pad[padding]} ${className}`}>
      {children}
    </div>
  );
}

function ChannelBar({ icon: Icon, name, connected, orderCount, revenue, maxOrders, onClick, delay = 0, active = false, channelColor = 'cyan' }) {
  const pct = maxOrders > 0 ? (orderCount / maxOrders) * 100 : 0;
  const barColors = {
    cyan: 'bg-cyan-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  };
  return (
    <motion.button
      {...stagger(delay)}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-[16px] border bg-zinc-900/40 backdrop-blur-sm hover:border-cyan-500/20 transition-all group text-left ${active ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-zinc-800/60'}`}
    >
      <div className="w-10 h-10 rounded-[14px] bg-zinc-800/60 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{name}</span>
            {connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-zinc-600" />
            )}
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-sm font-bold text-white tabular-nums">{orderCount}</span>
              <span className="text-[10px] text-zinc-500 ml-1">orders</span>
            </div>
            <div>
              <span className="text-sm font-bold text-white tabular-nums">{revenue}</span>
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColors[channelColor] || 'bg-cyan-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: delay + 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Quick actions per channel
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = {
  all: [
    { label: 'Edit B2B Store', description: 'Customize your storefront', icon: LayoutDashboard, path: '/b2bstorebuilder' },
    { label: 'B2B Orders', description: 'Manage wholesale orders', icon: Package, path: '/b2b/orders' },
    { label: 'Price Lists', description: 'Manage client pricing', icon: Tag, path: '/b2b/price-lists' },
    { label: 'Product Catalog', description: 'Manage your products', icon: ShoppingBag, path: '/Products' },
    { label: 'Client Chat', description: 'Customer messages', icon: MessageSquare, path: '/b2b/chat' },
    { label: 'Store Access', description: 'Control who can access your store', icon: Users, path: '/b2b/clients' },
  ],
  b2b: [
    { label: 'B2B Orders', description: 'View and manage orders', icon: Package, path: '/b2b/orders' },
    { label: 'Edit Storefront', description: 'Customize your B2B store', icon: LayoutDashboard, path: '/b2bstorebuilder' },
    { label: 'Manage Clients', description: 'Client access & invites', icon: UserCheck, path: '/b2b/clients' },
    { label: 'Price Lists', description: 'Client-specific pricing', icon: Tag, path: '/b2b/price-lists' },
    { label: 'Client Chat', description: 'Customer messages', icon: MessageSquare, path: '/b2b/chat' },
    { label: 'Shipping Tasks', description: 'Fulfillment overview', icon: Truck, path: '/inventoryshipping' },
  ],
  bolcom: [
    { label: 'Sales Orders', description: 'View bol.com orders', icon: Package, path: '/Warehouse' },
    { label: 'Product Mappings', description: 'EAN / offer sync', icon: BarChart3, path: '/Settings?tab=integrations' },
    { label: 'Connection Settings', description: 'API credentials', icon: Settings, path: '/Settings?tab=integrations' },
    { label: 'Product Catalog', description: 'Manage products', icon: ShoppingBag, path: '/Products' },
    { label: 'Shipping Tasks', description: 'Fulfillment overview', icon: Truck, path: '/inventoryshipping' },
  ],
  shopify: [
    { label: 'Sales Orders', description: 'View Shopify orders', icon: Package, path: '/Warehouse' },
    { label: 'Product Mappings', description: 'Variant sync', icon: BarChart3, path: '/Settings?tab=integrations' },
    { label: 'Connection Settings', description: 'Shopify credentials', icon: Settings, path: '/Settings?tab=integrations' },
    { label: 'Product Catalog', description: 'Manage products', icon: ShoppingBag, path: '/Products' },
    { label: 'Shipping Tasks', description: 'Fulfillment overview', icon: Truck, path: '/inventoryshipping' },
  ],
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StoreDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();
  const companyId = user?.company_id;
  const organizationId = user?.organization_id || user?.company_id;

  const [activeView, setActiveView] = useState(searchParams.get('view') || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Raw data
  const [channelData, setChannelData] = useState({
    b2b: { connected: false, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
    shopify: { connected: false, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
    bolcom: { connected: false, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
    manual: { connected: true, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
  });

  const [storeUrl, setStoreUrl] = useState(null);

  // Derived data based on active view
  const viewData = useMemo(() => {
    const ch = channelData;
    if (activeView === 'all') {
      const totalOrders = ch.b2b.orders + ch.shopify.orders + ch.bolcom.orders + ch.manual.orders;
      const totalRevenue = ch.b2b.revenue + ch.shopify.revenue + ch.bolcom.revenue + ch.manual.revenue;
      const totalPending = ch.b2b.pending + ch.shopify.pending + ch.bolcom.pending + ch.manual.pending;
      const activeChannels = [ch.b2b, ch.shopify, ch.bolcom].filter(c => c.connected).length;
      const allRecent = [...ch.b2b.recentOrders, ...ch.shopify.recentOrders, ...ch.bolcom.recentOrders, ...ch.manual.recentOrders]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
      return { orders: totalOrders, revenue: totalRevenue, pending: totalPending, activeChannels, recentOrders: allRecent };
    }
    const data = ch[activeView] || { orders: 0, revenue: 0, pending: 0, recentOrders: [] };
    return { orders: data.orders, revenue: data.revenue, pending: data.pending, activeChannels: data.connected ? 1 : 0, recentOrders: data.recentOrders };
  }, [channelData, activeView]);

  const maxChannelOrders = useMemo(
    () => Math.max(channelData.b2b.orders, channelData.shopify.orders, channelData.bolcom.orders, channelData.manual.orders, 1),
    [channelData]
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const safe = (promise, label = '') =>
        promise
          .then((r) => {
            if (r.error) console.warn(`[StoreDashboard] ${label}:`, r.error.message);
            return r;
          })
          .catch((err) => {
            console.warn(`[StoreDashboard] ${label}:`, err?.message);
            return { data: null, count: 0, error: null };
          });

      const [
        shopifyCreds, bolcomCreds, b2bConfig,
        salesMonthly, salesPending, salesRecent,
        b2bMonthly, b2bPending, b2bRecent,
      ] = await Promise.all([
        safe(supabase.from('shopify_credentials').select('id, shop_domain, shop_name, status').eq('company_id', companyId).eq('is_active', true).maybeSingle(), 'shopify'),
        safe(supabase.from('bolcom_credentials').select('id, environment').eq('company_id', companyId).eq('is_active', true).maybeSingle(), 'bolcom'),
        safe(supabase.from('portal_settings').select('id, store_subdomain, custom_domain').eq('organization_id', organizationId).eq('enable_wholesale', true).maybeSingle(), 'b2bConfig'),
        safe(supabase.from('sales_orders').select('id, source, total, status, order_number, order_date, customer_id, customers(name, email)').eq('company_id', companyId).gte('order_date', startOfMonth), 'salesMonthly'),
        safe(supabase.from('sales_orders').select('id, source, status').eq('company_id', companyId).eq('status', 'pending'), 'salesPending'),
        safe(supabase.from('sales_orders').select('id, order_number, source, status, total, order_date, customer_id, customers(name, email)').eq('company_id', companyId).order('order_date', { ascending: false }).limit(20), 'salesRecent'),
        safe(supabase.from('b2b_orders').select('id, total, status').eq('organization_id', organizationId).gte('created_at', startOfMonth), 'b2bMonthly'),
        safe(supabase.from('b2b_orders').select('id, status').eq('organization_id', organizationId).eq('status', 'pending'), 'b2bPending'),
        safe(supabase.from('b2b_orders').select('id, order_number, status, total, currency, created_at, portal_clients(id, full_name, email)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20), 'b2bRecent'),
      ]);

      const shopifyConnected = !!shopifyCreds.data;
      const bolcomConnected = !!bolcomCreds.data;
      const b2bConnected = !!b2bConfig.data;

      // Store URL
      if (b2bConfig.data) {
        if (b2bConfig.data.custom_domain) setStoreUrl(`https://${b2bConfig.data.custom_domain}`);
        else if (b2bConfig.data.store_subdomain) setStoreUrl(`https://${b2bConfig.data.store_subdomain}.syncstore.business`);
      }

      // Parse sales_orders by source
      const salesRows = salesMonthly.data || [];
      const salesPendingRows = salesPending.data || [];
      const salesRecentRows = salesRecent.data || [];

      const filterSource = (rows, src) => rows.filter(r => r.source === src);
      const sumRevenue = (rows) => rows.reduce((s, r) => s + (parseFloat(String(r.total)) || 0), 0);
      const isManualSource = (src) => !src || src === 'manual' || src === 'email' || src === 'api';

      const formatSalesOrder = (o) => ({
        id: o.id,
        orderNumber: o.order_number || `#${String(o.id).slice(0, 8)}`,
        source: o.source || 'manual',
        customer: o.customers?.name || o.customers?.email || 'Customer',
        date: o.order_date,
        total: parseFloat(String(o.total)) || 0,
        status: o.status || 'pending',
        link: null,
      });

      const shopifyOrders = filterSource(salesRows, 'shopify');
      const bolcomOrders = filterSource(salesRows, 'bolcom');
      const manualOrders = salesRows.filter(r => isManualSource(r.source));

      const shopifyPending = filterSource(salesPendingRows, 'shopify').length;
      const bolcomPending = filterSource(salesPendingRows, 'bolcom').length;
      const manualPending = salesPendingRows.filter(r => isManualSource(r.source)).length;

      // B2B data
      const b2bRows = b2bMonthly.data || [];
      const b2bPendingCount = (b2bPending.data || []).length;
      const b2bRecentFormatted = (b2bRecent.data || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number || `#${o.id.slice(0, 8)}`,
        source: 'b2b',
        customer: o.portal_clients?.full_name || o.portal_clients?.email || 'B2B Client',
        date: o.created_at,
        total: parseFloat(String(o.total)) || 0,
        status: o.status || 'pending',
        link: `/b2b/orders/${o.id}`,
      }));

      setChannelData({
        b2b: {
          connected: b2bConnected,
          orders: b2bRows.length,
          revenue: sumRevenue(b2bRows),
          pending: b2bPendingCount,
          recentOrders: b2bRecentFormatted,
        },
        shopify: {
          connected: shopifyConnected,
          orders: shopifyOrders.length,
          revenue: sumRevenue(shopifyOrders),
          pending: shopifyPending,
          recentOrders: filterSource(salesRecentRows, 'shopify').map(formatSalesOrder),
        },
        bolcom: {
          connected: bolcomConnected,
          orders: bolcomOrders.length,
          revenue: sumRevenue(bolcomOrders),
          pending: bolcomPending,
          recentOrders: filterSource(salesRecentRows, 'bolcom').map(formatSalesOrder),
        },
        manual: {
          connected: true,
          orders: manualOrders.length,
          revenue: sumRevenue(manualOrders),
          pending: manualPending,
          recentOrders: salesRecentRows.filter(r => isManualSource(r.source)).map(formatSalesOrder),
        },
      });
    } catch (err) {
      console.error('[StoreDashboard] fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [companyId, organizationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync activeView with URL
  const switchView = useCallback((view) => {
    setActiveView(view);
    setSearchParams(view === 'all' ? {} : { view });
  }, [setSearchParams]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const channelConfig = CHANNELS[activeView] || CHANNELS.all;
  const quickActions = QUICK_ACTIONS[activeView] || QUICK_ACTIONS.all;

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <div className="h-10 w-64 bg-zinc-800/50 rounded-[20px] animate-pulse" />
          <div className="h-12 bg-zinc-800/30 rounded-full animate-pulse w-[440px]" />
          <div className="rounded-[20px] bg-zinc-900/30 border border-zinc-800/40 h-36 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const ChannelIcon = channelConfig.icon;

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <motion.div {...stagger(0)} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[20px] flex items-center justify-center ${channelConfig.bg}`}>
              <ChannelIcon className={`w-5 h-5 ${channelConfig.text}`} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Store Dashboard</h1>
              <p className="text-xs text-zinc-500">
                {activeView === 'all' ? 'Unified overview across all sales channels' : `${channelConfig.label} channel overview`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {storeUrl && activeView !== 'bolcom' && activeView !== 'shopify' && (
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all text-sm font-medium"
              >
                <Globe className="w-4 h-4" />
                Visit Store
              </motion.a>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-all text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* Channel Tabs */}
        <motion.div {...stagger(0.05)} className="flex items-center gap-1 p-1 rounded-full bg-zinc-900/60 border border-zinc-800/40 w-fit">
          {Object.values(CHANNELS).map((ch) => {
            const TabIcon = ch.icon;
            const isActive = activeView === ch.key;
            return (
              <button
                key={ch.key}
                onClick={() => switchView(ch.key)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? `${ch.bg} ${ch.text} border ${ch.border}`
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{ch.label}</span>
                {ch.key !== 'all' && channelData[ch.key]?.connected && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-current' : 'bg-zinc-600'}`} />
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div {...stagger(0.1)} className="flex items-center gap-3 p-4 rounded-[16px] border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Hero KPI Strip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard padding="none" className="overflow-hidden">
              <div className="flex flex-col lg:flex-row items-stretch">
                {/* Revenue highlight */}
                <div className="flex-shrink-0 p-6 lg:p-8 flex flex-col justify-center lg:w-72 lg:border-r border-zinc-800/40">
                  <div className={`w-14 h-14 rounded-[20px] ${channelConfig.bg} flex items-center justify-center mb-4`}>
                    <TrendingUp className={`w-7 h-7 ${channelConfig.text}`} />
                  </div>
                  <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(viewData.revenue)}</p>
                  <p className="text-sm text-zinc-400 mt-1">Revenue This Month</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <Zap className={`w-3.5 h-3.5 ${channelConfig.text}`} />
                    <span className={`text-xs ${channelConfig.text} font-medium`}>
                      {viewData.orders} order{viewData.orders !== 1 ? 's' : ''}
                      {activeView === 'all' ? ` across ${viewData.activeChannels} channels` : ` on ${channelConfig.label}`}
                    </span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800/20">
                  {[
                    { icon: ShoppingCart, label: 'Orders', value: viewData.orders },
                    { icon: Clock, label: 'Pending', value: viewData.pending, sub: viewData.pending > 0 ? 'Require attention' : 'All clear' },
                    activeView === 'all'
                      ? { icon: Radio, label: 'Channels', value: `${viewData.activeChannels}/3`, sub: 'Connected' }
                      : { icon: DollarSign, label: 'Avg. Order', value: viewData.orders > 0 ? formatCurrency(viewData.revenue / viewData.orders) : '€0', sub: 'Per order' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-900/40 p-5 flex flex-col justify-center">
                      <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center mb-3 ${channelConfig.bg} ${channelConfig.text}`}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
                      {stat.sub && <p className="text-[10px] text-zinc-600 mt-1">{stat.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {/* Sales Channels — only on "All" view */}
        {activeView === 'all' && (
          <motion.div {...stagger(0.25)}>
            <GlassCard padding="md">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4 text-cyan-400" />
                Sales Channels
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ChannelBar icon={Store} name="B2B Wholesale" connected={channelData.b2b.connected} orderCount={channelData.b2b.orders} revenue={formatCurrency(channelData.b2b.revenue)} maxOrders={maxChannelOrders} onClick={() => switchView('b2b')} channelColor="cyan" delay={0.3} />
                <ChannelBar icon={ShoppingBag} name="Shopify" connected={channelData.shopify.connected} orderCount={channelData.shopify.orders} revenue={formatCurrency(channelData.shopify.revenue)} maxOrders={maxChannelOrders} onClick={() => switchView('shopify')} channelColor="green" delay={0.35} />
                <ChannelBar icon={Globe} name="bol.com" connected={channelData.bolcom.connected} orderCount={channelData.bolcom.orders} revenue={formatCurrency(channelData.bolcom.revenue)} maxOrders={maxChannelOrders} onClick={() => switchView('bolcom')} channelColor="blue" delay={0.4} />
                <ChannelBar icon={FileText} name="Manual / Other" connected={channelData.manual.connected} orderCount={channelData.manual.orders} revenue={formatCurrency(channelData.manual.revenue)} maxOrders={maxChannelOrders} onClick={() => navigate('/Warehouse')} channelColor="cyan" delay={0.45} />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Channel-specific status — only on single-channel views */}
        {activeView !== 'all' && (
          <motion.div {...stagger(0.25)}>
            <ChannelStatusCard channel={activeView} data={channelData[activeView]} config={channelConfig} formatCurrency={formatCurrency} navigate={navigate} />
          </motion.div>
        )}

        {/* Recent Orders + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <motion.div {...stagger(0.35)} className="lg:col-span-2">
            <GlassCard padding="none" className="overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-zinc-800/40 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Package className={`w-4 h-4 ${channelConfig.text}`} />
                  {activeView === 'all' ? 'Recent Orders' : `${channelConfig.label} Orders`}
                </h3>
                {viewData.recentOrders.length > 0 && (
                  <button
                    onClick={() => navigate(activeView === 'b2b' ? '/b2b/orders' : '/Warehouse')}
                    className={`text-xs ${channelConfig.text} hover:opacity-80 flex items-center gap-1 font-medium transition-colors`}
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {viewData.recentOrders.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="w-12 h-12 rounded-[20px] bg-zinc-800/40 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">No orders yet</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {activeView === 'all' ? 'Orders from all channels will appear here' : `Connect and sync ${channelConfig.label} to see orders`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/30">
                  {viewData.recentOrders.map((order, i) => (
                    <motion.div
                      key={`${order.source}-${order.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.03 }}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/20 transition-colors cursor-pointer"
                      onClick={() => order.link && navigate(order.link)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">{order.orderNumber}</p>
                            {activeView === 'all' && <SourceBadge source={order.source} />}
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{order.customer} &middot; {formatDate(order.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(order.total)}</span>
                        <StatusBadge status={order.status} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div {...stagger(0.4)}>
            <GlassCard padding="none" className="overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-zinc-800/40">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${channelConfig.text}`} />
                  Quick Actions
                </h3>
              </div>
              <div className="p-3 space-y-2">
                {quickActions.map((action, i) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.button
                      key={action.path + action.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.04 }}
                      onClick={() => navigate(action.path)}
                      className="w-full flex items-center gap-3.5 p-3 rounded-[14px] border border-zinc-800/40 bg-zinc-800/20 hover:bg-zinc-800/40 hover:border-cyan-500/20 transition-all text-left group"
                    >
                      <div className={`w-9 h-9 rounded-[12px] ${channelConfig.bg} ${channelConfig.text} group-hover:opacity-80 transition-colors flex items-center justify-center flex-shrink-0`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{action.label}</p>
                        <p className="text-[11px] text-zinc-500">{action.description}</p>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-zinc-700 group-hover:${channelConfig.text} transition-colors flex-shrink-0`} />
                    </motion.button>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel Status Card — shown in single-channel views
// ---------------------------------------------------------------------------

function ChannelStatusCard({ channel, data, config, formatCurrency, navigate }) {
  const ChannelIcon = config.icon;

  if (channel === 'b2b') {
    return (
      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ChannelIcon className={`w-4 h-4 ${config.text}`} />
            B2B Wholesale Status
          </h3>
          {data.connected && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Store Active
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders This Month</p>
            <p className="text-lg font-bold text-white tabular-nums">{data.orders}</p>
          </div>
          <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Revenue</p>
            <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(data.revenue)}</p>
          </div>
          <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-lg font-bold text-white tabular-nums">{data.pending}</p>
          </div>
          <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Avg. Order Value</p>
            <p className="text-lg font-bold text-white tabular-nums">{data.orders > 0 ? formatCurrency(data.revenue / data.orders) : '€0'}</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (channel === 'bolcom') {
    return (
      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ChannelIcon className={`w-4 h-4 ${config.text}`} />
            bol.com Channel Status
          </h3>
          {data.connected ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <button
              onClick={() => navigate('/Settings?tab=integrations')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Connect bol.com
            </button>
          )}
        </div>
        {data.connected ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders This Month</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.orders}</p>
            </div>
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Revenue</p>
              <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(data.revenue)}</p>
            </div>
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.pending}</p>
            </div>
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Avg. Order Value</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.orders > 0 ? formatCurrency(data.revenue / data.orders) : '€0'}</p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-[20px] bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">Connect your bol.com account</p>
            <p className="text-xs text-zinc-500 mb-4">Link your bol.com retailer API to sync orders and inventory automatically</p>
            <button
              onClick={() => navigate('/Settings?tab=integrations')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-all"
            >
              <Settings className="w-4 h-4" />
              Go to Integrations
            </button>
          </div>
        )}
      </GlassCard>
    );
  }

  if (channel === 'shopify') {
    return (
      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ChannelIcon className={`w-4 h-4 ${config.text}`} />
            Shopify Channel Status
          </h3>
          {data.connected ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <button
              onClick={() => navigate('/Settings?tab=integrations')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 hover:text-green-300 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Connect Shopify
            </button>
          )}
        </div>
        {data.connected ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders This Month</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.orders}</p>
            </div>
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Revenue</p>
              <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(data.revenue)}</p>
            </div>
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.pending}</p>
            </div>
            <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Avg. Order Value</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.orders > 0 ? formatCurrency(data.revenue / data.orders) : '€0'}</p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-[20px] bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">Connect your Shopify store</p>
            <p className="text-xs text-zinc-500 mb-4">Link your Shopify store to sync orders, products, and inventory</p>
            <button
              onClick={() => navigate('/Settings?tab=integrations')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-all"
            >
              <Settings className="w-4 h-4" />
              Go to Integrations
            </button>
          </div>
        )}
      </GlassCard>
    );
  }

  return null;
}
