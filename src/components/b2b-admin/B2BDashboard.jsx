/**
 * B2BDashboard - Admin overview dashboard for B2B wholesale operations.
 *
 * KPI cards: Orders This Month, Revenue This Month, Pending Orders, Active Clients
 * Recent orders list (last 5) with status badges
 * Quick action links: Go to Builder, Manage Orders, Price Lists
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  Users,
  ArrowRight,
  Package,
  Tag,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

import { ORDER_STATUS_COLORS, DEFAULT_STATUS_COLOR } from './shared/b2bConstants';

function StatusBadge({ status }) {
  const colorClass = ORDER_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
      {subtext && (
        <p className="text-xs text-zinc-500">{subtext}</p>
      )}
    </div>
  );
}

export default function B2BDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [stats, setStats] = useState({
    ordersThisMonth: 0,
    revenueThisMonth: 0,
    pendingOrders: 0,
    activeClients: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        monthlyOrdersRes,
        pendingRes,
        revenueRes,
        clientsRes,
        recentRes,
      ] = await Promise.all([
        // Orders this month
        supabase
          .from('b2b_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('created_at', startOfMonth),

        // Pending orders
        supabase
          .from('b2b_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'pending'),

        // Revenue this month
        supabase
          .from('b2b_orders')
          .select('total')
          .eq('organization_id', organizationId)
          .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
          .gte('created_at', startOfMonth),

        // Active clients (distinct client_ids with orders)
        supabase
          .from('b2b_orders')
          .select('client_id')
          .eq('organization_id', organizationId),

        // Recent 5 orders
        supabase
          .from('b2b_orders')
          .select(`
            id,
            order_number,
            status,
            total,
            currency,
            created_at,
            portal_clients (id, name, email)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce(
        (sum, o) => sum + (parseFloat(String(o.total)) || 0),
        0
      );
      const uniqueClients = new Set(
        (clientsRes.data || []).map((o) => o.client_id)
      ).size;

      setStats({
        ordersThisMonth: monthlyOrdersRes.count || 0,
        revenueThisMonth: totalRevenue,
        pendingOrders: pendingRes.count || 0,
        activeClients: uniqueClients,
      });

      setRecentOrders(recentRes.data || []);
    } catch (err) {
      console.error('[B2BDashboard] fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const quickActions = useMemo(
    () => [
      {
        label: 'Store Builder',
        description: 'Customize your B2B storefront',
        icon: LayoutDashboard,
        path: '/b2bstorebuilder',
      },
      {
        label: 'Manage Orders',
        description: 'View and process all orders',
        icon: Package,
        path: '/b2b/orders',
      },
      {
        label: 'Price Lists',
        description: 'Manage pricing for your clients',
        icon: Tag,
        path: '/b2b/price-lists',
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
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
            <h1 className="text-2xl font-semibold text-white">B2B Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Overview of your wholesale operations
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
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
            value={stats.ordersThisMonth}
            accentClass="bg-cyan-500/10 text-cyan-400"
          />
          <KPICard
            icon={DollarSign}
            label="Revenue This Month"
            value={formatCurrency(stats.revenueThisMonth)}
            accentClass="bg-emerald-500/10 text-emerald-400"
          />
          <KPICard
            icon={Clock}
            label="Pending Orders"
            value={stats.pendingOrders}
            subtext={stats.pendingOrders > 0 ? 'Require attention' : 'All clear'}
            accentClass="bg-amber-500/10 text-amber-400"
          />
          <KPICard
            icon={Users}
            label="Active Clients"
            value={stats.activeClients}
            accentClass="bg-blue-500/10 text-blue-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-medium text-white">Recent Orders</h2>
              <button
                onClick={() => navigate('/b2b/orders')}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No orders yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Orders from your B2B portal will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/b2b/orders/${order.id}`)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {order.portal_clients?.name || 'Unknown client'} &middot;{' '}
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(order.total || 0)}
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
