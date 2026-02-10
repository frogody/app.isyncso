/**
 * GmailNode - Read/send emails via Gmail (Composio)
 * Glass morphism card with Gmail red accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mail, Inbox, FileEdit } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

const ACTION_LABELS = {
  send_email: 'Send Email',
  fetch_emails: 'Read Emails',
  create_draft: 'Create Draft',
};

const ACTION_ICONS = {
  send_email: Mail,
  fetch_emails: Inbox,
  create_draft: FileEdit,
};

function GmailNode({ data, selected }) {
  const action = data?.action || 'send_email';
  const ActionIcon = ACTION_ICONS[action] || Mail;
  const isConfigured = !!data?.action && (data.action !== 'send_email' || !!data?.recipient);

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-[#EA4335]/50 shadow-[0_0_24px_rgba(234,67,53,0.12)] ring-1 ring-[#EA4335]/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#EA4335] !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-[#EA4335]/15 flex items-center justify-center">
          <Mail className="w-4 h-4 text-[#EA4335]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Gmail</span>
        </div>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Read or send emails via Gmail</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EA4335]/15 text-red-300 font-medium flex items-center gap-1">
                <ActionIcon className="w-3 h-3" />
                {ACTION_LABELS[action] || action}
              </span>
              {data?.recipient && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium truncate max-w-[120px]">
                  {data.recipient}
                </span>
              )}
              {data?.use_ai && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 font-medium">
                  AI
                </span>
              )}
            </div>
            {data?.subject && (
              <p className="text-[11px] text-zinc-500 line-clamp-1 leading-relaxed">{data.subject}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure Gmail</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Send, read, or draft emails</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#EA4335] !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(GmailNode);
