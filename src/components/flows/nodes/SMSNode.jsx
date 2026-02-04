/**
 * SMSNode - SMS message step
 * Teal themed, phone icon, configures SMS content
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Phone } from 'lucide-react';

function SMSNode({ data, selected }) {
  const isConfigured = !!(data?.prompt || data?.message);

  return (
    <div
      className={`
        relative w-[220px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-teal-400 shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/30'
          : 'border-teal-500/50 hover:border-teal-400'
        }
        bg-gradient-to-br from-teal-950/90 to-teal-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-teal-400 !border-2 !border-teal-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-teal-500/30">
        <div className="p-1.5 rounded-lg bg-teal-500/20">
          <MessageSquare className="w-4 h-4 text-teal-400" />
        </div>
        <span className="text-sm font-medium text-teal-100">SMS</span>
        <Phone className="w-3 h-3 text-teal-300 ml-auto" />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-teal-300/60">Sends SMS message to prospect</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-teal-100 truncate">{data.name}</p>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                AI-generated
              </span>
              {data?.from_number && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                  {data.from_number}
                </span>
              )}
            </div>
            {(data?.prompt || data?.message) && (
              <p className="text-[10px] text-teal-300/70 line-clamp-2">
                {data.prompt || data.message}
              </p>
            )}
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-teal-500/30 bg-teal-500/5">
            <p className="text-xs text-teal-300/80 font-medium">Configure SMS</p>
            <p className="text-[10px] text-teal-400/60 mt-0.5">Set message prompt & sender</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-teal-400 !border-2 !border-teal-950"
      />
    </div>
  );
}

export default memo(SMSNode);
