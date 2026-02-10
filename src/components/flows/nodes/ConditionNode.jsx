/**
 * ConditionNode - Branching/decision step
 * Glass morphism card with cyan accent, dual output handles
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

function ConditionNode({ data, selected }) {
  const conditions = data?.conditions || [];
  const firstCondition = conditions[0];
  const isConfigured = conditions.length > 0 && !!firstCondition?.field;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-cyan-400/50 shadow-[0_0_24px_rgba(6,182,212,0.12)] ring-1 ring-cyan-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Condition</span>
        </div>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Routes flow based on conditions</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="px-3 py-2 rounded-xl bg-white/[0.04]">
              <div className="text-[11px] text-zinc-400 truncate font-mono">
                <span className="text-cyan-300">{firstCondition.field}</span>
                <span className="mx-1.5 text-zinc-600">{firstCondition.operator}</span>
                <span className="text-white/70">{String(firstCondition.value)}</span>
              </div>
            </div>
            {conditions.length > 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                +{conditions.length - 1} more condition{conditions.length > 2 ? 's' : ''}
              </span>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Add conditions</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Define branching rules</p>
          </div>
        )}

        {/* Branch Labels */}
        <div className="flex justify-between pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">True</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-medium">False</span>
            <div className="w-4 h-4 rounded-full bg-red-500/15 flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* True Branch Handle (Left) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-2.5 !h-2.5 !bg-emerald-400 !border-[1.5px] !border-zinc-900 !left-[25%]"
      />

      {/* False Branch Handle (Right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-2.5 !h-2.5 !bg-red-400 !border-[1.5px] !border-zinc-900 !left-[75%]"
      />
    </div>
  );
}

export default memo(ConditionNode);
