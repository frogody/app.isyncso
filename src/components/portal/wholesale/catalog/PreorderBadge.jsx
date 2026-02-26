import React from 'react';

/**
 * PreorderBadge
 *
 * Simple pill badge indicating a product is available for pre-order.
 * Shows the expected delivery date when provided.
 */
function PreorderBadge({ expectedDate }) {
  const formattedDate = expectedDate
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(expectedDate))
    : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        color: '#60a5fa',
        border: '1px solid rgba(59, 130, 246, 0.25)',
      }}
    >
      <svg
        className="w-3 h-3 flex-shrink-0"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 3.5V6L7.75 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Pre-order{formattedDate ? `: ${formattedDate}` : ''}
    </span>
  );
}

export default React.memo(PreorderBadge);
