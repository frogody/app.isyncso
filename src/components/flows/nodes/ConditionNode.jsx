/**
 * ConditionNode - Branching/decision step
 * Yellow diamond themed, two output handles for true/false branches
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';

function ConditionNode({ data, selected }) {
  const conditions = data?.conditions || [];
  const firstCondition = conditions[0];
  const isConfigured = conditions.length > 0 && !!firstCondition?.field;

  return (
    <div
      className={`
        relative w-[220px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-yellow-400 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/30'
          : 'border-yellow-500/50 hover:border-yellow-400'
        }
        bg-gradient-to-br from-yellow-950/90 to-amber-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-yellow-400 !border-2 !border-yellow-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-yellow-500/30">
        <div className="p-1.5 rounded-lg bg-yellow-500/20">
          <GitBranch className="w-4 h-4 text-yellow-400" />
        </div>
        <span className="text-sm font-medium text-yellow-100">Condition</span>
        <div className={`ml-auto w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-yellow-300/60">Routes flow based on conditions</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-yellow-100 truncate">{data.name}</p>
            )}
            <div className="text-[10px] text-yellow-300/70 px-2 py-1 rounded bg-yellow-500/10 truncate">
              <span className="font-mono">{firstCondition.field}</span>
              <span className="mx-1 text-yellow-400">{firstCondition.operator}</span>
              <span className="font-mono">{String(firstCondition.value)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                {conditions.length} condition{conditions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-yellow-500/30 bg-yellow-500/5">
            <p className="text-xs text-yellow-300/80 font-medium">Add conditions</p>
            <p className="text-[10px] text-yellow-400/60 mt-0.5">Define branching rules</p>
          </div>
        )}

        {/* Branch Labels */}
        <div className="flex justify-between pt-2 border-t border-yellow-500/20">
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-300">True</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-red-300">False</span>
          </div>
        </div>
      </div>

      {/* True Branch Handle (Left) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-yellow-950 !left-[25%]"
      />

      {/* False Branch Handle (Right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-yellow-950 !left-[75%]"
      />
    </div>
  );
}

export default memo(ConditionNode);
