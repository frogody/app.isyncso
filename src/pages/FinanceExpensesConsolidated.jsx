import React, { useState } from 'react';
import { CreditCard, Receipt, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import FinanceExpenses from './FinanceExpenses';
import FinanceSubscriptions from './FinanceSubscriptions';

const TABS = [
  { id: 'expenses', label: 'Business Expenses', icon: Receipt },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
];

export default function FinanceExpensesConsolidated() {
  const { theme, ft } = useTheme();
  const [activeTab, setActiveTab] = useState('expenses');

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <PageHeader
            icon={CreditCard}
            title="Expenses"
            subtitle="Business expenses and recurring subscriptions"
            color="blue"
          />

          {/* Tabs */}
          <div className={`flex gap-1 p-1 rounded-xl ${ft('bg-slate-100', 'bg-zinc-900/50')}`}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? ft('bg-white text-slate-900 shadow-sm', 'bg-zinc-800 text-white')
                      : ft('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200')
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'expenses' && <FinanceExpenses embedded />}
          {activeTab === 'subscriptions' && <FinanceSubscriptions embedded />}
        </div>
      </div>
    </FinancePageTransition>
  );
}
