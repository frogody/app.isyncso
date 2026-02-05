import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Euro, CreditCard, Receipt,
  PieChart, ArrowUpRight, ArrowDownRight, BadgeEuro
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Widget metadata for the apps manager
export const FINANCE_WIDGETS = [
  { id: 'finance_overview', name: 'Financial Overview', description: 'Revenue vs expenses summary', size: 'large' },
  { id: 'finance_revenue', name: 'Total Revenue', description: 'Revenue from paid invoices', size: 'small' },
  { id: 'finance_expenses', name: 'Total Expenses', description: 'Sum of all expenses', size: 'small' },
  { id: 'finance_pending', name: 'Pending Invoices', description: 'Outstanding invoice amounts', size: 'small' },
  { id: 'finance_mrr', name: 'Monthly Recurring', description: 'Active subscription revenue', size: 'small' }
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-colors ${className}`}>
    {children}
  </div>
);

export function FinanceOverviewWidget({ revenue = 0, expenses = 0, invoices = [] }) {
  const profit = revenue - expenses;
  const recentInvoices = invoices.slice(0, 4);

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-emerald-400" />
          Financial Overview
        </h2>
        <Link to={createPageUrl("Finance")} className="text-emerald-400 text-sm hover:text-emerald-300">View all</Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <p className="text-xs text-zinc-400">Revenue</p>
          <p className="text-lg font-bold text-emerald-400">${(revenue / 1000).toFixed(0)}k</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
          <p className="text-xs text-zinc-400">Expenses</p>
          <p className="text-lg font-bold text-red-400">${(expenses / 1000).toFixed(0)}k</p>
        </div>
        <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'} border`}>
          <p className="text-xs text-zinc-400">Profit</p>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${(profit / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {recentInvoices.length > 0 ? (
        <div className="space-y-2">
          {recentInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/30">
              <span className="text-sm text-white truncate">{inv.client_name || 'Client'}</span>
              <Badge className={`
                ${inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                  inv.status === 'overdue' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
                  'bg-amber-500/15 text-amber-400 border-amber-500/25'}
                border text-xs
              `}>
                ${(inv.total || 0).toLocaleString()}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-zinc-500 text-sm">
          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No invoices yet
        </div>
      )}
    </Card>
  );
}

export function FinanceRevenueWidget({ totalRevenue = 0, change = null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <Euro className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Total Revenue</span>
        </div>
        {change !== null && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">${(totalRevenue / 1000).toFixed(0)}k</div>
    </Card>
  );
}

export function FinanceExpensesWidget({ totalExpenses = 0, change = null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
            <CreditCard className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Total Expenses</span>
        </div>
        {change !== null && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${change <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-red-400">${(totalExpenses / 1000).toFixed(0)}k</div>
    </Card>
  );
}

export function FinancePendingWidget({ pendingAmount = 0, invoiceCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Pending</span>
        </div>
        {invoiceCount > 0 && (
          <span className="text-xs text-amber-400 font-medium">{invoiceCount} pending</span>
        )}
      </div>
      <div className="text-2xl font-bold text-amber-400">${(pendingAmount / 1000).toFixed(0)}k</div>
    </Card>
  );
}

export function FinanceMRRWidget({ mrr = 0, activeCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <BadgeEuro className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Monthly Recurring</span>
        </div>
        {activeCount > 0 && (
          <span className="text-xs text-emerald-400 font-medium">{activeCount} active</span>
        )}
      </div>
      <div className="text-2xl font-bold text-emerald-400">${mrr.toLocaleString()}</div>
    </Card>
  );
}
