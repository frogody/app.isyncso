/**
 * LinkedInNode - LinkedIn message step
 * Glass morphism card with LinkedIn blue accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Linkedin, UserPlus, MessageCircle } from 'lucide-react';

const MESSAGE_TYPES = {
  connection_request: { label: 'Connection Request', icon: UserPlus, limit: 300 },
  direct_message: { label: 'Direct Message', icon: MessageCircle, limit: 1900 },
  inmail: { label: 'InMail', icon: MessageCircle, limit: 1900 }
};

function LinkedInNode({ data, selected }) {
  const messageType = data?.message_type || 'connection_request';
  const typeConfig = MESSAGE_TYPES[messageType] || MESSAGE_TYPES.connection_request;
  const isConfigured = !!data?.prompt;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-[#0A66C2]/60 shadow-[0_0_24px_rgba(10,102,194,0.15)] ring-1 ring-[#0A66C2]/25'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#0A66C2] !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-[#0A66C2]/15 flex items-center justify-center">
          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">LinkedIn</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Sends LinkedIn message to prospect</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0A66C2]/15 text-blue-300 font-medium">
                {typeConfig.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                {typeConfig.limit} chars
              </span>
            </div>
            {data?.prompt && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{data.prompt}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Set up message</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Define AI prompt for message</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#0A66C2] !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(LinkedInNode);
