import React, { useMemo } from 'react';

/**
 * BulkPricingTable
 *
 * Displays quantity-based pricing tiers for B2B wholesale products.
 * Highlights the active tier based on currentQuantity and shows
 * savings percentage relative to the base (first tier) price.
 */

function formatCurrency(value, currency) {
  try {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatRange(min, max) {
  if (max == null || max === Infinity) return `${min}+`;
  return `${min}\u2013${max}`;
}

function getActiveTierIndex(tiers, quantity) {
  if (quantity == null || quantity <= 0) return -1;
  for (let i = 0; i < tiers.length; i++) {
    const { min_quantity, max_quantity } = tiers[i];
    const min = min_quantity ?? 0;
    const max = max_quantity ?? Infinity;
    if (quantity >= min && quantity <= max) return i;
  }
  return -1;
}

function BulkPricingTable({ tiers = [], currentQuantity, currency = 'EUR' }) {
  const activeTierIndex = useMemo(
    () => getActiveTierIndex(tiers, currentQuantity),
    [tiers, currentQuantity],
  );

  const basePrice = tiers.length > 0 ? tiers[0].unit_price : 0;

  // Single tier: show standard pricing note
  if (tiers.length <= 1) {
    return (
      <div
        className="rounded-xl px-5 py-4"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
          fontFamily: 'var(--ws-font)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
          Standard pricing
          {tiers.length === 1 && (
            <>
              {' \u2014 '}
              <span style={{ color: 'var(--ws-primary)' }} className="font-semibold">
                {formatCurrency(tiers[0].unit_price, currency)}
              </span>
              {' per unit'}
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--ws-border)',
              }}
            >
              <th
                className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Quantity Range
              </th>
              <th
                className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Unit Price
              </th>
              <th
                className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Savings
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const isActive = index === activeTierIndex;
              const savings =
                basePrice > 0 && tier.unit_price < basePrice
                  ? ((1 - tier.unit_price / basePrice) * 100).toFixed(0)
                  : null;

              return (
                <tr
                  key={index}
                  className="transition-colors duration-200"
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.08)'
                      : 'transparent',
                    borderBottom:
                      index < tiers.length - 1
                        ? '1px solid var(--ws-border)'
                        : 'none',
                  }}
                >
                  <td className="px-5 py-3.5">
                    <span
                      className="font-medium"
                      style={{
                        color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)',
                      }}
                    >
                      {formatRange(tier.min_quantity, tier.max_quantity)}
                    </span>
                    {isActive && (
                      <span
                        className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--ws-primary)',
                          color: 'var(--ws-bg)',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right font-semibold"
                    style={{
                      color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)',
                    }}
                  >
                    {formatCurrency(tier.unit_price, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {savings ? (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--ws-primary)' }}
                      >
                        -{savings}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ws-muted)' }}>&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked layout */}
      <div className="sm:hidden divide-y" style={{ borderColor: 'var(--ws-border)' }}>
        {tiers.map((tier, index) => {
          const isActive = index === activeTierIndex;
          const savings =
            basePrice > 0 && tier.unit_price < basePrice
              ? ((1 - tier.unit_price / basePrice) * 100).toFixed(0)
              : null;

          return (
            <div
              key={index}
              className="px-4 py-3.5 flex items-center justify-between gap-3 transition-colors duration-200"
              style={{
                backgroundColor: isActive
                  ? 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.08)'
                  : 'transparent',
                borderColor: 'var(--ws-border)',
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)',
                  }}
                >
                  {formatRange(tier.min_quantity, tier.max_quantity)} units
                </span>
                {isActive && (
                  <span
                    className="self-start text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
                    style={{
                      backgroundColor: 'var(--ws-primary)',
                      color: 'var(--ws-bg)',
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-0.5">
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)',
                  }}
                >
                  {formatCurrency(tier.unit_price, currency)}
                </span>
                {savings ? (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: 'var(--ws-primary)' }}
                  >
                    Save {savings}%
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                    Base price
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(BulkPricingTable);
