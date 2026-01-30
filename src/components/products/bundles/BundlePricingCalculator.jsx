import React, { useMemo } from 'react';
import {
  Euro, Percent, TrendingDown, Package,
  ShoppingCart, Tag, Calculator, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Calculate bundle pricing based on items and strategy
 */
export function calculateBundlePrice(bundle) {
  const items = bundle?.items || [];

  // Calculate sum of all items
  const itemsTotal = items.reduce((sum, item) => {
    const price = item.price || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  let finalPrice = itemsTotal;
  let savings = 0;
  let savingsPercent = 0;

  switch (bundle?.pricing_strategy) {
    case 'fixed':
      finalPrice = bundle.fixed_price || 0;
      savings = itemsTotal - finalPrice;
      savingsPercent = itemsTotal > 0 ? (savings / itemsTotal) * 100 : 0;
      break;

    case 'discount':
      const discountPercent = bundle.discount_percent || 0;
      savings = itemsTotal * (discountPercent / 100);
      finalPrice = itemsTotal - savings;
      savingsPercent = discountPercent;
      break;

    case 'sum':
    default:
      finalPrice = itemsTotal;
      savings = 0;
      savingsPercent = 0;
      break;
  }

  return {
    itemsTotal,
    finalPrice,
    savings,
    savingsPercent,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  };
}

/**
 * Compact pricing display for bundle cards
 */
export function BundlePriceTag({ bundle, currency = 'EUR', className }) {
  const pricing = useMemo(() => calculateBundlePrice(bundle), [bundle]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-lg font-semibold text-white">
        {formatPrice(pricing.finalPrice, currency)}
      </span>
      {pricing.savings > 0 && (
        <>
          <span className="text-sm text-zinc-500 line-through">
            {formatPrice(pricing.itemsTotal, currency)}
          </span>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
            -{pricing.savingsPercent.toFixed(0)}%
          </Badge>
        </>
      )}
    </div>
  );
}

/**
 * Full pricing breakdown component
 */
export default function BundlePricingCalculator({
  bundle,
  currency = 'EUR',
  showItems = false,
  compact = false,
  className
}) {
  const pricing = useMemo(() => calculateBundlePrice(bundle), [bundle]);
  const { itemsTotal, finalPrice, savings, savingsPercent, itemCount, totalQuantity } = pricing;

  if (compact) {
    return (
      <div className={cn("p-4 rounded-lg bg-zinc-900/50 border border-white/5", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
              {totalQuantity > itemCount && ` (${totalQuantity} total)`}
            </span>
          </div>
          <BundlePriceTag bundle={bundle} currency={currency} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border", className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-zinc-900/30">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-400" />
          Bundle Pricing
        </h4>
      </div>

      {/* Items List (optional) */}
      {showItems && bundle?.items?.length > 0 && (
        <div className="p-4 border-b border-white/5 space-y-2 max-h-60 overflow-y-auto">
          {bundle.items.map((item, idx) => (
            <div key={item.id || idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-zinc-300 truncate">{item.name}</span>
                {item.quantity > 1 && (
                  <Badge variant="outline" className="text-xs border-white/10">
                    x{item.quantity}
                  </Badge>
                )}
              </div>
              <span className="text-white flex-shrink-0 ml-2">
                {formatPrice((item.price || 0) * (item.quantity || 1), currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calculations */}
      <div className="p-4 space-y-3">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="text-white">{formatPrice(itemsTotal, currency)}</span>
        </div>

        {/* Savings (if applicable) */}
        {savings > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
              {bundle?.pricing_strategy === 'discount'
                ? `Bundle Discount (${bundle.discount_percent}%)`
                : 'Bundle Savings'}
            </span>
            <span className="text-cyan-400">-{formatPrice(savings, currency)}</span>
          </div>
        )}

        {/* Markup (if negative savings) */}
        {savings < 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Price Adjustment</span>
            <span className="text-cyan-400">+{formatPrice(Math.abs(savings), currency)}</span>
          </div>
        )}

        {/* Final Price */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              Bundle Price
            </span>
            <div className="text-right">
              <span className="text-xl font-bold text-cyan-400">
                {formatPrice(finalPrice, currency)}
              </span>
              {savingsPercent > 0 && (
                <div className="mt-1">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Save {savingsPercent.toFixed(0)}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Info */}
      {bundle?.pricing_strategy && (
        <div className="px-4 py-3 bg-zinc-900/50 border-t border-white/5 rounded-b-xl">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {bundle.pricing_strategy === 'fixed' && (
              <>
                <Euro className="w-3.5 h-3.5" />
                Fixed bundle price
              </>
            )}
            {bundle.pricing_strategy === 'discount' && (
              <>
                <Percent className="w-3.5 h-3.5" />
                {bundle.discount_percent}% off total
              </>
            )}
            {bundle.pricing_strategy === 'sum' && (
              <>
                <Calculator className="w-3.5 h-3.5" />
                Sum of individual prices
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mini inline calculator for quick price display
 */
export function InlineBundlePrice({ bundle, currency = 'EUR', className }) {
  const { finalPrice, savings, savingsPercent } = useMemo(
    () => calculateBundlePrice(bundle),
    [bundle]
  );

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-semibold text-white">
        {formatPrice(finalPrice, currency)}
      </span>
      {savings > 0 && (
        <span className="text-xs text-cyan-400">
          (-{savingsPercent.toFixed(0)}%)
        </span>
      )}
    </span>
  );
}
