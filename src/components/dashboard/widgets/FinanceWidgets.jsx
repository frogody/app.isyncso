import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DollarSign, CreditCard, Receipt, TrendingUp,
  PieChart, ArrowUpRight, ArrowDownRight, CircleDollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/GlassCard';

// Widget metadata for the apps manager
export const FINANCE_WIDGETS = [
  {
    id: 'finance_overview',
    name: 'Financial Overview',
    description: 'Revenue vs expenses summary',
    size: 'large'
  },
  {
    id: 'finance_revenue',
    name: 'Total Revenue',
    description: 'Revenue from paid invoices',
    size: 'small'
  },
  {
    id: 'finance_expenses',
    name: 'Total Expenses',
    description: 'Sum of all expenses',
    size: 'small'
  },
  {
    id: 'finance_pending',
    name: 'Pending Invoices',
    description: 'Outstanding invoice amounts',
    size: 'small'
  },
  {
    id: 'finance_mrr',
    name: 'Monthly Recurring',
    description: 'Active subscription revenue',
    size: 'small'
  }
];

export function FinanceOverviewWidget({ revenue = 0, expenses = 0, invoices = [] }) {
  const profit = revenue - expenses;
  const recentInvoices = invoices.slice(0, 4);

  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-emerald-400" />
          Financial Overview
        </h2>
        <Link to={createPageUrl("Finance")} className="text-emerald-400 text-sm hover:text-emerald-300">View all</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-zinc-400">Revenue</p>
          <p className="text-lg font-bold text-emerald-400">${(revenue / 1000).toFixed(0)}k</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-zinc-400">Expenses</p>
          <p className="text-lg font-bold text-red-400">${(expenses / 1000).toFixed(0)}k</p>
        </div>
        <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
          <p className="text-xs text-zinc-400">Profit</p>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${(profit / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {recentInvoices.length > 0 ? (
        <div className="space-y-2">
          {recentInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30">
              <span className="text-sm text-white truncate">{inv.client_name || 'Client'}</span>
              <Badge className={`
                ${inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  inv.status === 'overdue' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  'bg-amber-500/20 text-amber-400 border-amber-500/30'}
                border text-xs
              `}>
                ${(inv.total || 0).toLocaleString()}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-zinc-500 text-sm">
          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No invoices yet
        </div>
      )}
    </GlassCard>
  );
}

export function FinanceRevenueWidget({ totalRevenue = 0, change = null }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 border-emerald-500/30 border">
          <DollarSign className="w-5 h-5 text-emerald-400" />
        </div>
        {change !== null && (
          <Badge className={`${change >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} text-xs border`}>
            <span className="flex items-center gap-0.5">
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-white">${(totalRevenue / 1000).toFixed(0)}k</div>
      <div className="text-sm text-zinc-400">Total Revenue</div>
    </GlassCard>
  );
}

export function FinanceExpensesWidget({ totalExpenses = 0, change = null }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/20 border-red-500/30 border">
          <CreditCard className="w-5 h-5 text-red-400" />
        </div>
        {change !== null && (
          <Badge className={`${change <= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} text-xs border`}>
            <span className="flex items-center gap-0.5">
              {change <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-red-400">${(totalExpenses / 1000).toFixed(0)}k</div>
      <div className="text-sm text-zinc-400">Total Expenses</div>
    </GlassCard>
  );
}

export function FinancePendingWidget({ pendingAmount = 0, invoiceCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 border-amber-500/30 border">
          <Receipt className="w-5 h-5 text-amber-400" />
        </div>
        {invoiceCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {invoiceCount} pending
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-amber-400">${(pendingAmount / 1000).toFixed(0)}k</div>
      <div className="text-sm text-zinc-400">Pending Invoices</div>
    </GlassCard>
  );
}

export function FinanceMRRWidget({ mrr = 0, activeCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/20 border-cyan-500/30 border">
          <CircleDollarSign className="w-5 h-5 text-cyan-400" />
        </div>
        {activeCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            {activeCount} active
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-cyan-400">${mrr.toLocaleString()}</div>
      <div className="text-sm text-zinc-400">Monthly Recurring</div>
    </GlassCard>
  );
}
