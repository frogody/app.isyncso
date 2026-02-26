import React from 'react';

/**
 * Status color mapping for B2B order statuses.
 *
 * Each status provides background, text, and dot colors
 * using CSS-compatible rgba/hex values suitable for the
 * dark wholesale storefront theme.
 */
const STATUS_STYLES = {
  pending: {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.25)',
    dot: '#f59e0b',
  },
  confirmed: {
    bg: 'rgba(59, 130, 246, 0.12)',
    text: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.25)',
    dot: '#3b82f6',
  },
  processing: {
    bg: 'rgba(6, 182, 212, 0.12)',
    text: '#22d3ee',
    border: 'rgba(6, 182, 212, 0.25)',
    dot: '#06b6d4',
  },
  shipped: {
    bg: 'rgba(168, 85, 247, 0.12)',
    text: '#c084fc',
    border: 'rgba(168, 85, 247, 0.25)',
    dot: '#a855f7',
  },
  delivered: {
    bg: 'rgba(34, 197, 94, 0.12)',
    text: '#4ade80',
    border: 'rgba(34, 197, 94, 0.25)',
    dot: '#22c55e',
  },
  cancelled: {
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#f87171',
    border: 'rgba(239, 68, 68, 0.25)',
    dot: '#ef4444',
  },
};

const FALLBACK_STYLE = {
  bg: 'rgba(161, 161, 170, 0.12)',
  text: '#a1a1aa',
  border: 'rgba(161, 161, 170, 0.25)',
  dot: '#a1a1aa',
};

/**
 * OrderStatusBadge
 *
 * Visual pill badge showing the current status of a B2B order.
 * Renders a colored dot followed by the capitalized status label.
 *
 * Props:
 *   status - One of: pending, confirmed, processing, shipped, delivered, cancelled
 */
export default function OrderStatusBadge({ status }) {
  const normalised = (status || '').toLowerCase().trim();
  const style = STATUS_STYLES[normalised] || FALLBACK_STYLE;
  const label = normalised.charAt(0).toUpperCase() + normalised.slice(1);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: style.dot }}
      />
      {label || 'Unknown'}
    </span>
  );
}
