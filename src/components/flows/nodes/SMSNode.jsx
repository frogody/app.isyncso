/**
 * SMSNode - SMS message step
 * Glass morphism card with teal accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Phone } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

function SMSNode({ data, selected }) {
  const isConfigured = !!(data?.prompt || data?.message);

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-teal-400/50 shadow-[0_0_24px_rgba(20,184,166,0.12)] ring-1 ring-teal-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-teal-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">SMS</span>
        </div>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Sends SMS message to prospect</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 font-medium">
                AI-generated
              </span>
              {data?.from_number && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                  {data.from_number}
                </span>
              )}
            </div>
            {(data?.prompt || data?.message) && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                {data.prompt || data.message}
              </p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure SMS</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Set message prompt & sender</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-teal-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(SMSNode);
