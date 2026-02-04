/**
 * EndNode - Flow termination point
 * Glass morphism card with rose accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CircleStop, CheckCircle2 } from 'lucide-react';

function EndNode({ data, selected }) {
  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-rose-400/50 shadow-[0_0_24px_rgba(244,63,94,0.12)] ring-1 ring-rose-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-rose-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
          <CircleStop className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">End</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Marks the end of this flow</p>

        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-zinc-300 font-medium">
            {data?.name || 'Flow Complete'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(EndNode);
