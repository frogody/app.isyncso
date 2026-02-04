/**
 * SlackNode - Send Slack messages (Composio)
 * Glass morphism card with Slack purple accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Hash, MessageSquare, Plus } from 'lucide-react';

const ACTION_LABELS = {
  send_message: 'Send Message',
  create_channel: 'Create Channel',
};

function SlackNode({ data, selected }) {
  const action = data?.action || 'send_message';
  const isConfigured = !!data?.action && !!data?.channel;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-[#4A154B]/60 shadow-[0_0_24px_rgba(74,21,75,0.15)] ring-1 ring-[#4A154B]/25'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#E01E5A] !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-[#4A154B]/20 flex items-center justify-center">
          <Hash className="w-4 h-4 text-[#E01E5A]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Slack</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Send messages to Slack channels</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#4A154B]/20 text-pink-300 font-medium">
                {ACTION_LABELS[action] || action}
              </span>
              {data?.channel && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium flex items-center gap-0.5">
                  <Hash className="w-2.5 h-2.5" />
                  {data.channel}
                </span>
              )}
              {data?.use_ai && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 font-medium">
                  AI
                </span>
              )}
            </div>
            {data?.message_prompt && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{data.message_prompt}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure Slack</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Choose channel & compose message</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#E01E5A] !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(SlackNode);
