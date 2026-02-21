/**
 * B2BOrdersManager - Admin order management for B2B wholesale.
 *
 * Filterable: status tabs (all/pending/confirmed/shipped/delivered/cancelled), date range, client search
 * Table: Order #, Client, Date, Items, Total, Status badge, Actions
 * Actions: View, Approve (pending), Reject (pending)
 * Pagination (20 per page)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  Package,
  Search,
  AlertCircle,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShoppingCart,
  Filter,
  Calendar,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const ITEMS_PER_PAGE = 20;

function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function B2BOrdersManager() {
  const navigate = useNavigate();
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  // Action loading
  const [actionLoading, setActionLoading] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('b2b_orders')
        .select(
          `
          id,
          order_number,
          status,
          total,
          currency,
          created_at,
          client_id,
          portal_clients (id, name, email, company_name),
          b2b_order_items (id)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Status filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      // Date filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      // Pagination
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error: fetchErr, count } = await query;
      if (fetchErr) throw fetchErr;

      let filteredData = data || [];

      // Client search (done client-side since portal_clients is a join)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredData = filteredData.filter((order) => {
          const clientName = (order.portal_clients?.name || '').toLowerCase();
          const clientEmail = (order.portal_clients?.email || '').toLowerCase();
          const clientCompany = (order.portal_clients?.company_name || '').toLowerCase();
          const orderNum = (order.order_number || '').toLowerCase();
          return (
            clientName.includes(q) ||
            clientEmail.includes(q) ||
            clientCompany.includes(q) ||
            orderNum.includes(q)
          );
        });
      }

      setOrders(filteredData);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[B2BOrdersManager] fetch error:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [organizationId, activeTab, searchQuery, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery, dateFrom, dateTo]);

  const handleApprove = async (orderId) => {
    setActionLoading(orderId);
    try {
      const { error: upErr } = await supabase
        .from('b2b_orders')
        .update({
          status: 'confirmed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (upErr) throw upErr;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'confirmed' } : o
        )
      );
    } catch (err) {
      console.error('[B2BOrdersManager] approve error:', err);
      setError(err.message || 'Failed to approve order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId) => {
    if (!confirm('Reject this order? This will cancel the order.')) return;
    setActionLoading(orderId);

    try {
      const { error: upErr } = await supabase
        .from('b2b_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (upErr) throw upErr;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'cancelled' } : o
        )
      );
    } catch (err) {
      console.error('[B2BOrdersManager] reject error:', err);
      setError(err.message || 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // Count badges for tabs
  const tabCounts = useMemo(() => {
    // Only count if we have loaded data; show from totalCount on server
    return {};
  }, []);

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-12 bg-zinc-800/60 rounded-xl animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/60 rounded-xl border border-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white">B2B Orders</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and process wholesale orders from your clients
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by order #, client name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                className="pl-9 pr-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <span className="text-zinc-600">-</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                className="pl-9 pr-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Orders table */}
        {orders.length === 0 && !loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-16 text-center">
            <ShoppingCart className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">
              {activeTab !== 'all'
                ? `No ${activeTab} orders found`
                : 'No orders found'}
            </p>
            {searchQuery && (
              <p className="text-xs text-zinc-600 mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-2">Order #</div>
              <div className="col-span-3">Client</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-center">Items</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-zinc-800">
              {orders.map((order) => {
                const itemCount = order.b2b_order_items?.length || 0;
                const isPending = order.status === 'pending';
                const isActioning = actionLoading === order.id;

                return (
                  <div
                    key={order.id}
                    className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {order.order_number || `#${order.id.slice(0, 8)}`}
                      </p>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-white truncate">
                        {order.portal_clients?.name ||
                          order.portal_clients?.company_name ||
                          'Unknown'}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {order.portal_clients?.email || ''}
                      </p>
                    </div>
                    <div className="col-span-2 text-sm text-zinc-400">
                      {formatDate(order.created_at)}
                    </div>
                    <div className="col-span-1 text-center text-sm text-zinc-400">
                      {itemCount}
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium text-white">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="col-span-1 text-center">
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/b2b/orders/${order.id}`)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(order.id)}
                            disabled={isActioning}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            title="Approve order"
                          >
                            {isActioning ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            disabled={isActioning}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Reject order"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Showing {page * ITEMS_PER_PAGE + 1}-
                  {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of{' '}
                  {totalCount} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-zinc-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading overlay for refetch */}
        {loading && orders.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm text-zinc-300">Refreshing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
