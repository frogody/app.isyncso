/**
 * TimerNode - Delay/wait step
 * Glass morphism card with amber accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Timer } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

function TimerNode({ data, selected }) {
  const minutes = data?.delay_minutes || 0;
  const hours = data?.delay_hours || 0;
  const days = data?.delay_days || 0;
  const isConfigured = days > 0 || hours > 0 || minutes > 0;

  const formatDelay = () => {
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.length > 0 ? parts.join(' ') : 'No delay';
  };

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-amber-400/50 shadow-[0_0_24px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Timer</span>
        </div>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Waits before continuing the flow</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04]">
              <Timer className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-mono text-white/80 tracking-wide">{formatDelay()}</span>
            </div>
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Set delay duration</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Days, hours, or minutes</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(TimerNode);
