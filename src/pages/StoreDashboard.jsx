/**
 * StoreDashboard - Unified store overview aggregating all sales channels.
 *
 * KPI cards: Total Orders, Revenue, Pending, Active Channels
 * Channel status cards: B2B, Shopify, bol.com, Manual
 * Recent orders: merged from sales_orders + b2b_orders
 * Quick actions: links to builder, orders, catalog
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { ORDER_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/components/b2b-admin/shared/b2bConstants';

// ---------------------------------------------------------------------------
// Shared sub-components
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

function KPICard({ icon: Icon, label, value, subtext, accentClass }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${accentClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{label}</p>
      </div>
      {subtext && <p className="text-xs text-zinc-500">{subtext}</p>}
    </div>
  );
}

function ChannelCard({ icon: Icon, name, connected, orderCount, revenue, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col gap-3 text-left hover:border-cyan-500/30 transition-colors w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-800/60">
            <Icon className="w-5 h-5 text-zinc-300" />
          </div>
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
        {connected ? (
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
        ) : (
          <XCircle className="w-4 h-4 text-zinc-600" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-lg font-semibold text-white">{orderCount}</p>
          <p className="text-xs text-zinc-500">Orders</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{revenue}</p>
          <p className="text-xs text-zinc-500">Revenue</p>
        </div>
      </div>
    </button>
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

  // KPI
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  // Channel info
  const [channels, setChannels] = useState({
    b2b: { connected: false, orders: 0, revenue: 0 },
    shopify: { connected: false, orders: 0, revenue: 0 },
    bolcom: { connected: false, orders: 0, revenue: 0 },
    manual: { connected: true, orders: 0, revenue: 0 },
  });

  // Recent orders (merged)
  const [recentOrders, setRecentOrders] = useState([]);

  const activeChannels = useMemo(
    () => Object.values(channels).filter((c) => c.connected).length,
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

      // Fire all queries in parallel
      const [
        // Channel detection
        shopifyCreds,
        bolcomCreds,
        b2bConfig,
        // Sales orders this month (all channels)
        salesMonthly,
        salesPending,
        salesRecent,
        // B2B orders this month
        b2bMonthly,
        b2bPending,
        b2bRecent,
      ] = await Promise.all([
        // Shopify connected?
        supabase
          .from('shopify_credentials')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle(),

        // bol.com connected?
        supabase
          .from('bolcom_credentials')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle(),

        // B2B store enabled?
        supabase
          .from('portal_settings')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('enable_wholesale', true)
          .maybeSingle(),

        // Sales orders this month (with source + total)
        supabase
          .from('sales_orders')
          .select('id, source, total')
          .eq('company_id', companyId)
          .gte('order_date', startOfMonth),

        // Sales orders pending
        supabase
          .from('sales_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'pending'),

        // Recent sales orders
        supabase
          .from('sales_orders')
          .select('id, order_number, source, status, total, order_date, customer:customers(id, name, email)')
          .eq('company_id', companyId)
          .order('order_date', { ascending: false })
          .limit(10),

        // B2B orders this month
        supabase
          .from('b2b_orders')
          .select('id, total')
          .eq('organization_id', organizationId)
          .gte('created_at', startOfMonth),

        // B2B pending
        supabase
          .from('b2b_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'pending'),

        // Recent B2B orders
        supabase
          .from('b2b_orders')
          .select('id, order_number, status, total, currency, created_at, portal_clients(id, full_name, email)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // --- Channel detection ---
      const shopifyConnected = !!shopifyCreds.data;
      const bolcomConnected = !!bolcomCreds.data;
      const b2bConnected = !!b2bConfig.data;

      // --- Aggregate sales orders by source ---
      const salesRows = salesMonthly.data || [];
      const sumBySource = (src) =>
        salesRows
          .filter((r) => r.source === src)
          .reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);
      const countBySource = (src) => salesRows.filter((r) => r.source === src).length;

      const shopifyRevenue = sumBySource('shopify');
      const shopifyCount = countBySource('shopify');
      const bolcomRevenue = sumBySource('bolcom');
      const bolcomCount = countBySource('bolcom');
      const manualRevenue = salesRows
        .filter((r) => !r.source || r.source === 'manual' || r.source === 'email' || r.source === 'api')
        .reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);
      const manualCount = salesRows.filter(
        (r) => !r.source || r.source === 'manual' || r.source === 'email' || r.source === 'api'
      ).length;

      const b2bRows = b2bMonthly.data || [];
      const b2bRevenue = b2bRows.reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);
      const b2bCount = b2bRows.length;

      setChannels({
        b2b: { connected: b2bConnected, orders: b2bCount, revenue: b2bRevenue },
        shopify: { connected: shopifyConnected, orders: shopifyCount, revenue: shopifyRevenue },
        bolcom: { connected: bolcomConnected, orders: bolcomCount, revenue: bolcomRevenue },
        manual: { connected: true, orders: manualCount, revenue: manualRevenue },
      });

      // --- KPIs ---
      const allOrdersCount = salesRows.length + b2bCount;
      const allRevenue = salesRows.reduce((s, r) => s + (parseFloat(String(r.total)) || 0), 0) + b2bRevenue;
      const allPending = (salesPending.count || 0) + (b2bPending.count || 0);

      setTotalOrders(allOrdersCount);
      setTotalRevenue(allRevenue);
      setPendingOrders(allPending);

      // --- Merge recent orders ---
      const salesFormatted = (salesRecent.data || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number || `#${o.id.slice(0, 8)}`,
        source: o.source || 'manual',
        customer: o.customer?.name || o.customer?.email || 'Unknown',
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

      const merged = [...salesFormatted, ...b2bFormatted]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

      setRecentOrders(merged);
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const quickActions = useMemo(
    () => [
      {
        label: 'Edit B2B Store',
        description: 'Customize your storefront',
        icon: LayoutDashboard,
        path: '/b2bstorebuilder',
      },
      {
        label: 'B2B Orders',
        description: 'Manage wholesale orders',
        icon: Package,
        path: '/b2b/orders',
      },
      {
        label: 'Price Lists',
        description: 'Manage client pricing',
        icon: Tag,
        path: '/b2b/price-lists',
      },
      {
        label: 'Product Catalog',
        description: 'Manage your products',
        icon: ShoppingBag,
        path: '/Products',
      },
    ],
    []
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-56 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Store Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Unified overview across all your sales channels
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={ShoppingCart}
            label="Orders This Month"
            value={totalOrders}
            accentClass="bg-cyan-500/10 text-cyan-400"
          />
          <KPICard
            icon={DollarSign}
            label="Revenue This Month"
            value={formatCurrency(totalRevenue)}
            accentClass="bg-emerald-500/10 text-emerald-400"
          />
          <KPICard
            icon={Clock}
            label="Pending Orders"
            value={pendingOrders}
            subtext={pendingOrders > 0 ? 'Require attention' : 'All clear'}
            accentClass="bg-amber-500/10 text-amber-400"
          />
          <KPICard
            icon={Radio}
            label="Active Channels"
            value={activeChannels}
            subtext={`of 4 channels`}
            accentClass="bg-blue-500/10 text-blue-400"
          />
        </div>

        {/* Channel Status Cards */}
        <div>
          <h2 className="text-base font-medium text-white mb-3">Sales Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ChannelCard
              icon={Store}
              name="B2B Wholesale"
              connected={channels.b2b.connected}
              orderCount={channels.b2b.orders}
              revenue={formatCurrency(channels.b2b.revenue)}
              onClick={() => navigate('/b2b/orders')}
            />
            <ChannelCard
              icon={ShoppingBag}
              name="Shopify"
              connected={channels.shopify.connected}
              orderCount={channels.shopify.orders}
              revenue={formatCurrency(channels.shopify.revenue)}
              onClick={() => navigate('/Settings?tab=integrations')}
            />
            <ChannelCard
              icon={Globe}
              name="bol.com"
              connected={channels.bolcom.connected}
              orderCount={channels.bolcom.orders}
              revenue={formatCurrency(channels.bolcom.revenue)}
              onClick={() => navigate('/Settings?tab=integrations')}
            />
            <ChannelCard
              icon={FileText}
              name="Manual / Other"
              connected={channels.manual.connected}
              orderCount={channels.manual.orders}
              revenue={formatCurrency(channels.manual.revenue)}
              onClick={() => navigate('/Warehouse')}
            />
          </div>
        </div>

        {/* Recent Orders + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-medium text-white">Recent Orders</h2>
            </div>

            {recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No orders yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Orders from all channels will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {recentOrders.map((order) => (
                  <div
                    key={`${order.source}-${order.id}`}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => order.link && navigate(order.link)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {order.orderNumber}
                          </p>
                          <SourceBadge source={order.source} />
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {order.customer} &middot; {formatDate(order.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(order.total)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-base font-medium text-white">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-3">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-cyan-500/20 transition-all text-left group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                      <ActionIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{action.label}</p>
                      <p className="text-xs text-zinc-500">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
