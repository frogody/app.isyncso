/**
 * TimerNode - Delay/wait step
 * Orange themed, clock icon, configures delay duration
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Timer } from 'lucide-react';

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
        relative w-[220px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-orange-400 shadow-lg shadow-orange-500/20 ring-2 ring-orange-400/30'
          : 'border-orange-500/50 hover:border-orange-400'
        }
        bg-gradient-to-br from-orange-950/90 to-orange-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-orange-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-orange-500/30">
        <div className="p-1.5 rounded-lg bg-orange-500/20">
          <Clock className="w-4 h-4 text-orange-400" />
        </div>
        <span className="text-sm font-medium text-orange-100">Timer</span>
        <div className={`ml-auto w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-orange-300/60">Waits before continuing the flow</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-orange-100 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/10">
              <Timer className="w-3.5 h-3.5 text-orange-300" />
              <span className="text-sm font-mono text-orange-200">{formatDelay()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                Wait {formatDelay()}
              </span>
            </div>
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-orange-500/30 bg-orange-500/5">
            <p className="text-xs text-orange-300/80 font-medium">Set delay duration</p>
            <p className="text-[10px] text-orange-400/60 mt-0.5">Days, hours, or minutes</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-orange-950"
      />
    </div>
  );
}

export default memo(TimerNode);
