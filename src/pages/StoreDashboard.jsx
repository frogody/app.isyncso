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
  Lock,
  Award,
} from 'lucide-react';

import { ORDER_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/components/b2b-admin/shared/b2bConstants';
import PrepOrderModal from '@/components/store/PrepOrderModal';

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
  b2b: {
    key: 'b2b',
    label: 'B2B Wholesale',
    icon: Store,
    color: 'cyan',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/20',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    accentHex: '#06b6d4',
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
    gradient: 'from-blue-500/20 to-blue-500/5',
    accentHex: '#3b82f6',
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
    gradient: 'from-green-500/20 to-green-500/5',
    accentHex: '#22c55e',
  },
  all: {
    key: 'all',
    label: 'All Channels',
    icon: Layers,
    color: 'cyan',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/20',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    accentHex: '#06b6d4',
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
    { label: 'Sales Analytics', description: 'Product sales & revenue', icon: TrendingUp, path: '/ProductSalesAnalytics' },
    { label: 'Edit B2B Store', description: 'Customize your storefront', icon: LayoutDashboard, path: '/b2bstorebuilder' },
    { label: 'B2B Orders', description: 'Manage wholesale orders', icon: Package, path: '/b2b/orders' },
    { label: 'Manage Clients', description: 'Clients, access & pricing rules', icon: UserCheck, path: '/b2b/clients' },
    { label: 'Product Catalog', description: 'Manage your products', icon: ShoppingBag, path: '/Products' },
    { label: 'Client Chat', description: 'Customer messages', icon: MessageSquare, path: '/b2b/chat' },
    { label: 'Shipping Tasks', description: 'Fulfillment overview', icon: Truck, path: '/inventoryshipping' },
  ],
  b2b: [
    { label: 'Sales Analytics', description: 'Product sales & revenue', icon: TrendingUp, path: '/ProductSalesAnalytics' },
    { label: 'B2B Orders', description: 'View and manage orders', icon: Package, path: '/b2b/orders' },
    { label: 'Edit Storefront', description: 'Customize your B2B store', icon: LayoutDashboard, path: '/b2bstorebuilder' },
    { label: 'Manage Clients', description: 'Access, invites & pricing rules', icon: UserCheck, path: '/b2b/clients' },
    { label: 'Client Chat', description: 'Customer messages', icon: MessageSquare, path: '/b2b/chat' },
    { label: 'Shipping Tasks', description: 'Fulfillment overview', icon: Truck, path: '/inventoryshipping' },
  ],
  bolcom: [
    { label: 'Sales Analytics', description: 'Product sales & revenue', icon: TrendingUp, path: '/ProductSalesAnalytics' },
    { label: 'Sales Orders', description: 'View bol.com orders', icon: Package, path: '/Warehouse' },
    { label: 'Product Mappings', description: 'EAN / offer sync', icon: BarChart3, path: '/Settings?tab=integrations' },
    { label: 'Connection Settings', description: 'API credentials', icon: Settings, path: '/Settings?tab=integrations' },
    { label: 'Product Catalog', description: 'Manage products', icon: ShoppingBag, path: '/Products' },
    { label: 'Shipping Tasks', description: 'Fulfillment overview', icon: Truck, path: '/inventoryshipping' },
  ],
  shopify: [
    { label: 'Sales Analytics', description: 'Product sales & revenue', icon: TrendingUp, path: '/ProductSalesAnalytics' },
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

  const [activeView, setActiveView] = useState(searchParams.get('view') || 'b2b');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrepOrder, setShowPrepOrder] = useState(false);

  // Raw data
  const [channelData, setChannelData] = useState({
    b2b: { connected: false, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
    shopify: { connected: false, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
    bolcom: { connected: false, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
    manual: { connected: true, orders: 0, revenue: 0, pending: 0, recentOrders: [] },
  });

  const [storeUrl, setStoreUrl] = useState(null);
  const [payoutsData, setPayoutsData] = useState([]);
  const [b2bInsights, setB2bInsights] = useState({
    invoices: [], invoiceStats: {}, topProducts: [], clients: [], clientStats: {},
  });

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
      // Use UTC dates consistently to avoid local timezone shifting "Today" into the previous day
      const periodStart = (() => {
        if (selectedPeriod === '1d') {
          return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        }
        if (selectedPeriod === '7d') {
          const d = new Date(now.getTime() - 7 * 86400000);
          return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        }
        if (selectedPeriod === '30d') {
          const d = new Date(now.getTime() - 30 * 86400000);
          return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        }
        if (selectedPeriod === '90d') {
          const d = new Date(now.getTime() - 90 * 86400000);
          return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        }
        if (selectedPeriod === 'all') return new Date('2020-01-01T00:00:00Z');
        const d = new Date(now.getTime() - 7 * 86400000);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      })().toISOString();

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
        salesStats, salesRecent,
        b2bMonthly, b2bPending, b2bRecent,
        b2bInvoices, b2bTopItems, portalClients,
        bolcomPayouts,
      ] = await Promise.all([
        safe(supabase.from('shopify_credentials').select('id, shop_domain, shop_name, status').eq('company_id', companyId).eq('is_active', true).maybeSingle(), 'shopify'),
        safe(supabase.from('bolcom_credentials').select('id, environment').eq('company_id', companyId).eq('is_active', true).maybeSingle(), 'bolcom'),
        safe(supabase.from('portal_settings').select('id, store_subdomain, custom_domain').eq('organization_id', organizationId).eq('enable_wholesale', true).maybeSingle(), 'b2bConfig'),
        // Use server-side aggregation to avoid Supabase 1000-row limit
        safe(supabase.rpc('get_store_dashboard_stats', { p_company_id: companyId, p_period_start: periodStart }), 'salesStats'),
        safe(supabase.from('sales_orders').select('id, order_number, source, status, total, order_date, customer_id, customers(name, email)').eq('company_id', companyId).order('order_date', { ascending: false }).limit(20), 'salesRecent'),
        safe(supabase.from('b2b_orders').select('id, total, status').eq('organization_id', organizationId).gte('created_at', periodStart).range(0, 49999), 'b2bMonthly'),
        safe(supabase.from('b2b_orders').select('id, status').eq('organization_id', organizationId).eq('status', 'pending').range(0, 49999), 'b2bPending'),
        safe(supabase.from('b2b_orders').select('id, order_number, status, total, currency, created_at, portal_clients(id, full_name, email)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20), 'b2bRecent'),
        // B2B insight queries — scoped to this company/org
        safe(supabase.from('invoices').select('id, invoice_number, status, total, due_date, amount_paid, balance_due, b2b_order_id, created_at').eq('company_id', companyId).not('b2b_order_id', 'is', null).order('created_at', { ascending: false }).range(0, 9999), 'b2bInvoices'),
        safe(supabase.from('b2b_order_items').select('product_name, sku, quantity, unit_price, line_total, b2b_order_id, b2b_orders!inner(organization_id)').eq('b2b_orders.organization_id', organizationId).order('line_total', { ascending: false }).limit(30), 'b2bTopItems'),
        safe(supabase.from('portal_clients').select('id, full_name, email, status, last_login_at, created_at, company_name').eq('organization_id', organizationId), 'portalClients'),
        // bol.com payout summaries
        safe(supabase.from('bolcom_payouts').select('id, invoice_number, period_start, period_end, gross_sales, corrections, commissions, shipping_costs, pickpack_costs, storage_costs, other_costs, net_payout').eq('company_id', companyId).order('period_start', { ascending: false }), 'bolcomPayouts'),
      ]);

      const shopifyConnected = !!shopifyCreds.data;
      const bolcomConnected = !!bolcomCreds.data;
      const b2bConnected = !!b2bConfig.data;

      // Store URL
      if (b2bConfig.data) {
        if (b2bConfig.data.custom_domain) setStoreUrl(`https://${b2bConfig.data.custom_domain}`);
        else if (b2bConfig.data.store_subdomain) setStoreUrl(`https://${b2bConfig.data.store_subdomain}.syncstore.business`);
      }

      // Parse aggregated stats from RPC (no row limit issues)
      const statsRows = salesStats.data || [];
      const salesRecentRows = salesRecent.data || [];

      const getStats = (src) => {
        const row = statsRows.find(r => r.source === src);
        return { orders: Number(row?.order_count || 0), revenue: Number(row?.revenue || 0), pending: Number(row?.pending_count || 0) };
      };
      const isManualSource = (src) => !src || src === 'manual' || src === 'email' || src === 'api';
      // Aggregate all manual-like sources
      const manualStats = statsRows.filter(r => isManualSource(r.source)).reduce(
        (acc, r) => ({ orders: acc.orders + Number(r.order_count || 0), revenue: acc.revenue + Number(r.revenue || 0), pending: acc.pending + Number(r.pending_count || 0) }),
        { orders: 0, revenue: 0, pending: 0 }
      );
      const shopifyStats = getStats('shopify');
      const bolcomStats = getStats('bolcom');

      const filterSource = (rows, src) => rows.filter(r => r.source === src);

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

      // B2B data
      const b2bRows = b2bMonthly.data || [];
      const b2bPendingCount = (b2bPending.data || []).length;
      const sumRevenue = (rows) => rows.reduce((s, r) => s + (parseFloat(String(r.total)) || 0), 0);
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
          orders: shopifyStats.orders,
          revenue: shopifyStats.revenue,
          pending: shopifyStats.pending,
          recentOrders: filterSource(salesRecentRows, 'shopify').map(formatSalesOrder),
        },
        bolcom: {
          connected: bolcomConnected,
          orders: bolcomStats.orders,
          revenue: bolcomStats.revenue,
          pending: bolcomStats.pending,
          recentOrders: filterSource(salesRecentRows, 'bolcom').map(formatSalesOrder),
        },
        manual: {
          connected: true,
          orders: manualStats.orders,
          revenue: manualStats.revenue,
          pending: manualStats.pending,
          recentOrders: salesRecentRows.filter(r => isManualSource(r.source)).map(formatSalesOrder),
        },
      });

      // Process B2B insight data
      const invoiceRows = b2bInvoices.data || [];
      const itemRows = b2bTopItems.data || [];
      const clientRows = portalClients.data || [];

      // Aggregate top products by name
      const productMap = {};
      itemRows.forEach(item => {
        const key = item.product_name || item.sku || 'Unknown';
        if (!productMap[key]) productMap[key] = { name: key, sku: item.sku, totalQty: 0, totalRevenue: 0 };
        productMap[key].totalQty += item.quantity || 0;
        productMap[key].totalRevenue += parseFloat(String(item.line_total)) || 0;
      });
      const topProducts = Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

      // Invoice stats
      const invStats = {
        total: invoiceRows.reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0),
        paid: invoiceRows.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0),
        outstanding: invoiceRows.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + (parseFloat(String(i.balance_due || i.total)) || 0), 0),
        overdue: invoiceRows.filter(i => (i.status === 'pending' || i.status === 'sent') && i.due_date && new Date(i.due_date) < now).length,
        count: invoiceRows.length,
      };

      // Client stats
      const clStats = {
        total: clientRows.length,
        active: clientRows.filter(c => c.status === 'active').length,
        invited: clientRows.filter(c => c.status === 'invited').length,
      };

      setB2bInsights({ invoices: invoiceRows, invoiceStats: invStats, topProducts, clients: clientRows, clientStats: clStats });

      // bol.com payouts
      setPayoutsData(bolcomPayouts.data || []);
    } catch (err) {
      console.error('[StoreDashboard] fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [companyId, organizationId, selectedPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync bol.com orders from the API
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const bolcomSyncedRef = React.useRef(false);

  const syncBolcomOrders = useCallback(async () => {
    if (!companyId || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    let totalSynced = 0;
    let round = 0;
    const MAX_ROUNDS = 10; // Safety cap: max 10 consecutive sync rounds
    try {
      let needsMore = true;
      while (needsMore && round < MAX_ROUNDS) {
        round++;
        console.log(`[StoreDashboard] bol.com sync round ${round}...`);
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bolcom-api`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ action: 'fetchOrders', companyId }),
          }
        );
        const json = await resp.json();
        if (json.success) {
          totalSynced += json.data.ordersSynced || 0;
          setSyncResult({ ...json.data, ordersSynced: totalSynced, round });
          needsMore = json.data.needsMore && json.data.ordersSynced > 0;
        } else {
          console.error('[StoreDashboard] bol.com sync error:', json.error);
          setSyncResult({ error: json.error });
          needsMore = false;
        }
      }
      // Always refetch dashboard data after sync to show latest state
      await fetchData();
    } catch (err) {
      console.error('[StoreDashboard] bol.com sync error:', err);
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  }, [companyId, syncing, fetchData]);

  // Auto-sync bol.com orders on first load when connected
  useEffect(() => {
    if (!loading && channelData.bolcom.connected && !bolcomSyncedRef.current) {
      bolcomSyncedRef.current = true;
      syncBolcomOrders();
    }
  }, [loading, channelData.bolcom.connected, syncBolcomOrders]);

  // Sync activeView with URL
  const switchView = useCallback((view) => {
    setActiveView(view);
    setSearchParams(view === 'b2b' ? {} : { view });
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

  const PERIOD_OPTIONS = [
    { key: '1d', label: 'Today' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: 'all', label: 'All' },
  ];
  const periodLabel = selectedPeriod === '1d' ? 'Today'
    : selectedPeriod === '7d' ? 'Last 7 Days'
    : selectedPeriod === '30d' ? 'Last 30 Days'
    : selectedPeriod === '90d' ? 'Last 90 Days'
    : 'All Time';

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
            {/* Period selector pills */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-zinc-900/60 border border-zinc-800/40">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedPeriod === p.key
                      ? `${channelConfig.bg} ${channelConfig.text} border ${channelConfig.border}`
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
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
              onClick={() => setShowPrepOrder(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              Prep Order
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={syncing}
              onClick={async () => {
                // When on bolcom or all-channels view, trigger actual API sync first
                if ((activeView === 'bolcom' || activeView === 'all') && channelData.bolcom.connected) {
                  await syncBolcomOrders();
                } else {
                  await fetchData();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Refresh'}
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
                  <p className="text-sm text-zinc-400 mt-1">Revenue &mdash; {periodLabel}</p>
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
                    activeView === 'b2b'
                      ? { icon: Users, label: 'Active Clients', value: b2bInsights.clientStats?.active || 0, sub: `${b2bInsights.clientStats?.total || 0} total clients` }
                      : { icon: Clock, label: 'Pending', value: viewData.pending, sub: viewData.pending > 0 ? 'Require attention' : 'All clear' },
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

        {/* Channel Cockpit Cards — only on "All" view */}
        {activeView === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* B2B Cockpit Card */}
            <motion.div {...stagger(0.2)}>
              <ChannelCockpitCard
                channelKey="b2b"
                config={CHANNELS.b2b}
                data={channelData.b2b}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onViewChannel={() => switchView('b2b')}
                navigate={navigate}
                storeUrl={storeUrl}
                kpis={[
                  { label: 'Orders', value: channelData.b2b.orders },
                  { label: 'Clients', value: b2bInsights.clientStats?.active || 0 },
                  { label: 'Revenue', value: formatCurrency(channelData.b2b.revenue) },
                ]}
                actions={[
                  { label: 'Orders', icon: Package, path: '/b2b/orders' },
                  { label: 'Clients', icon: UserCheck, path: '/b2b/clients' },
                  { label: 'Chat', icon: MessageSquare, path: '/b2b/chat' },
                ]}
              />
            </motion.div>

            {/* bol.com Cockpit Card */}
            <motion.div {...stagger(0.3)}>
              <ChannelCockpitCard
                channelKey="bolcom"
                config={CHANNELS.bolcom}
                data={channelData.bolcom}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onViewChannel={() => switchView('bolcom')}
                navigate={navigate}
                kpis={[
                  { label: 'Orders', value: channelData.bolcom.orders },
                  { label: 'Pending', value: channelData.bolcom.pending, alert: channelData.bolcom.pending > 0 },
                  { label: 'Revenue', value: formatCurrency(channelData.bolcom.revenue) },
                ]}
                actions={[
                  { label: 'Orders', icon: Package, path: '/Warehouse' },
                  { label: 'Mappings', icon: BarChart3, path: '/Settings?tab=integrations' },
                  { label: 'Settings', icon: Settings, path: '/Settings?tab=integrations' },
                ]}
              />
            </motion.div>

            {/* Shopify Cockpit Card */}
            <motion.div {...stagger(0.4)}>
              <ChannelCockpitCard
                channelKey="shopify"
                config={CHANNELS.shopify}
                data={channelData.shopify}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onViewChannel={() => switchView('shopify')}
                navigate={navigate}
                kpis={[
                  { label: 'Orders', value: channelData.shopify.orders },
                  { label: 'Pending', value: channelData.shopify.pending, alert: channelData.shopify.pending > 0 },
                  { label: 'Revenue', value: formatCurrency(channelData.shopify.revenue) },
                ]}
                actions={[
                  { label: 'Orders', icon: Package, path: '/Warehouse' },
                  { label: 'Products', icon: ShoppingBag, path: '/Products' },
                  { label: 'Settings', icon: Settings, path: '/Settings?tab=integrations' },
                ]}
              />
            </motion.div>
          </div>
        )}

        {/* B2B: Insight cards row */}
        {activeView === 'b2b' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Products */}
            <motion.div {...stagger(0.2)}>
              <GlassCard padding="none" className="overflow-hidden h-full">
                <div className="px-5 py-3.5 border-b border-zinc-800/40 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Top Products
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-medium">By revenue</span>
                </div>
                <div className="p-4 space-y-3">
                  {b2bInsights.topProducts.map((product, i) => {
                    const maxRev = b2bInsights.topProducts[0]?.totalRevenue || 1;
                    const pct = (product.totalRevenue / maxRev) * 100;
                    return (
                      <motion.div
                        key={product.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.06 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {i === 0 && <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                            <span className="text-xs font-medium text-zinc-200 truncate">{product.name}</span>
                          </div>
                          <span className="text-xs font-bold text-white tabular-nums ml-2 flex-shrink-0">{formatCurrency(product.totalRevenue)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: 0.35 + i * 0.06, ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500">{product.totalQty} units sold</p>
                      </motion.div>
                    );
                  })}
                  {b2bInsights.topProducts.length === 0 && (
                    <div className="text-center py-6">
                      <Package className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No product data yet</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Invoice Health */}
            <motion.div {...stagger(0.25)}>
              <GlassCard padding="none" className="overflow-hidden h-full">
                <div className="px-5 py-3.5 border-b border-zinc-800/40">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Invoice Health
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Outstanding</span>
                    <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(b2bInsights.invoiceStats?.outstanding || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Collected</span>
                    <span className="text-sm font-bold text-cyan-400 tabular-nums">{formatCurrency(b2bInsights.invoiceStats?.paid || 0)}</span>
                  </div>
                  {(b2bInsights.invoiceStats?.overdue || 0) > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="text-xs text-red-400 font-medium">{b2bInsights.invoiceStats.overdue} overdue</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-800/40 space-y-2">
                    {[
                      { label: 'Paid', count: b2bInsights.invoices.filter(i => i.status === 'paid').length, color: 'bg-cyan-500' },
                      { label: 'Pending', count: b2bInsights.invoices.filter(i => i.status === 'pending' || i.status === 'sent').length, color: 'bg-amber-500' },
                      { label: 'Draft', count: b2bInsights.invoices.filter(i => i.status === 'draft').length, color: 'bg-zinc-600' },
                    ].filter(s => s.count > 0).map((segment, i) => (
                      <motion.div
                        key={segment.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex items-center gap-1.5 w-16">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${segment.color}`} />
                          <span className="text-[10px] text-zinc-400">{segment.label}</span>
                        </div>
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${segment.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(segment.count / Math.max(b2bInsights.invoices.length, 1)) * 100}%` }}
                            transition={{ duration: 0.5, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white w-6 text-right tabular-nums">{segment.count}</span>
                      </motion.div>
                    ))}
                  </div>
                  {b2bInsights.invoices.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-zinc-500">No invoices yet</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Portal Clients */}
            <motion.div {...stagger(0.3)}>
              <GlassCard padding="none" className="overflow-hidden h-full">
                <div className="px-5 py-3.5 border-b border-zinc-800/40 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Portal Clients
                  </h3>
                  <button
                    onClick={() => navigate('/b2b/clients')}
                    className="text-[10px] text-cyan-400 hover:opacity-80 flex items-center gap-1 font-medium"
                  >
                    Manage <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40 text-center">
                      <p className="text-lg font-bold text-white tabular-nums">{b2bInsights.clientStats?.active || 0}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Active</p>
                    </div>
                    <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40 text-center">
                      <p className="text-lg font-bold text-cyan-400 tabular-nums">{b2bInsights.clientStats?.invited || 0}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Invited</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {b2bInsights.clients.slice(0, 5).map((client, i) => (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.04 }}
                        className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-zinc-800/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${client.status === 'active' ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
                          <span className="text-xs text-zinc-200 truncate">{client.full_name || client.email}</span>
                        </div>
                        {client.company_name && (
                          <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2 truncate max-w-[80px]">{client.company_name}</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  {b2bInsights.clients.length === 0 && (
                    <div className="text-center py-4">
                      <UserCheck className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No clients yet</p>
                      <button
                        onClick={() => navigate('/b2b/clients')}
                        className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Invite your first client
                      </button>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* Channel-specific status — bolcom/shopify only */}
        {activeView !== 'all' && activeView !== 'b2b' && (
          <motion.div {...stagger(0.25)}>
            <ChannelStatusCard
              channel={activeView}
              data={channelData[activeView]}
              config={channelConfig}
              formatCurrency={formatCurrency}
              navigate={navigate}
              syncing={syncing}
              syncResult={syncResult}
              onSync={syncBolcomOrders}
              periodLabel={periodLabel}
              payoutsData={payoutsData}
            />
          </motion.div>
        )}

        {/* All Channels: Combined Recent Orders Feed */}
        {activeView === 'all' && viewData.recentOrders.length > 0 && (
          <motion.div {...stagger(0.5)}>
            <GlassCard padding="none" className="overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/40 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  Recent Orders — All Channels
                </h3>
                <button
                  onClick={() => navigate('/Warehouse')}
                  className="text-xs text-cyan-400 hover:opacity-80 flex items-center gap-1 font-medium transition-colors"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-zinc-800/30">
                {viewData.recentOrders.slice(0, 8).map((order, i) => (
                  <motion.div
                    key={`${order.source}-${order.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.03 }}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/20 transition-colors cursor-pointer"
                    onClick={() => order.link && navigate(order.link)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{order.orderNumber}</p>
                          <SourceBadge source={order.source} />
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
            </GlassCard>
          </motion.div>
        )}

        {/* Single-channel: Recent Orders + Quick Actions */}
        {activeView !== 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Orders */}
            <motion.div {...stagger(0.35)} className="lg:col-span-2">
              <GlassCard padding="none" className="overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-zinc-800/40 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Package className={`w-4 h-4 ${channelConfig.text}`} />
                    {channelConfig.label} Orders
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
                    <p className="text-xs text-zinc-600 mt-1">Connect and sync {channelConfig.label} to see orders</p>
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
                    const isLocked = action.comingSoon;
                    return (
                      <motion.button
                        key={action.path + action.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.04 }}
                        onClick={() => !isLocked && navigate(action.path)}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-[14px] border transition-all text-left group ${
                          isLocked
                            ? 'border-zinc-800/30 bg-zinc-800/10 cursor-not-allowed opacity-60'
                            : 'border-zinc-800/40 bg-zinc-800/20 hover:bg-zinc-800/40 hover:border-cyan-500/20 cursor-pointer'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 ${
                          isLocked ? 'bg-zinc-800/40 text-zinc-600' : `${channelConfig.bg} ${channelConfig.text} group-hover:opacity-80`
                        } transition-colors`}>
                          {isLocked ? <Lock className="w-4 h-4" /> : <ActionIcon className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isLocked ? 'text-zinc-500' : 'text-white'}`}>{action.label}</p>
                            {isLocked && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">{action.description}</p>
                        </div>
                        {!isLocked && (
                          <ArrowRight className={`w-4 h-4 text-zinc-700 group-hover:${channelConfig.text} transition-colors flex-shrink-0`} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </div>

      {/* Prep Order Modal */}
      <PrepOrderModal
        isOpen={showPrepOrder}
        onClose={() => setShowPrepOrder(false)}
        onOrderCreated={fetchData}
        companyId={companyId}
        organizationId={organizationId}
        userId={user?.id}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel Cockpit Card — shown on "All Channels" cockpit view
// ---------------------------------------------------------------------------

function ChannelCockpitCard({ channelKey, config, data, formatCurrency, formatDate, onViewChannel, navigate, storeUrl, kpis, actions }) {
  const ChannelIcon = config.icon;
  const isConnected = data.connected;
  const recentOrders = (data.recentOrders || []).slice(0, 3);
  const avgOrder = data.orders > 0 ? data.revenue / data.orders : 0;

  // Revenue share visual (ring)
  const revPct = data.revenue > 0 ? Math.min(100, Math.max(5, (data.orders / Math.max(data.orders, 1)) * 100)) : 0;

  return (
    <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm overflow-hidden h-full flex flex-col group hover:border-zinc-700/60 transition-all">
      {/* Channel Header with gradient accent */}
      <div className={`relative px-5 pt-5 pb-4 bg-gradient-to-b ${config.gradient}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[14px] ${config.bg} border ${config.border} flex items-center justify-center`}>
              <ChannelIcon className={`w-5 h-5 ${config.text}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{config.label}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isConnected ? (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${config.text}`} />
                    <span className="text-[10px] text-zinc-400 font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 font-medium">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewChannel}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${config.border} ${config.bg} ${config.text} hover:opacity-80 transition-all flex items-center gap-1`}
          >
            View <ArrowRight className="w-3 h-3" />
          </motion.button>
        </div>

        {/* Revenue highlight */}
        <div className="mt-1">
          <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{formatCurrency(data.revenue)}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {data.orders} order{data.orders !== 1 ? 's' : ''}
            {avgOrder > 0 && <span className="text-zinc-500"> &middot; avg {formatCurrency(avgOrder)}</span>}
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-px bg-zinc-800/20 border-y border-zinc-800/40">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-zinc-900/60 px-3 py-3 text-center">
            <p className={`text-lg font-bold tabular-nums ${kpi.alert ? 'text-amber-400' : 'text-white'}`}>{kpi.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders or Empty State */}
      <div className="flex-1 px-4 py-3">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className={`w-10 h-10 rounded-[14px] ${config.bg} flex items-center justify-center mb-3`}>
              <PlusCircle className={`w-5 h-5 ${config.text}`} />
            </div>
            <p className="text-xs text-zinc-300 font-medium mb-1">Connect {config.label}</p>
            <p className="text-[10px] text-zinc-500 mb-3">Set up this channel to start syncing</p>
            <button
              onClick={() => navigate(channelKey === 'b2b' ? '/b2bstorebuilder' : '/Settings?tab=integrations')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border ${config.border} ${config.bg} ${config.text} hover:opacity-80 transition-all`}
            >
              Set Up
            </button>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="w-5 h-5 text-zinc-600 mb-2" />
            <p className="text-[11px] text-zinc-500">No orders in this period</p>
          </div>
        ) : (
          <div className="space-y-0">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Recent Orders</p>
            {recentOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => order.link ? navigate(order.link) : onViewChannel()}
                className="w-full flex items-center justify-between py-2 px-1 rounded-lg hover:bg-zinc-800/30 transition-colors text-left group/order"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-200 truncate">{order.orderNumber}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{order.customer}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-bold text-white tabular-nums">{formatCurrency(order.total)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      {isConnected && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/30">
          <div className="flex items-center gap-2">
            {actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[12px] border border-zinc-800/40 bg-zinc-800/20 hover:bg-zinc-800/40 hover:border-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-all text-[11px] font-medium`}
                >
                  <ActionIcon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* B2B: Visit Store link */}
      {channelKey === 'b2b' && isConnected && storeUrl && (
        <div className="px-4 pb-4 -mt-2">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-2 rounded-[12px] border ${config.border} ${config.bg} ${config.text} hover:opacity-80 transition-all text-[11px] font-medium w-full`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit B2B Store
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel Status Card — shown in single-channel views
// ---------------------------------------------------------------------------

function ChannelStatusCard({ channel, data, config, formatCurrency, navigate, syncing, syncResult, onSync, periodLabel, payoutsData = [] }) {
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
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders</p>
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
          <div className="flex items-center gap-2">
            {data.connected && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Orders'}
              </button>
            )}
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
        </div>
        {syncResult && !syncResult.error && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-[12px] bg-blue-500/10 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-300">
              {syncResult.ordersSynced > 0
                ? `Synced ${syncResult.ordersSynced} new orders (${syncResult.itemsSynced} items). ${syncResult.alreadySynced || 0} already up to date.${syncResult.repaired ? ` Fixed ${syncResult.repaired} orders with missing prices.` : ''}`
                : `All ${syncResult.alreadySynced || syncResult.ordersFound || 0} orders already synced.${syncResult.repaired ? ` Fixed ${syncResult.repaired} orders with missing prices.` : ''}`}
            </span>
          </div>
        )}
        {syncResult?.error && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-[12px] bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">Sync failed: {syncResult.error}</span>
          </div>
        )}
        {data.connected ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-[14px] bg-zinc-800/30 border border-zinc-800/40">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders</p>
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

            {/* bol.com Payouts Summary */}
            {payoutsData.length > 0 && (() => {
              const totGross = payoutsData.reduce((s, p) => s + (parseFloat(String(p.gross_sales)) || 0), 0);
              const totComm = payoutsData.reduce((s, p) => s + (parseFloat(String(p.commissions)) || 0), 0);
              const totShip = payoutsData.reduce((s, p) => s + (parseFloat(String(p.shipping_costs)) || 0), 0);
              const totPick = payoutsData.reduce((s, p) => s + (parseFloat(String(p.pickpack_costs)) || 0), 0);
              const totStore = payoutsData.reduce((s, p) => s + (parseFloat(String(p.storage_costs)) || 0), 0);
              const totNet = payoutsData.reduce((s, p) => s + (parseFloat(String(p.net_payout)) || 0), 0);
              const commPct = totGross > 0 ? ((totComm / totGross) * 100).toFixed(1) : '0';
              return (
                <div className="mt-4 pt-4 border-t border-zinc-800/40">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      Payouts ({payoutsData.length} invoices)
                    </h4>
                    <button
                      onClick={() => navigate('/FinanceBolcomPayouts')}
                      className="text-[10px] text-blue-400 hover:opacity-80 flex items-center gap-1 font-medium"
                    >
                      View Details <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Payout KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <div className="p-3 rounded-[14px] bg-blue-500/5 border border-blue-500/15">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Gross Sales</p>
                      <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(totGross)}</p>
                    </div>
                    <div className="p-3 rounded-[14px] bg-blue-500/5 border border-blue-500/15">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Commissions</p>
                      <p className="text-lg font-bold text-blue-400 tabular-nums">{formatCurrency(totComm)}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{commPct}% of gross</p>
                    </div>
                    <div className="p-3 rounded-[14px] bg-blue-500/5 border border-blue-500/15">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Costs</p>
                      <p className="text-lg font-bold text-zinc-300 tabular-nums">{formatCurrency(totShip + totPick + totStore)}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Ship + Pick&Pack + Storage</p>
                    </div>
                    <div className="p-3 rounded-[14px] bg-blue-500/5 border border-blue-500/15">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Net Payout</p>
                      <p className="text-lg font-bold text-cyan-400 tabular-nums">{formatCurrency(totNet)}</p>
                    </div>
                  </div>
                  {/* Per-invoice rows */}
                  <div className="space-y-1.5">
                    {payoutsData.map((p) => {
                      const gross = parseFloat(String(p.gross_sales)) || 0;
                      const comm = parseFloat(String(p.commissions)) || 0;
                      const net = parseFloat(String(p.net_payout)) || 0;
                      const pStart = p.period_start ? new Date(p.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
                      const pEnd = p.period_end ? new Date(p.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-[12px] bg-zinc-800/20 hover:bg-zinc-800/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-200">Invoice {p.invoice_number}</p>
                            <p className="text-[10px] text-zinc-500">{pStart} - {pEnd}</p>
                          </div>
                          <div className="flex items-center gap-4 text-right shrink-0">
                            <div>
                              <p className="text-xs font-bold text-white tabular-nums">{formatCurrency(gross)}</p>
                              <p className="text-[10px] text-zinc-500">gross</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-blue-400 tabular-nums">-{formatCurrency(comm)}</p>
                              <p className="text-[10px] text-zinc-500">comm.</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-cyan-400 tabular-nums">{formatCurrency(net)}</p>
                              <p className="text-[10px] text-zinc-500">net</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
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
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders</p>
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
