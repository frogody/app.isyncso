/**
 * UpdateStatusNode - Update prospect pipeline status
 * Glass morphism card with slate accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { RefreshCw, Tag } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

const STATUS_STYLES = {
  new: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  contacted: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  engaged: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  qualified: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  meeting_scheduled: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  won: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  lost: 'bg-red-500/15 text-red-300 border-red-500/20',
};

function UpdateStatusNode({ data, selected }) {
  const isConfigured = !!data?.status;
  const statusStyle = STATUS_STYLES[data?.status] || 'bg-white/[0.06] text-zinc-400 border-white/[0.08]';

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-slate-400/50 shadow-[0_0_24px_rgba(148,163,184,0.1)] ring-1 ring-slate-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-slate-500/15 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Update Status</span>
        </div>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Updates prospect's pipeline status</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04]">
              <Tag className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <span className={`text-[11px] px-2 py-0.5 rounded-md border capitalize font-medium ${statusStyle}`}>
                {data.status.replace('_', ' ')}
              </span>
            </div>
            {data?.notes && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{data.notes}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Select target status</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Choose from 7 pipeline stages</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(UpdateStatusNode);
