import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, X, Star, Zap, ArrowRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const BILLING_LABELS = {
  monthly: '/mo',
  quarterly: '/qtr',
  yearly: '/yr',
  lifetime: 'one-time',
};

export default function PricingTable({
  packages = [],
  billingCycles = ['monthly', 'yearly'],
  pricingModel = 'subscription',
  trialAvailable = false,
  trialDays = 14,
  onSelectPlan,
  className,
}) {
  const [billingCycle, setBillingCycle] = useState(
    billingCycles.includes('yearly') ? 'yearly' : billingCycles[0] || 'monthly'
  );

  const showToggle = billingCycles.length > 1 && pricingModel === 'subscription';

  // Calculate savings for yearly
  const getYearlySavings = (pkg) => {
    if (!pkg.pricing?.monthly || !pkg.pricing?.yearly) return null;
    const monthlyTotal = parseFloat(pkg.pricing.monthly) * 12;
    const yearlyTotal = parseFloat(pkg.pricing.yearly);
    const savings = ((monthlyTotal - yearlyTotal) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Billing Toggle */}
      {showToggle && (
        <div className="flex items-center justify-center gap-4">
          <span className={cn(
            "text-sm font-medium transition-colors",
            billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500'
          )}>
            Monthly
          </span>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <span className={cn(
            "text-sm font-medium transition-colors flex items-center gap-2",
            billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500'
          )}>
            Yearly
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              Save up to 20%
            </Badge>
          </span>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, index) => {
          const isPopular = pkg.is_popular || pkg.recommended;
          const price = pkg.pricing?.[billingCycle] || pkg.price || '0';
          const savings = getYearlySavings(pkg);

          return (
            <motion.div
              key={pkg.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative rounded-2xl border transition-all overflow-hidden",
                isPopular
                  ? "bg-gradient-to-b from-cyan-500/10 to-transparent border-cyan-500/30 scale-105 z-10"
                  : "bg-zinc-900/50 border-white/5 hover:border-white/10"
              )}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 px-4 py-1 rounded-b-lg rounded-t-none">
                    <Star className="w-3 h-3 mr-1 fill-current" /> Most Popular
                  </Badge>
                </div>
              )}

              <div className="p-6 pt-8">
                {/* Package Name */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {pkg.name}
                </h3>
                <p className="text-sm text-zinc-500 mb-6 min-h-[2.5rem]">
                  {pkg.description || 'Perfect for getting started'}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      ${parseFloat(price).toLocaleString()}
                    </span>
                    <span className="text-zinc-500">
                      {BILLING_LABELS[billingCycle] || ''}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && savings > 0 && (
                    <p className="text-sm text-cyan-400 mt-1">
                      Save {savings}% compared to monthly
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => onSelectPlan?.(pkg, billingCycle)}
                  className={cn(
                    "w-full mb-6",
                    isPopular
                      ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  )}
                >
                  {trialAvailable ? `Start ${trialDays}-day Trial` : 'Get Started'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                {/* Features */}
                <div className="space-y-3">
                  {pkg.features?.map((feature, i) => {
                    const isIncluded = feature.included !== false;
                    const featureText = typeof feature === 'string' ? feature : feature.name;
                    const tooltip = typeof feature === 'object' ? feature.tooltip : null;

                    return (
                      <div key={i} className="flex items-start gap-3">
                        {isIncluded ? (
                          <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={cn(
                          "text-sm",
                          isIncluded ? "text-zinc-300" : "text-zinc-600"
                        )}>
                          {featureText}
                        </span>
                        {tooltip && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-zinc-600" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-zinc-800 border-zinc-700 text-white">
                                {tooltip}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Limits */}
                {pkg.limits && (
                  <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                    {Object.entries(pkg.limits).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-white font-medium">
                          {value === -1 ? 'Unlimited' : value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <div className="text-center pt-8">
        <p className="text-zinc-500 mb-4">
          Need a custom solution for your enterprise?
        </p>
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Zap className="w-4 h-4 mr-2" /> Contact Sales
        </Button>
      </div>
    </div>
  );
}
