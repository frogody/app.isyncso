import React, { useState, useMemo } from 'react';
import { Zap, TrendingUp, Calculator, ShoppingCart, History, ArrowDown, Loader2, Check, Sparkles, Search, Users, Building2, Brain, FileText, Globe, Package } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useBilling } from '@/hooks/useBilling';
import { useEnrichmentConfig } from '@/hooks/useEnrichmentConfig';
import { toast } from 'sonner';

export default function Credits() {
  const { st } = useTheme();
  const { subscription, plans, creditPacks, creditBalance, creditTransactions, isLoading, createCheckout, refresh } = useBilling();
  const { configList, loading: configLoading } = useEnrichmentConfig();
  const [checkingOut, setCheckingOut] = useState(null);
  const [calcInputs, setCalcInputs] = useState({});

  const currentPlanSlug = subscription?.subscription_plans?.slug || subscription?.plan_slug || 'free';
  const currentPlan = plans.find(p => p.slug === currentPlanSlug) || plans.find(p => p.slug === 'free');
  const monthlyAllowance = currentPlan?.limits?.credits_monthly || 0;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleCheckout = async (slug) => {
    setCheckingOut(slug);
    try {
      await createCheckout('credit_pack', slug);
    } finally {
      setTimeout(() => setCheckingOut(null), 3000);
    }
  };

  const calcTotal = useMemo(() => {
    return configList.reduce((sum, item) => {
      const qty = calcInputs[item.key] || 0;
      return sum + (qty * (item.credits || 0));
    }, 0);
  }, [calcInputs, configList]);

  const calcStatus = calcTotal === 0
    ? 'neutral'
    : calcTotal <= creditBalance
      ? 'covered'
      : calcTotal <= creditBalance * 1.5
        ? 'tight'
        : 'short';

  const recommendedPack = useMemo(() => {
    if (calcTotal <= creditBalance) return null;
    const needed = calcTotal - creditBalance;
    return creditPacks.find(p => p.credits >= needed) || creditPacks[creditPacks.length - 1];
  }, [calcTotal, creditBalance, creditPacks]);

  const ICON_MAP = {
    linkedin_enrich: Search,
    full_package: Package,
    sync_intel: Brain,
    company_intel: Building2,
    candidate_intel: Users,
    default: Sparkles,
  };

  if (isLoading && configLoading) {
    return (
      <div className={`min-h-screen ${st('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${st('bg-slate-50', 'bg-black')} p-6`}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className={`text-2xl font-bold ${st('text-slate-900', 'text-white')}`}>Credits</h1>
          <p className={`text-sm mt-1 ${st('text-slate-500', 'text-zinc-400')}`}>
            Monitor your balance, understand costs, and top up when needed
          </p>
        </div>

        {/* Section A: Credit Balance Hero */}
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Balance */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <p className={`text-sm font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Available Credits</p>
                <p className={`text-4xl font-bold ${st('text-slate-900', 'text-white')}`}>
                  {creditBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Right: Plan info + progress */}
            <div className="flex-1 max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${st('text-slate-600', 'text-zinc-400')}`}>
                  {currentPlan?.name || 'Free'} plan
                </span>
                {monthlyAllowance > 0 && (
                  <span className={`text-sm font-medium ${st('text-slate-900', 'text-white')}`}>
                    {creditBalance} / {monthlyAllowance.toLocaleString()}
                  </span>
                )}
              </div>
              {monthlyAllowance > 0 && (
                <div className={`w-full h-2.5 rounded-full ${st('bg-slate-200', 'bg-zinc-800')}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (creditBalance / monthlyAllowance) * 100)}%` }}
                  />
                </div>
              )}
              {renewalDate && (
                <p className={`text-xs mt-2 ${st('text-slate-400', 'text-zinc-500')}`}>
                  Renews {renewalDate}
                </p>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={() => document.getElementById('credit-packs')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              Top Up Credits
            </button>
          </div>
        </GlassCard>

        {/* Section B: What Costs Credits */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>What Costs Credits</h2>
          </div>
          {configList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {configList.map((item) => {
                const IconComp = ICON_MAP[item.key] || ICON_MAP.default;
                return (
                  <GlassCard key={item.id} className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${st('bg-slate-100', 'bg-white/[0.05]')} flex items-center justify-center shrink-0`}>
                      <IconComp className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm font-medium ${st('text-slate-900', 'text-white')} truncate`}>{item.label || item.key}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold shrink-0">
                          <Zap className="w-3 h-3" />
                          {item.credits}
                        </span>
                      </div>
                      {item.description && (
                        <p className={`text-xs mt-1 ${st('text-slate-500', 'text-zinc-500')} line-clamp-2`}>{item.description}</p>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            !configLoading && (
              <p className={`text-sm ${st('text-slate-400', 'text-zinc-500')}`}>
                No enrichment configurations available yet.
              </p>
            )
          )}
        </div>

        {/* Section C: Credit Calculator */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <h2 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Estimate Your Usage</h2>
          </div>

          <div className="space-y-3">
            {configList.map((item) => {
              const qty = calcInputs[item.key] || 0;
              const subtotal = qty * (item.credits || 0);
              return (
                <div key={item.id} className={`flex items-center gap-4 p-3 rounded-xl ${st('bg-slate-50', 'bg-white/[0.02]')}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${st('text-slate-900', 'text-white')} truncate`}>{item.label || item.key}</p>
                    <p className={`text-xs ${st('text-slate-500', 'text-zinc-500')}`}>{item.credits} credits each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={qty || ''}
                      onChange={(e) => setCalcInputs(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className={`w-20 px-3 py-1.5 rounded-lg text-sm text-right ${st('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} border focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                    />
                    <span className={`text-sm font-medium w-20 text-right ${subtotal > 0 ? 'text-cyan-400' : st('text-slate-400', 'text-zinc-600')}`}>
                      {subtotal > 0 ? subtotal.toLocaleString() : '\u2014'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className={`mt-6 pt-4 border-t ${st('border-slate-200', 'border-white/5')}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${st('text-slate-600', 'text-zinc-400')}`}>Estimated total</span>
              <span className={`text-2xl font-bold ${
                calcStatus === 'covered' ? 'text-emerald-400' :
                calcStatus === 'tight' ? 'text-amber-400' :
                calcStatus === 'short' ? 'text-red-400' :
                st('text-slate-900', 'text-white')
              }`}>
                {calcTotal.toLocaleString()} credits
              </span>
            </div>
            {calcTotal > 0 && (
              <p className={`text-xs mt-1 text-right ${
                calcStatus === 'covered' ? 'text-emerald-400' :
                calcStatus === 'tight' ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {calcStatus === 'covered' ? 'Your current balance covers this' :
                 calcStatus === 'tight' ? 'Cutting it close \u2014 consider topping up' :
                 `You need ${(calcTotal - creditBalance).toLocaleString()} more credits`}
              </p>
            )}
            {recommendedPack && (
              <div className={`mt-3 p-3 rounded-xl ${st('bg-cyan-50 border-cyan-200', 'bg-cyan-500/5 border-cyan-500/20')} border flex items-center justify-between`}>
                <div>
                  <p className={`text-sm font-medium ${st('text-cyan-800', 'text-cyan-400')}`}>
                    Recommended: {recommendedPack.name}
                  </p>
                  <p className={`text-xs ${st('text-cyan-600', 'text-cyan-500/70')}`}>
                    {recommendedPack.credits.toLocaleString()} credits for &euro;{recommendedPack.price}
                  </p>
                </div>
                <button
                  onClick={() => handleCheckout(recommendedPack.slug)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors"
                >
                  Buy Now
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Section D: Buy Credit Packs */}
        <div id="credit-packs">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            <h2 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Buy Credit Packs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPacks.map((pack) => {
              const perCredit = (pack.price / pack.credits).toFixed(3);
              return (
                <GlassCard key={pack.id} className="p-5 relative">
                  {pack.badge && (
                    <div className="absolute -top-2.5 right-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        pack.badge === 'Best Value'
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}>
                        {pack.badge}
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className={`text-sm font-semibold ${st('text-slate-900', 'text-white')}`}>{pack.name}</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className={`text-2xl font-bold ${st('text-slate-900', 'text-white')}`}>
                        {pack.credits.toLocaleString()}
                      </span>
                      <span className={`text-sm ${st('text-slate-500', 'text-zinc-500')}`}>credits</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-lg font-semibold ${st('text-slate-700', 'text-zinc-300')}`}>&euro;{pack.price}</span>
                      <span className={`text-xs ${st('text-slate-400', 'text-zinc-500')}`}>&euro;{perCredit}/credit</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCheckout(pack.slug)}
                    disabled={checkingOut === pack.slug}
                    className={`w-full py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${st('bg-slate-100 hover:bg-slate-200 text-slate-700', 'bg-white/5 hover:bg-white/10 text-zinc-300')}`}
                  >
                    {checkingOut === pack.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Buy Credits
                        <Zap className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Section E: Recent Credit Activity */}
        {creditTransactions.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-cyan-400" />
              <h2 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Recent Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${st('border-slate-200', 'border-white/5')}`}>
                    <th className={`text-left py-2.5 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Date</th>
                    <th className={`text-left py-2.5 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Description</th>
                    <th className={`text-right py-2.5 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Credits</th>
                    <th className={`text-right py-2.5 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTransactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className={`border-b ${st('border-slate-100', 'border-white/[0.03]')}`}>
                        <td className={`py-2.5 px-2 text-sm ${st('text-slate-500', 'text-zinc-500')}`}>
                          {new Date(tx.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className={`py-2.5 px-2 text-sm ${st('text-slate-900', 'text-white')}`}>
                          {tx.description || tx.reference_name || tx.transaction_type}
                        </td>
                        <td className={`py-2.5 px-2 text-sm text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{tx.amount}
                        </td>
                        <td className={`py-2.5 px-2 text-sm text-right ${st('text-slate-500', 'text-zinc-500')}`}>
                          {tx.balance_after != null ? tx.balance_after.toLocaleString() : '\u2014'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
