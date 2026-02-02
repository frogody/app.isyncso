import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Scale, FileSpreadsheet, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import FinanceReportPL from './FinanceReportPL';
import FinanceReportBS from './FinanceReportBS';
import FinanceReportTB from './FinanceReportTB';
import FinanceReportAging from './FinanceReportAging';

const TABS = [
  { id: 'pl', label: 'Profit & Loss', icon: TrendingUp },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale },
  { id: 'trial-balance', label: 'Trial Balance', icon: FileSpreadsheet },
  { id: 'aging', label: 'Aging', icon: Clock },
];

const VALID_HASHES = TABS.map(t => t.id);

function getInitialTab() {
  const hash = window.location.hash.replace('#', '');
  if (VALID_HASHES.includes(hash)) return hash;
  return 'pl';
}

export default function FinanceReports() {
  const { ft } = useTheme();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_HASHES.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <PageHeader
            icon={BarChart3}
            title="Financial Reports"
            subtitle="Generate and analyze financial statements"
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
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'pl' && <FinanceReportPL embedded />}
          {activeTab === 'balance-sheet' && <FinanceReportBS embedded />}
          {activeTab === 'trial-balance' && <FinanceReportTB embedded />}
          {activeTab === 'aging' && <FinanceReportAging embedded />}
        </div>
      </div>
    </FinancePageTransition>
  );
}
