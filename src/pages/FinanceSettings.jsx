import React, { useState, useEffect } from 'react';
import { Settings, Percent, Calculator, Landmark } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import FinanceTaxRates from './FinanceTaxRates';
import FinanceBTWAangifte from './FinanceBTWAangifte';
import FinanceBankAccounts from './FinanceBankAccounts';

const TABS = [
  { id: 'tax-rates', label: 'Tax Rates', icon: Percent },
  { id: 'btw', label: 'BTW Aangifte', icon: Calculator },
  { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark },
];

function getInitialTab() {
  const hash = window.location.hash.replace('#', '');
  if (['tax-rates', 'btw', 'bank-accounts'].includes(hash)) return hash;
  return 'tax-rates';
}

export default function FinanceSettings() {
  const { ft } = useTheme();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => { window.location.hash = activeTab; }, [activeTab]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['tax-rates', 'btw', 'bank-accounts'].includes(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <PageHeader icon={Settings} title="Finance Settings" subtitle="Tax rates, VAT returns, and bank account management" color="blue" />
          <div className={`flex gap-1 p-1 rounded-xl ${ft('bg-slate-100', 'bg-zinc-900/50')}`}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'tax-rates' && <FinanceTaxRates embedded />}
          {activeTab === 'btw' && <FinanceBTWAangifte embedded />}
          {activeTab === 'bank-accounts' && <FinanceBankAccounts embedded />}
        </div>
      </div>
    </FinancePageTransition>
  );
}
