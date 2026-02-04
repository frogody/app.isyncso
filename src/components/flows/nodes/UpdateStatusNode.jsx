/**
 * UpdateStatusNode - Update prospect status
 * Gray themed, edit icon, configures status updates
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Edit3, Tag, FileText } from 'lucide-react';

function UpdateStatusNode({ data, selected }) {
  return (
    <div
      className={`
        relative w-[200px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-zinc-400 shadow-lg shadow-zinc-500/20 ring-2 ring-zinc-400/30'
          : 'border-zinc-500/50 hover:border-zinc-400'
        }
        bg-gradient-to-br from-zinc-900/90 to-zinc-800/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-600/30">
        <div className="p-1.5 rounded-lg bg-zinc-600/20">
          <Edit3 className="w-4 h-4 text-zinc-400" />
        </div>
        <span className="text-sm font-medium text-zinc-100">Update Status</span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {data?.name && (
          <p className="text-sm font-medium text-zinc-100 truncate">
            {data.name}
          </p>
        )}

        {data?.status && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-600/10">
            <Tag className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-200 capitalize">
              {data.status.replace('_', ' ')}
            </span>
          </div>
        )}

        {data?.notes && (
          <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-zinc-600/10">
            <FileText className="w-4 h-4 text-zinc-400 mt-0.5" />
            <p className="text-xs text-zinc-300/70 line-clamp-2">
              {data.notes}
            </p>
          </div>
        )}

        {data?.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-600/30 text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {!data?.status && !data?.name && (
          <p className="text-xs text-zinc-400/50 italic">
            Configure status update...
          </p>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-950"
      />
    </div>
  );
}

export default memo(UpdateStatusNode);
