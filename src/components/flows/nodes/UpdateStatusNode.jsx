/**
 * UpdateStatusNode - Update prospect status
 * Gray themed, edit icon, configures status updates
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Edit3, Tag, FileText } from 'lucide-react';

const STATUS_COLORS = {
  new: 'bg-cyan-500/20 text-cyan-300',
  contacted: 'bg-blue-500/20 text-blue-300',
  engaged: 'bg-indigo-500/20 text-indigo-300',
  qualified: 'bg-purple-500/20 text-purple-300',
  meeting_scheduled: 'bg-amber-500/20 text-amber-300',
  won: 'bg-emerald-500/20 text-emerald-300',
  lost: 'bg-red-500/20 text-red-300',
};

function UpdateStatusNode({ data, selected }) {
  const isConfigured = !!data?.status;
  const statusColor = STATUS_COLORS[data?.status] || 'bg-zinc-500/20 text-zinc-300';

  return (
    <div
      className={`
        relative w-[220px] rounded-xl border-2 transition-all duration-200
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
        <div className={`ml-auto w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-zinc-400/60">Updates prospect's pipeline status</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-zinc-100 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-600/10">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${statusColor}`}>
                {data.status.replace('_', ' ')}
              </span>
            </div>
            {data?.notes && (
              <p className="text-[10px] text-zinc-300/70 line-clamp-2">{data.notes}</p>
            )}
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-zinc-500/30 bg-zinc-500/5">
            <p className="text-xs text-zinc-300/80 font-medium">Select target status</p>
            <p className="text-[10px] text-zinc-400/60 mt-0.5">Choose from 7 pipeline stages</p>
          </div>
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
