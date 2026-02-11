import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Euro, CreditCard, Receipt,
  PieChart, BadgeEuro
} from 'lucide-react';
import { StatCard, GlassCard } from '@/components/ui/GlassCard';
import { AnimatedCurrency } from '@/components/ui/AnimatedNumber';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { AreaChart, Area, XAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Widget metadata for the apps manager
export const FINANCE_WIDGETS = [
  { id: 'finance_overview', name: 'Financial Overview', description: 'Revenue vs expenses summary', size: 'large' },
  { id: 'finance_revenue', name: 'Total Revenue', description: 'Revenue from paid invoices', size: 'small' },
  { id: 'finance_expenses', name: 'Total Expenses', description: 'Sum of all expenses', size: 'small' },
  { id: 'finance_pending', name: 'Pending Invoices', description: 'Outstanding invoice amounts', size: 'small' },
  { id: 'finance_mrr', name: 'Monthly Recurring', description: 'Active subscription revenue', size: 'small' }
];

function generateTrendData(revenue, expenses) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, i) => {
    const revVariance = 0.8 + (Math.sin(i * 1.2) * 0.2) + (i * 0.04);
    const expVariance = 0.85 + (Math.cos(i * 0.9) * 0.15) + (i * 0.03);
    return {
      month,
      revenue: Math.round(revenue * revVariance),
      expenses: Math.round(expenses * expVariance),
    };
  });
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#10b981',
  },
  expenses: {
    label: 'Expenses',
    color: '#ef4444',
  },
};

export function FinanceOverviewWidget({ revenue = 0, expenses = 0, invoices = [] }) {
  const { t } = useTheme();
  const profit = revenue - expenses;
  const recentInvoices = invoices.slice(0, 4);
  const trendData = useMemo(() => generateTrendData(revenue, expenses), [revenue, expenses]);

  return (
    <GlassCard glow="emerald" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-base font-semibold flex items-center gap-2 ${t('text-zinc-900', 'text-white')}`}>
          <PieChart className="w-5 h-5 text-emerald-400" />
          Financial Overview
        </h2>
        <Link to={createPageUrl("Finance")} className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Revenue</p>
          <div className="text-lg font-bold text-emerald-400">
            <AnimatedCurrency value={revenue} duration={1.0} />
          </div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
          <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Expenses</p>
          <div className="text-lg font-bold text-red-400">
            <AnimatedCurrency value={expenses} duration={1.0} />
          </div>
        </div>
        <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'} border`}>
          <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Profit</p>
          <div className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <AnimatedCurrency value={profit} duration={1.0} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <ChartContainer config={chartConfig} className="h-[140px] w-full [&_.recharts-cartesian-grid_line]:stroke-zinc-800/30">
          <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="finExpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" hide />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={false}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#finRevGrad)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: '#10b981' }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#finExpGrad)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: '#ef4444' }}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {recentInvoices.length > 0 ? (
        <div className="space-y-2">
          {recentInvoices.map((inv) => {
            const statusColor =
              inv.status === 'paid' ? 'bg-emerald-400' :
              inv.status === 'overdue' ? 'bg-red-400' :
              'bg-amber-400';

            const textColor =
              inv.status === 'paid' ? 'text-emerald-400' :
              inv.status === 'overdue' ? 'text-red-400' :
              'text-amber-400';

            return (
              <div key={inv.id} className={`flex items-center justify-between p-2.5 rounded-lg ${t('bg-zinc-100/60', 'bg-zinc-800/30')}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                  <span className={`text-sm truncate ${t('text-zinc-900', 'text-white')}`}>
                    {inv.client_name || 'Client'}
                  </span>
                </div>
                <span className={`text-sm font-medium tabular-nums ${textColor}`}>
                  {'\u20AC'}{(inv.total || 0).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-4 text-sm ${t('text-zinc-400', 'text-zinc-500')}`}>
          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No invoices yet
        </div>
      )}
    </GlassCard>
  );
}

export function FinanceRevenueWidget({ totalRevenue = 0, change = null }) {
  return (
    <StatCard
      icon={Euro}
      label="Total Revenue"
      value={`\u20AC${(totalRevenue / 1000).toFixed(0)}k`}
      change={change !== null ? `${Math.abs(change)}%` : null}
      trend={change >= 0 ? 'up' : 'down'}
      color="emerald"
    />
  );
}

export function FinanceExpensesWidget({ totalExpenses = 0, change = null }) {
  return (
    <StatCard
      icon={CreditCard}
      label="Total Expenses"
      value={`\u20AC${(totalExpenses / 1000).toFixed(0)}k`}
      change={change !== null ? `${Math.abs(change)}%` : null}
      trend={change <= 0 ? 'up' : 'down'}
      color="red"
    />
  );
}

export function FinancePendingWidget({ pendingAmount = 0, invoiceCount = 0 }) {
  return (
    <StatCard
      icon={Receipt}
      label="Pending"
      value={`\u20AC${(pendingAmount / 1000).toFixed(0)}k`}
      change={null}
      trend={null}
      color="amber"
    />
  );
}

export function FinanceMRRWidget({ mrr = 0, activeCount = 0 }) {
  return (
    <StatCard
      icon={BadgeEuro}
      label="Monthly Recurring"
      value={`\u20AC${mrr.toLocaleString()}`}
      change={null}
      trend={null}
      color="emerald"
    />
  );
}
