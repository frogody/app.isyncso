import React, { useMemo } from 'react';

/**
 * StockIndicator
 *
 * Stock availability badge for the B2B wholesale storefront.
 * Displays a colored status dot and label based on available quantity.
 *
 * Thresholds:
 *   > 10 available   -> green  "In Stock"
 *   1-10 available    -> amber  "Limited Stock"
 *   0 + delivery date -> blue   "Pre-order"
 *   0 + no delivery   -> red    "Out of Stock"
 */

const STATUS = {
  IN_STOCK: 'in_stock',
  LIMITED: 'limited',
  PREORDER: 'preorder',
  OUT_OF_STOCK: 'out_of_stock',
};

const STATUS_CONFIG = {
  [STATUS.IN_STOCK]: {
    dotColor: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    textColor: '#4ade80',
  },
  [STATUS.LIMITED]: {
    dotColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    textColor: '#fbbf24',
  },
  [STATUS.PREORDER]: {
    dotColor: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.10)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    textColor: '#60a5fa',
  },
  [STATUS.OUT_OF_STOCK]: {
    dotColor: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    textColor: '#f87171',
  },
};

function resolveStatus(available, expectedDeliveryDate) {
  if (available > 10) return STATUS.IN_STOCK;
  if (available > 0) return STATUS.LIMITED;
  if (expectedDeliveryDate) return STATUS.PREORDER;
  return STATUS.OUT_OF_STOCK;
}

function getLabel(status, available, expectedDeliveryDate, compact) {
  switch (status) {
    case STATUS.IN_STOCK:
      return compact ? 'In Stock' : `In Stock: ${available} units`;
    case STATUS.LIMITED:
      return compact ? 'Limited Stock' : `Limited Stock: ${available} left`;
    case STATUS.PREORDER: {
      if (compact) return 'Pre-order';
      const formatted = expectedDeliveryDate
        ? new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).format(new Date(expectedDeliveryDate))
        : '';
      return `Pre-order: Expected ${formatted}`;
    }
    case STATUS.OUT_OF_STOCK:
      return 'Out of Stock';
    default:
      return 'Unknown';
  }
}

function StockIndicator({
  quantityOnHand,
  quantityReserved = 0,
  expectedDeliveryDate = null,
  compact = false,
}) {
  const available = useMemo(
    () => Math.max(0, (quantityOnHand || 0) - (quantityReserved || 0)),
    [quantityOnHand, quantityReserved]
  );

  const status = useMemo(
    () => resolveStatus(available, expectedDeliveryDate),
    [available, expectedDeliveryDate]
  );

  const config = STATUS_CONFIG[status];
  const label = getLabel(status, available, expectedDeliveryDate, compact);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
        padding: compact ? '2px 8px' : '3px 10px',
      }}
    >
      <span
        className="flex-shrink-0 rounded-full"
        style={{
          width: compact ? '6px' : '7px',
          height: compact ? '6px' : '7px',
          backgroundColor: config.dotColor,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export default React.memo(StockIndicator);
