/**
 * ProductSalesAnalytics - Product-level sales breakdown with period & channel filters.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Hash,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  RefreshCw,
  Globe,
  Store,
  ShoppingBag,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

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
// Shared components
// ---------------------------------------------------------------------------

function GlassCard({ children, className = '', padding = 'md' }) {
  const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div className={`rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm ${pad[padding]} ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, delay = 0, color = 'text-cyan-400' }) {
  return (
    <motion.div {...stagger(delay)}>
      <GlassCard className="flex flex-col gap-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/10 ${color} mb-1`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
        <span className="text-xs text-zinc-400">{label}</span>
        {sub && <span className="text-[11px] text-zinc-500">{sub}</span>}
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERIODS = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
];

const CHANNELS = [
  { key: 'all', label: 'All Channels', icon: Layers },
  { key: 'bolcom', label: 'bol.com', icon: Globe },
  { key: 'shopify', label: 'Shopify', icon: ShoppingBag },
  { key: 'b2b', label: 'B2B', icon: Store },
];

function periodStart(period) {
  const now = Date.now();
  if (period === '7d') return new Date(now - 7 * 86400000).toISOString();
  if (period === '30d') return new Date(now - 30 * 86400000).toISOString();
  if (period === '90d') return new Date(now - 90 * 86400000).toISOString();
  return new Date('2020-01-01').toISOString();
}

function periodLabel(period) {
  if (period === '7d') return 'Last 7 Days';
  if (period === '30d') return 'Last 30 Days';
  if (period === '90d') return 'Last 90 Days';
  return 'All Time';
}

const fmt = (v) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v || 0);
const fmtNum = (v) => new Intl.NumberFormat('nl-NL').format(v || 0);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProductSalesAnalytics() {
  const navigate = useNavigate();
  const { user } = useUser();
  const companyId = user?.company_id;

  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('revenue');
  const [sortDir, setSortDir] = useState('desc');

  // ---- Data fetching ----

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const start = periodStart(selectedPeriod);

      // Fetch order items joined with order metadata
      const { data: items, error } = await supabase
        .from('sales_order_items')
        .select(`
          product_id, quantity, unit_price, line_total, ean, description,
          sales_orders!inner( id, order_date, source, status, company_id )
        `)
        .eq('sales_orders.company_id', companyId)
        .gte('sales_orders.order_date', start)
        .neq('sales_orders.status', 'cancelled');

      if (error) throw error;
      setRawItems(items || []);

      // Fetch product details for linked items
      const productIds = [...new Set((items || []).map(i => i.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, featured_image, ean, sku')
          .in('id', productIds);
        const map = {};
        (prods || []).forEach(p => { map[p.id] = p; });
        setProductsMap(map);
      } else {
        setProductsMap({});
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Aggregation ----

  const aggregated = useMemo(() => {
    // Filter by channel
    const filtered = selectedChannel === 'all'
      ? rawItems
      : rawItems.filter(i => i.sales_orders?.source === selectedChannel);

    // Group by product_id (or ean for unlinked)
    const map = {};
    const orderIds = new Set();
    filtered.forEach(item => {
      const key = item.product_id || `ean:${item.ean || 'unknown'}`;
      if (!map[key]) {
        map[key] = {
          key,
          product_id: item.product_id,
          ean: item.ean,
          description: item.description,
          totalQty: 0,
          totalRevenue: 0,
          orderIds: new Set(),
        };
      }
      map[key].totalQty += item.quantity || 0;
      map[key].totalRevenue += parseFloat(item.line_total) || (item.quantity * item.unit_price) || 0;
      map[key].orderIds.add(item.sales_orders?.id);
      orderIds.add(item.sales_orders?.id);
    });

    const rows = Object.values(map).map(r => ({
      ...r,
      orderCount: r.orderIds.size,
      avgPrice: r.totalQty > 0 ? r.totalRevenue / r.totalQty : 0,
    }));

    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalUnits = rows.reduce((s, r) => s + r.totalQty, 0);
    const productCount = rows.length;
    const orderCount = orderIds.size;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return { rows, totalRevenue, totalUnits, productCount, orderCount, avgOrderValue };
  }, [rawItems, selectedChannel]);

  // ---- Search + Sort ----

  const displayRows = useMemo(() => {
    let rows = aggregated.rows;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => {
        const prod = productsMap[r.product_id];
        const name = prod?.name || r.description || '';
        const ean = prod?.ean || r.ean || '';
        const sku = prod?.sku || '';
        return name.toLowerCase().includes(q) || ean.toLowerCase().includes(q) || sku.toLowerCase().includes(q);
      });
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const pa = productsMap[a.product_id];
      const pb = productsMap[b.product_id];
      if (sortKey === 'name') {
        const na = pa?.name || a.description || '';
        const nb = pb?.name || b.description || '';
        return dir * na.localeCompare(nb);
      }
      if (sortKey === 'units') return dir * (a.totalQty - b.totalQty);
      if (sortKey === 'revenue') return dir * (a.totalRevenue - b.totalRevenue);
      if (sortKey === 'orders') return dir * (a.orderCount - b.orderCount);
      if (sortKey === 'avgPrice') return dir * (a.avgPrice - b.avgPrice);
      return 0;
    });

    return rows;
  }, [aggregated.rows, searchQuery, sortKey, sortDir, productsMap]);

  // Top 5 by revenue
  const top5 = useMemo(() => {
    return [...aggregated.rows]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [aggregated.rows]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-zinc-600" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-cyan-400" />
      : <ArrowDown className="w-3 h-3 text-cyan-400" />;
  };

  // ---- Render ----

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
      <div className="w-full space-y-4">

        {/* Header */}
        <motion.div {...stagger(0)}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <button
                onClick={() => navigate('/storedashboard')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors mb-1"
              >
                <ArrowLeft className="w-3 h-3" /> Store Dashboard
              </button>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Sales Analytics
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">Product sales & revenue — {periodLabel(selectedPeriod)}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Period pills */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-zinc-900/60 border border-zinc-800/40">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSelectedPeriod(p.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                      selectedPeriod === p.key
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-xl border border-zinc-800/40 bg-zinc-900/40 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Channel filter */}
        <motion.div {...stagger(0.05)} className="flex items-center gap-2 flex-wrap">
          {CHANNELS.map(ch => {
            const ChIcon = ch.icon;
            return (
              <button
                key={ch.key}
                onClick={() => setSelectedChannel(ch.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  selectedChannel === ch.key
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800/40 hover:text-zinc-300 hover:border-zinc-700/60'
                }`}
              >
                <ChIcon className="w-3.5 h-3.5" />
                {ch.label}
              </button>
            );
          })}
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Total Revenue" value={fmt(aggregated.totalRevenue)} delay={0.1} />
          <StatCard icon={Package} label="Units Sold" value={fmtNum(aggregated.totalUnits)} delay={0.15} />
          <StatCard icon={Hash} label="Products Sold" value={fmtNum(aggregated.productCount)} delay={0.2} />
          <StatCard icon={ShoppingCart} label="Avg. Order Value" value={fmt(aggregated.avgOrderValue)} delay={0.25} />
        </div>

        {/* Main content: table + top 5 sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Table */}
          <motion.div {...stagger(0.3)} className="lg:col-span-3">
            <GlassCard padding="none">
              {/* Search bar */}
              <div className="px-5 py-3 border-b border-zinc-800/40 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by product name, EAN, or SKU..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-800/30 border border-zinc-800/40 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30"
                  />
                </div>
                <span className="text-xs text-zinc-500 shrink-0">
                  {fmtNum(displayRows.length)} products
                </span>
              </div>

              {/* Table header */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800/30">
                      <th className="text-left px-5 py-3 font-medium">
                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                          Product <SortIcon col="name" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 font-medium">EAN</th>
                      <th className="text-right px-3 py-3 font-medium">
                        <button onClick={() => toggleSort('units')} className="flex items-center gap-1 justify-end hover:text-zinc-300 transition-colors ml-auto">
                          Units <SortIcon col="units" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-3 font-medium">
                        <button onClick={() => toggleSort('revenue')} className="flex items-center gap-1 justify-end hover:text-zinc-300 transition-colors ml-auto">
                          Revenue <SortIcon col="revenue" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-3 font-medium">
                        <button onClick={() => toggleSort('orders')} className="flex items-center gap-1 justify-end hover:text-zinc-300 transition-colors ml-auto">
                          Orders <SortIcon col="orders" />
                        </button>
                      </th>
                      <th className="text-right px-5 py-3 font-medium">
                        <button onClick={() => toggleSort('avgPrice')} className="flex items-center gap-1 justify-end hover:text-zinc-300 transition-colors ml-auto">
                          Avg. Price <SortIcon col="avgPrice" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-zinc-800/20">
                          <td className="px-5 py-3"><div className="h-4 bg-zinc-800/40 rounded animate-pulse w-40" /></td>
                          <td className="px-3 py-3"><div className="h-4 bg-zinc-800/40 rounded animate-pulse w-28" /></td>
                          <td className="px-3 py-3"><div className="h-4 bg-zinc-800/40 rounded animate-pulse w-12 ml-auto" /></td>
                          <td className="px-3 py-3"><div className="h-4 bg-zinc-800/40 rounded animate-pulse w-16 ml-auto" /></td>
                          <td className="px-3 py-3"><div className="h-4 bg-zinc-800/40 rounded animate-pulse w-10 ml-auto" /></td>
                          <td className="px-5 py-3"><div className="h-4 bg-zinc-800/40 rounded animate-pulse w-14 ml-auto" /></td>
                        </tr>
                      ))
                    ) : displayRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 text-sm">
                          No product sales found for this period.
                        </td>
                      </tr>
                    ) : (
                      displayRows.map((row, i) => {
                        const prod = productsMap[row.product_id];
                        const name = prod?.name || row.description || row.ean || 'Unknown Product';
                        const ean = prod?.ean || row.ean || '—';
                        const img = prod?.featured_image?.url || (typeof prod?.featured_image === 'string' ? prod.featured_image : null);
                        return (
                          <motion.tr
                            key={row.key}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => row.product_id && navigate(`/ProductDetail?id=${row.product_id}`)}
                            className={`border-b border-zinc-800/20 ${row.product_id ? 'cursor-pointer hover:bg-zinc-800/20' : ''} transition-colors`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {img ? (
                                  <img src={img} alt="" className="w-8 h-8 rounded-lg object-cover bg-zinc-800 flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center flex-shrink-0">
                                    <ImageIcon className="w-3.5 h-3.5 text-zinc-600" />
                                  </div>
                                )}
                                <span className="text-white font-medium truncate max-w-[200px] lg:max-w-[300px]">{name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-zinc-400 font-mono text-xs">{ean}</td>
                            <td className="px-3 py-3 text-right text-white tabular-nums">{fmtNum(row.totalQty)}</td>
                            <td className="px-3 py-3 text-right text-white font-medium tabular-nums">{fmt(row.totalRevenue)}</td>
                            <td className="px-3 py-3 text-right text-zinc-400 tabular-nums">{row.orderCount}</td>
                            <td className="px-5 py-3 text-right text-zinc-400 tabular-nums">{fmt(row.avgPrice)}</td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          {/* Top 5 sidebar */}
          <motion.div {...stagger(0.35)}>
            <GlassCard padding="none" className="h-fit">
              <div className="px-5 py-4 border-b border-zinc-800/40">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Top Products
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-3.5 bg-zinc-800/40 rounded animate-pulse w-32" />
                      <div className="h-2 bg-zinc-800/40 rounded animate-pulse" />
                    </div>
                  ))
                ) : top5.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">No data yet</p>
                ) : (
                  top5.map((row, i) => {
                    const prod = productsMap[row.product_id];
                    const name = prod?.name || row.description || row.ean || 'Unknown';
                    const maxRevenue = top5[0]?.totalRevenue || 1;
                    const pct = (row.totalRevenue / maxRevenue) * 100;
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white truncate max-w-[140px] flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold w-4">#{i + 1}</span>
                            {name}
                          </span>
                          <span className="text-xs text-cyan-400 font-medium tabular-nums">{fmt(row.totalRevenue)}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800/40 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500">{fmtNum(row.totalQty)} units &middot; {row.orderCount} orders</span>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
