/**
 * HubSpotNode - CRM operations via HubSpot (Composio)
 * Glass morphism card with HubSpot orange accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, UserPlus, Handshake, Mail } from 'lucide-react';

const ACTION_LABELS = {
  create_contact: 'Create Contact',
  create_deal: 'Create Deal',
  send_email: 'Send Email',
};

const ACTION_ICONS = {
  create_contact: UserPlus,
  create_deal: Handshake,
  send_email: Mail,
};

function HubSpotNode({ data, selected }) {
  const action = data?.action || 'create_contact';
  const ActionIcon = ACTION_ICONS[action] || Users;
  const isConfigured = !!data?.action;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-[#FF7A59]/50 shadow-[0_0_24px_rgba(255,122,89,0.12)] ring-1 ring-[#FF7A59]/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#FF7A59] !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-[#FF7A59]/15 flex items-center justify-center">
          <Users className="w-4 h-4 text-[#FF7A59]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">HubSpot</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Create contacts, deals, or send CRM emails</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FF7A59]/15 text-orange-300 font-medium flex items-center gap-1">
                <ActionIcon className="w-3 h-3" />
                {ACTION_LABELS[action] || action}
              </span>
              {data?.email && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium truncate max-w-[120px]">
                  {data.email}
                </span>
              )}
              {data?.deal_name && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium truncate max-w-[120px]">
                  {data.deal_name}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure HubSpot</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Choose CRM action & set fields</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#FF7A59] !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(HubSpotNode);
