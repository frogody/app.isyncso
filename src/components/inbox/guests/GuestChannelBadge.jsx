/**
 * GuestChannelBadge - Visual indicator for channels with external guests
 */

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';

export default function GuestChannelBadge({ guestCount = 0, guestNames = [], className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (guestCount <= 0) return null;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-dashed bg-amber-500/10 text-amber-400 border-amber-500/30">
        <ExternalLink className="w-2.5 h-2.5" />
        {guestCount}
      </span>

      {/* Tooltip */}
      {showTooltip && guestNames.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Guests
            </div>
            {guestNames.map((name, i) => (
              <div key={i} className="text-xs text-zinc-300 truncate">
                {name}
              </div>
            ))}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-zinc-800 border-r border-b border-zinc-700 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
