import React, { useState, useEffect } from 'react';
import {
  CreditCard, Check, Zap, ArrowRight, ExternalLink, Loader2,
  Crown, Users, HardDrive, Sparkles, Receipt, Download, ChevronRight,
  Gift, TrendingUp, Shield
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useBilling } from '@/hooks/useBilling';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const STATUS_COLORS = {
  active: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  trialing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  past_due: 'bg-red-500/15 text-red-400 border-red-500/30',
  canceled: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export default function BillingSettings({ embedded }) {
  const { st } = useTheme();
  const { subscription, plans, creditPacks, invoices, creditBalance, isLoading, createCheckout, openPortal, refresh } = useBilling();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkingOut, setCheckingOut] = useState(null);
  const [searchParams] = useSearchParams();

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Your plan has been updated.');
      refresh();
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Payment was canceled.');
    }
  }, [searchParams, refresh]);

  const handleCheckout = async (type, slug) => {
    setCheckingOut(slug);
    try {
      await createCheckout(type, slug, billingCycle);
    } finally {
      // Only reset if we didn't redirect
      setTimeout(() => setCheckingOut(null), 3000);
    }
  };

  const currentPlanSlug = subscription?.subscription_plans?.slug || subscription?.plan_slug || 'free';
  const currentPlan = plans.find(p => p.slug === currentPlanSlug) || plans.find(p => p.slug === 'free');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const content = (
    <div className="space-y-8">
      {/* Section 1: Current Plan */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Current Plan</h3>
            <p className={`text-sm mt-1 ${st('text-slate-500', 'text-zinc-400')}`}>
              Manage your subscription and billing
            </p>
          </div>
          {subscription && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[subscription.status] || STATUS_COLORS.active}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {subscription.status === 'active' ? 'Active' : subscription.status}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Plan name */}
          <div className={`p-4 rounded-xl ${st('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/5')} border`}>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Plan</span>
            </div>
            <p className={`text-lg font-bold ${st('text-slate-900', 'text-white')}`}>
              {currentPlan?.name || 'Free'}
            </p>
          </div>

          {/* Credit balance */}
          <div className={`p-4 rounded-xl ${st('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/5')} border`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Credits</span>
            </div>
            <p className={`text-lg font-bold ${st('text-slate-900', 'text-white')}`}>
              {creditBalance.toLocaleString()}
            </p>
            {currentPlan?.limits?.credits_monthly && (
              <div className="mt-2">
                <div className={`w-full h-1.5 rounded-full ${st('bg-slate-200', 'bg-zinc-800')}`}>
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all"
                    style={{ width: `${Math.min(100, (creditBalance / currentPlan.limits.credits_monthly) * 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${st('text-slate-400', 'text-zinc-500')}`}>
                  of {currentPlan.limits.credits_monthly}/mo
                </p>
              </div>
            )}
          </div>

          {/* Team seats */}
          <div className={`p-4 rounded-xl ${st('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/5')} border`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Seats</span>
            </div>
            <p className={`text-lg font-bold ${st('text-slate-900', 'text-white')}`}>
              {currentPlan?.limits?.seats || 1}
            </p>
          </div>

          {/* Storage */}
          <div className={`p-4 rounded-xl ${st('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/5')} border`}>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Storage</span>
            </div>
            <p className={`text-lg font-bold ${st('text-slate-900', 'text-white')}`}>
              {currentPlan?.limits?.storage_gb || 1} GB
            </p>
          </div>
        </div>

        {/* Actions */}
        {subscription && subscription.status === 'active' && (
          <div className={`flex items-center gap-3 mt-6 pt-6 border-t ${st('border-slate-200', 'border-white/5')}`}>
            <button
              onClick={openPortal}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${st('bg-slate-100 text-slate-700 hover:bg-slate-200', 'bg-white/5 text-zinc-300 hover:bg-white/10')}`}
            >
              <ExternalLink className="w-4 h-4" />
              Manage Subscription
            </button>
          </div>
        )}
      </GlassCard>

      {/* Section 2: Plan Selector */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Choose Your Plan</h3>
            <p className={`text-sm mt-1 ${st('text-slate-500', 'text-zinc-400')}`}>
              Scale as you grow. All plans include a 14-day free trial.
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${st('bg-slate-50 border-slate-200', 'bg-white/[0.02] border-white/5')}`}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? st('bg-white text-slate-900 shadow-sm', 'bg-zinc-800 text-white')
                  : st('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? st('bg-white text-slate-900 shadow-sm', 'bg-zinc-800 text-white')
                  : st('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')
              }`}
            >
              Yearly
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentPlanSlug;
            const isFeatured = plan.is_featured;
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const monthlyPrice = billingCycle === 'yearly' ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
            const features = Array.isArray(plan.features) ? plan.features : [];

            return (
              <GlassCard
                key={plan.id}
                className={`p-6 relative flex flex-col ${isFeatured ? 'ring-2 ring-cyan-500/50' : ''}`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500 text-white text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className={`text-base font-semibold ${st('text-slate-900', 'text-white')}`}>{plan.name}</h4>
                  <div className="mt-3">
                    {plan.price_monthly === 0 ? (
                      <span className={`text-3xl font-bold ${st('text-slate-900', 'text-white')}`}>Free</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${st('text-slate-900', 'text-white')}`}>
                          &euro;{monthlyPrice}
                        </span>
                        <span className={`text-sm ${st('text-slate-500', 'text-zinc-500')}`}>/mo</span>
                      </div>
                    )}
                    {billingCycle === 'yearly' && plan.price_monthly > 0 && (
                      <p className={`text-xs mt-1 ${st('text-slate-400', 'text-zinc-500')}`}>
                        &euro;{price} billed annually
                      </p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <span className={`text-sm ${st('text-slate-600', 'text-zinc-400')}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrent ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-sm font-medium ${st('bg-slate-100 text-slate-400', 'bg-white/5 text-zinc-500')} cursor-not-allowed`}
                  >
                    Current Plan
                  </button>
                ) : plan.price_monthly === 0 ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-sm font-medium ${st('bg-slate-100 text-slate-400', 'bg-white/5 text-zinc-500')} cursor-not-allowed`}
                  >
                    Free Forever
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout('subscription', plan.slug)}
                    disabled={checkingOut === plan.slug}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      isFeatured
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
                        : st('bg-slate-900 hover:bg-slate-800 text-white', 'bg-white/10 hover:bg-white/15 text-white')
                    }`}
                  >
                    {checkingOut === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Choose {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Section 3: Credit Top-Up */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Credit Top-Up</h3>
            <p className={`text-sm mt-1 ${st('text-slate-500', 'text-zinc-400')}`}>
              Need more credits? Buy a one-time pack.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className={`text-lg font-bold ${st('text-slate-900', 'text-white')}`}>
              {creditBalance.toLocaleString()} credits
            </span>
          </div>
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
                  onClick={() => handleCheckout('credit_pack', pack.slug)}
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

      {/* Section 4: Billing History */}
      {invoices.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')}`}>Billing History</h3>
            {subscription && (
              <button
                onClick={openPortal}
                className={`flex items-center gap-1 text-sm ${st('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')}`}
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${st('border-slate-200', 'border-white/5')}`}>
                  <th className={`text-left py-3 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Date</th>
                  <th className={`text-left py-3 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Description</th>
                  <th className={`text-right py-3 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Amount</th>
                  <th className={`text-right py-3 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}>Status</th>
                  <th className={`text-right py-3 px-2 text-xs font-medium ${st('text-slate-500', 'text-zinc-500')}`}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={`border-b ${st('border-slate-100', 'border-white/[0.03]')}`}>
                    <td className={`py-3 px-2 text-sm ${st('text-slate-600', 'text-zinc-400')}`}>
                      {new Date(inv.invoice_date || inv.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className={`py-3 px-2 text-sm ${st('text-slate-900', 'text-white')}`}>
                      Subscription
                    </td>
                    <td className={`py-3 px-2 text-sm text-right font-medium ${st('text-slate-900', 'text-white')}`}>
                      &euro;{(inv.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        inv.status === 'paid'
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'bg-zinc-500/15 text-zinc-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {inv.invoice_pdf && (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className={`min-h-screen ${st('bg-slate-50', 'bg-black')} p-6`}>
      <div className="max-w-6xl mx-auto">
        {content}
      </div>
    </div>
  );
}
