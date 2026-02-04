/**
 * EndNode - Flow termination point
 * Red themed, stop icon, marks end of flow
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Square, CheckCircle } from 'lucide-react';

function EndNode({ data, selected }) {
  return (
    <div
      className={`
        relative w-[160px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-red-400 shadow-lg shadow-red-500/20 ring-2 ring-red-400/30'
          : 'border-red-500/50 hover:border-red-400'
        }
        bg-gradient-to-br from-red-950/90 to-red-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/30">
        <div className="p-1.5 rounded-lg bg-red-500/20">
          <Square className="w-4 h-4 text-red-400" />
        </div>
        <span className="text-sm font-medium text-red-100">End</span>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10">
          <CheckCircle className="w-4 h-4 text-red-300" />
          <span className="text-xs text-red-200">
            {data?.name || 'Flow Complete'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(EndNode);
