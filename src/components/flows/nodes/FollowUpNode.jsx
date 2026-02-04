/**
 * FollowUpNode - Multi-step follow-up sequence
 * Indigo themed, layers icon, configures follow-up sequence
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers, Mail, Linkedin, MessageSquare } from 'lucide-react';

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
        relative w-[220px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-indigo-400 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/30'
          : 'border-indigo-500/50 hover:border-indigo-400'
        }
        bg-gradient-to-br from-indigo-950/90 to-indigo-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-indigo-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-500/30">
        <div className="p-1.5 rounded-lg bg-indigo-500/20">
          <Layers className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="text-sm font-medium text-indigo-100">Follow Up</span>
        <div className="ml-auto px-1.5 py-0.5 rounded bg-indigo-500/30 text-[10px] text-indigo-200">
          #{followUpCount}
        </div>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-indigo-300/60">Sends follow-up via chosen channel</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-indigo-100 truncate">{data.name}</p>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 capitalize flex items-center gap-1">
                <ChannelIcon className="w-3 h-3" />
                {channel}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                Custom prompt
              </span>
            </div>
            {data?.prompt && (
              <p className="text-[10px] text-indigo-300/70 line-clamp-2">{data.prompt}</p>
            )}
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-indigo-500/30 bg-indigo-500/5">
            <p className="text-xs text-indigo-300/80 font-medium">Set up follow-up</p>
            <p className="text-[10px] text-indigo-400/60 mt-0.5">Choose channel & write prompt</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-indigo-950"
      />
    </div>
  );
}

export default memo(FollowUpNode);
