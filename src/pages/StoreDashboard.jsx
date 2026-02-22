/**
 * StoreDashboard - Premium unified store overview.
 * Matches Sentinel design language: motion animations, gradient hero,
 * glass cards, full-width layout, animated bar charts.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

import { ORDER_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/components/b2b-admin/shared/b2bConstants';

// ---------------------------------------------------------------------------
// Motion presets
// ---------------------------------------------------------------------------

const SLIDE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = (delay = 0) => ({
  ...SLIDE_UP,
  transition: { ...SLIDE_UP.transition, delay },
});

// ---------------------------------------------------------------------------
// Sub-components — premium design
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const colorClass = ORDER_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
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

function StatCard({ icon: Icon, label, value, subtext, accentColor = 'cyan', delay = 0 }) {
  const accents = {
    cyan: 'bg-cyan-400/10 text-cyan-400',
    emerald: 'bg-emerald-400/10 text-emerald-400',
    amber: 'bg-amber-400/10 text-amber-400',
    blue: 'bg-blue-400/10 text-blue-400',
  };
  return (
    <motion.div
      {...stagger(delay)}
      className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-zinc-700/60 transition-colors"
    >
      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${accents[accentColor]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{label}</p>
      </div>
      {subtext && <p className="text-xs text-zinc-500">{subtext}</p>}
    </motion.div>
  );
}

function ChannelBar({ icon: Icon, name, connected, orderCount, revenue, maxOrders, onClick, delay = 0 }) {
  const pct = maxOrders > 0 ? (orderCount / maxOrders) * 100 : 0;
  return (
    <motion.button
      {...stagger(delay)}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm hover:border-cyan-500/20 transition-all group text-left"
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
            className="h-full rounded-full bg-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: delay + 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.button>
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const companyId = user?.company_id;
  const organizationId = user?.organization_id || user?.company_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  const [channels, setChannels] = useState({
    b2b: { connected: false, orders: 0, revenue: 0 },
    shopify: { connected: false, orders: 0, revenue: 0 },
    bolcom: { connected: false, orders: 0, revenue: 0 },
    manual: { connected: true, orders: 0, revenue: 0 },
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [storeUrl, setStoreUrl] = useState(null);

  const activeChannels = useMemo(
    () => Object.values(channels).filter((c) => c.connected).length,
    [channels]
  );

  const maxChannelOrders = useMemo(
    () => Math.max(...Object.values(channels).map((c) => c.orders), 1),
    [channels]
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

      // Wrap each query so a 400/404 on a missing table doesn't crash everything
      const safe = (promise) => promise.then((r) => r).catch(() => ({ data: null, count: 0, error: null }));

      const [
        shopifyCreds, bolcomCreds, b2bConfig,
        salesMonthly, salesPending, salesRecent,
        b2bMonthly, b2bPending, b2bRecent,
      ] = await Promise.all([
        safe(supabase.from('shopify_credentials').select('id').eq('company_id', companyId).eq('is_active', true).maybeSingle()),
        safe(supabase.from('bolcom_credentials').select('id').eq('company_id', companyId).eq('is_active', true).maybeSingle()),
        safe(supabase.from('portal_settings').select('id').eq('organization_id', organizationId).eq('enable_wholesale', true).maybeSingle()),
        safe(supabase.from('sales_orders').select('id, source, total').eq('company_id', companyId).gte('order_date', startOfMonth)),
        safe(supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending')),
        safe(supabase.from('sales_orders').select('id, order_number, source, status, total, order_date').eq('company_id', companyId).order('order_date', { ascending: false }).limit(10)),
        safe(supabase.from('b2b_orders').select('id, total').eq('organization_id', organizationId).gte('created_at', startOfMonth)),
        safe(supabase.from('b2b_orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'pending')),
        safe(supabase.from('b2b_orders').select('id, order_number, status, total, currency, created_at, portal_clients(id, full_name, email)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(10)),
      ]);

      const shopifyConnected = !!shopifyCreds.data;
      const bolcomConnected = !!bolcomCreds.data;
      const b2bConnected = !!b2bConfig.data;

      const salesRows = salesMonthly.data || [];
      const sumBySource = (src) => salesRows.filter((r) => r.source === src).reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);
      const countBySource = (src) => salesRows.filter((r) => r.source === src).length;

      const manualRevenue = salesRows.filter((r) => !r.source || r.source === 'manual' || r.source === 'email' || r.source === 'api').reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);
      const manualCount = salesRows.filter((r) => !r.source || r.source === 'manual' || r.source === 'email' || r.source === 'api').length;

      const b2bRows = b2bMonthly.data || [];
      const b2bRevenue = b2bRows.reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);
      const b2bCount = b2bRows.length;

      setChannels({
        b2b: { connected: b2bConnected, orders: b2bCount, revenue: b2bRevenue },
        shopify: { connected: shopifyConnected, orders: countBySource('shopify'), revenue: sumBySource('shopify') },
        bolcom: { connected: bolcomConnected, orders: countBySource('bolcom'), revenue: sumBySource('bolcom') },
        manual: { connected: true, orders: manualCount, revenue: manualRevenue },
      });

      const allOrdersCount = salesRows.length + b2bCount;
      const allRevenue = salesRows.reduce((s, r) => s + (parseFloat(String(r.total)) || 0), 0) + b2bRevenue;
      const allPending = (salesPending.count || 0) + (b2bPending.count || 0);

      setTotalOrders(allOrdersCount);
      setTotalRevenue(allRevenue);
      setPendingOrders(allPending);

      const salesFormatted = (salesRecent.data || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number || `#${String(o.id).slice(0, 8)}`,
        source: o.source || 'manual',
        customer: 'Customer',
        date: o.order_date,
        total: parseFloat(String(o.total)) || 0,
        status: o.status || 'pending',
        link: null,
      }));

      const b2bFormatted = (b2bRecent.data || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number || `#${o.id.slice(0, 8)}`,
        source: 'b2b',
        customer: o.portal_clients?.full_name || o.portal_clients?.email || 'B2B Client',
        date: o.created_at,
        total: parseFloat(String(o.total)) || 0,
        status: o.status || 'pending',
        link: `/b2b/orders/${o.id}`,
      }));

      setRecentOrders(
        [...salesFormatted, ...b2bFormatted].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
      );
    } catch (err) {
      console.error('[StoreDashboard] fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [companyId, organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('portal_settings')
      .select('store_subdomain, custom_domain')
      .eq('organization_id', organizationId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.custom_domain) setStoreUrl(`https://${data.custom_domain}`);
        else if (data?.store_subdomain) setStoreUrl(`https://${data.store_subdomain}.syncstore.business`);
      });
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const quickActions = useMemo(() => [
    { label: 'Edit B2B Store', description: 'Customize your storefront', icon: LayoutDashboard, path: '/b2bstorebuilder' },
    { label: 'B2B Orders', description: 'Manage wholesale orders', icon: Package, path: '/b2b/orders' },
    { label: 'Price Lists', description: 'Manage client pricing', icon: Tag, path: '/b2b/price-lists' },
    { label: 'Product Catalog', description: 'Manage your products', icon: ShoppingBag, path: '/Products' },
    { label: 'Client Chat', description: 'Customer messages', icon: MessageSquare, path: '/b2b/chat' },
    { label: 'Store Access', description: 'Control who can access your store', icon: Users, path: '/b2b/clients' },
  ], []);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <div className="h-10 w-64 bg-zinc-800/50 rounded-[20px] animate-pulse" />
          <div className="rounded-[20px] bg-zinc-900/30 border border-zinc-800/40 h-44 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
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

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <motion.div {...stagger(0)} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] flex items-center justify-center bg-cyan-400/10">
              <Store className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Store Dashboard</h1>
              <p className="text-xs text-zinc-500">Unified overview across all sales channels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {storeUrl && (
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

        {/* Error */}
        {error && (
          <motion.div {...stagger(0.1)} className="flex items-center gap-3 p-4 rounded-[16px] border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Hero Card — gradient + KPIs */}
        <motion.div {...stagger(0.1)}>
          <GlassCard padding="none" className="overflow-hidden bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent">
            <div className="flex flex-col lg:flex-row items-stretch">
              {/* Revenue highlight */}
              <div className="flex-shrink-0 p-6 lg:p-8 flex flex-col justify-center lg:w-72 lg:border-r border-zinc-800/40">
                <div className="w-14 h-14 rounded-[20px] bg-cyan-400/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-7 h-7 text-cyan-400" />
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-zinc-400 mt-1">Total Revenue This Month</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-medium">{totalOrders} orders across {activeChannels} channels</span>
                </div>
              </div>

              {/* Stat cards grid */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800/20">
                {[
                  { icon: ShoppingCart, label: 'Orders', value: totalOrders, accent: 'cyan' },
                  { icon: DollarSign, label: 'Revenue', value: formatCurrency(totalRevenue), accent: 'emerald' },
                  { icon: Clock, label: 'Pending', value: pendingOrders, accent: 'amber', sub: pendingOrders > 0 ? 'Require attention' : 'All clear' },
                  { icon: Radio, label: 'Channels', value: `${activeChannels}/4`, accent: 'blue', sub: 'Connected' },
                ].map((stat, i) => (
                  <div key={stat.label} className="bg-zinc-900/40 p-5 flex flex-col justify-center">
                    <motion.div {...stagger(0.15 + i * 0.05)}>
                      <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center mb-3 ${
                        stat.accent === 'cyan' ? 'bg-cyan-400/10 text-cyan-400' :
                        stat.accent === 'emerald' ? 'bg-emerald-400/10 text-emerald-400' :
                        stat.accent === 'amber' ? 'bg-amber-400/10 text-amber-400' :
                        'bg-blue-400/10 text-blue-400'
                      }`}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
                      {stat.sub && <p className="text-[10px] text-zinc-600 mt-1">{stat.sub}</p>}
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Sales Channels — bar chart style */}
        <motion.div {...stagger(0.3)}>
          <GlassCard padding="md">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-cyan-400" />
              Sales Channels
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChannelBar icon={Store} name="B2B Wholesale" connected={channels.b2b.connected} orderCount={channels.b2b.orders} revenue={formatCurrency(channels.b2b.revenue)} maxOrders={maxChannelOrders} onClick={() => navigate('/b2b/orders')} delay={0.35} />
              <ChannelBar icon={ShoppingBag} name="Shopify" connected={channels.shopify.connected} orderCount={channels.shopify.orders} revenue={formatCurrency(channels.shopify.revenue)} maxOrders={maxChannelOrders} onClick={() => navigate('/Settings?tab=integrations')} delay={0.4} />
              <ChannelBar icon={Globe} name="bol.com" connected={channels.bolcom.connected} orderCount={channels.bolcom.orders} revenue={formatCurrency(channels.bolcom.revenue)} maxOrders={maxChannelOrders} onClick={() => navigate('/Settings?tab=integrations')} delay={0.45} />
              <ChannelBar icon={FileText} name="Manual / Other" connected={channels.manual.connected} orderCount={channels.manual.orders} revenue={formatCurrency(channels.manual.revenue)} maxOrders={maxChannelOrders} onClick={() => navigate('/Warehouse')} delay={0.5} />
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Orders + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <motion.div {...stagger(0.5)} className="lg:col-span-2">
            <GlassCard padding="none" className="overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-zinc-800/40 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  Recent Orders
                </h3>
                {recentOrders.length > 0 && (
                  <button
                    onClick={() => navigate('/b2b/orders')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {recentOrders.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="w-12 h-12 rounded-[20px] bg-zinc-800/40 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">No orders yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Orders from all channels will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/30">
                  {recentOrders.map((order, i) => (
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
              )}
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div {...stagger(0.55)}>
            <GlassCard padding="none" className="overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-zinc-800/40">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-3 space-y-2">
                {quickActions.map((action, i) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.button
                      key={action.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.04 }}
                      onClick={() => navigate(action.path)}
                      className="w-full flex items-center gap-3.5 p-3 rounded-[14px] border border-zinc-800/40 bg-zinc-800/20 hover:bg-zinc-800/40 hover:border-cyan-500/20 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-[12px] bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors flex items-center justify-center flex-shrink-0">
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{action.label}</p>
                        <p className="text-[11px] text-zinc-500">{action.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
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
