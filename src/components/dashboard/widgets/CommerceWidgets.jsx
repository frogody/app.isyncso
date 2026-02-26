import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ShoppingCart, ShoppingBag, TrendingUp,
  Package, AlertCircle
} from 'lucide-react';
import { StatCard, GlassCard } from '@/components/ui/GlassCard';
import { AnimatedCurrency } from '@/components/ui/AnimatedNumber';
import { useTheme } from '@/contexts/GlobalThemeContext';

// Widget metadata for the apps manager
export const COMMERCE_WIDGETS = [
  { id: 'commerce_b2b_overview', name: 'B2B Sales Overview', description: 'B2B order revenue and status', size: 'large' },
  { id: 'commerce_orders', name: 'B2B Orders', description: 'Active order count', size: 'small' },
  { id: 'commerce_revenue', name: 'B2B Revenue', description: 'Total B2B sales', size: 'small' },
  { id: 'commerce_products', name: 'Product Catalog', description: 'Published product count', size: 'small' },
  { id: 'commerce_outstanding', name: 'Outstanding', description: 'Unpaid order amounts', size: 'small' },
];

export function CommerceBToBOverviewWidget({ orders = [], totalRevenue = 0, totalOutstanding = 0, productCount = 0 }) {
  const { t } = useTheme();
  const recentOrders = orders.slice(0, 4);

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'shipped' || s === 'delivered') return { dot: 'bg-cyan-400', text: 'text-cyan-400' };
    if (s === 'pending' || s === 'confirmed') return { dot: 'bg-amber-400', text: 'text-amber-400' };
    if (s === 'cancelled') return { dot: 'bg-red-400', text: 'text-red-400' };
    return { dot: 'bg-zinc-400', text: 'text-zinc-400' };
  };

  return (
    <GlassCard glow="cyan" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-base font-semibold flex items-center gap-2 ${t('text-zinc-900', 'text-white')}`}>
          <ShoppingCart className="w-5 h-5 text-cyan-400" />
          B2B Commerce
        </h2>
        <Link to={createPageUrl("InventoryShipping")} className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
          <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Revenue</p>
          <div className="text-lg font-bold text-cyan-400">
            <AnimatedCurrency value={totalRevenue} duration={1.0} />
          </div>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Outstanding</p>
          <div className="text-lg font-bold text-amber-400">
            <AnimatedCurrency value={totalOutstanding} duration={1.0} />
          </div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
          <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Products</p>
          <div className={`text-lg font-bold text-blue-400`}>
            {productCount.toLocaleString()}
          </div>
        </div>
      </div>

      {recentOrders.length > 0 ? (
        <div className="space-y-2">
          {recentOrders.map((order) => {
            const { dot, text } = getStatusColor(order.status);

            return (
              <div key={order.id} className={`flex items-center justify-between p-2.5 rounded-lg ${t('bg-zinc-100/60', 'bg-zinc-800/30')}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <span className={`text-sm truncate ${t('text-zinc-900', 'text-white')}`}>
                    {order.order_number || 'Order'}
                  </span>
                  <span className={`text-xs capitalize ${t('text-zinc-500', 'text-zinc-400')}`}>
                    {order.status || 'pending'}
                  </span>
                </div>
                <span className={`text-sm font-medium tabular-nums ${text}`}>
                  {'\u20AC'}{(order.total || 0).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-4 text-sm ${t('text-zinc-400', 'text-zinc-500')}`}>
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No orders yet
        </div>
      )}
    </GlassCard>
  );
}

export function CommerceOrdersWidget({ orderCount = 0, activeCount = 0 }) {
  return (
    <StatCard
      icon={ShoppingBag}
      label="B2B Orders"
      value={orderCount}
      change={null}
      trend={null}
      color="cyan"
    />
  );
}

export function CommerceRevenueWidget({ totalRevenue = 0 }) {
  return (
    <StatCard
      icon={TrendingUp}
      label="B2B Revenue"
      value={`\u20AC${(totalRevenue / 1000).toFixed(0)}k`}
      change={null}
      trend={null}
      color="cyan"
    />
  );
}

export function CommerceProductsWidget({ productCount = 0, draftCount = 0 }) {
  return (
    <StatCard
      icon={Package}
      label="Products"
      value={productCount}
      change={null}
      trend={null}
      color="blue"
    />
  );
}

export function CommerceOutstandingWidget({ outstandingAmount = 0, unpaidCount = 0 }) {
  return (
    <StatCard
      icon={AlertCircle}
      label="Outstanding"
      value={`\u20AC${(outstandingAmount / 1000).toFixed(0)}k`}
      change={null}
      trend={null}
      color="amber"
    />
  );
}
