/**
 * FollowUpNode - Multi-step follow-up sequence
 * Glass morphism card with indigo accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers, Mail, Linkedin, MessageSquare } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

const CHANNEL_ICONS = {
  email: Mail,
  linkedin: Linkedin,
  sms: MessageSquare
};

function FollowUpNode({ data, selected }) {
  const channel = data?.channel || 'email';
  const ChannelIcon = CHANNEL_ICONS[channel] || Mail;
  const followUpCount = data?.follow_up_count || 1;
  const isConfigured = !!data?.prompt;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-indigo-400/50 shadow-[0_0_24px_rgba(99,102,241,0.12)] ring-1 ring-indigo-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <Layers className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Follow Up</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-mono font-medium">
          #{followUpCount}
        </span>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Sends follow-up via chosen channel</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-medium capitalize flex items-center gap-1">
                <ChannelIcon className="w-3 h-3" />
                {channel}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                Custom prompt
              </span>
            </div>
            {data?.prompt && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{data.prompt}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Set up follow-up</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Choose channel & write prompt</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(FollowUpNode);
