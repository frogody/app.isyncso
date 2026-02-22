import React from 'react';

const TAG_CONFIG = {
  Pending:        { label: 'Pending',          bg: 'rgba(161,161,170,0.15)', color: 'rgb(161,161,170)' },
  InfoReceived:   { label: 'Info Received',    bg: 'rgba(96,165,250,0.15)',  color: 'rgb(96,165,250)'  },
  InTransit:      { label: 'In Transit',       bg: 'rgba(34,211,238,0.15)',  color: 'rgb(34,211,238)'  },
  OutForDelivery: { label: 'Out for Delivery', bg: 'rgba(52,211,153,0.15)',  color: 'rgb(52,211,153)'  },
  Delivered:      { label: 'Delivered',         bg: 'rgba(52,211,153,0.15)',  color: 'rgb(52,211,153)'  },
  AttemptFail:    { label: 'Failed Attempt',   bg: 'rgba(251,146,60,0.15)',  color: 'rgb(251,146,60)'  },
  Exception:      { label: 'Exception',        bg: 'rgba(248,113,113,0.15)', color: 'rgb(248,113,113)' },
  Expired:        { label: 'Expired',          bg: 'rgba(161,161,170,0.15)', color: 'rgb(161,161,170)' },
  AvailableForPickup: { label: 'Ready for Pickup', bg: 'rgba(96,165,250,0.15)', color: 'rgb(96,165,250)' },
};

export default function AfterShipStatusBadge({ tag, className = '' }) {
  const config = TAG_CONFIG[tag] || TAG_CONFIG.Pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${className}`}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
