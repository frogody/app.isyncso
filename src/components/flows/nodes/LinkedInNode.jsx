/**
 * LinkedInNode - LinkedIn message step
 * LinkedIn blue themed, configures connection request or message
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
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={`
        relative min-w-[200px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-[#0A66C2] shadow-lg shadow-[#0A66C2]/20 ring-2 ring-[#0A66C2]/30'
          : 'border-[#0A66C2]/50 hover:border-[#0A66C2]'
        }
        bg-gradient-to-br from-[#0A66C2]/20 to-[#004182]/30
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#0A66C2] !border-2 !border-[#001830]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#0A66C2]/30">
        <div className="p-1.5 rounded-lg bg-[#0A66C2]/20">
          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
        </div>
        <span className="text-sm font-medium text-blue-100">LinkedIn</span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {data?.name && (
          <p className="text-sm font-medium text-blue-100 truncate">
            {data.name}
          </p>
        )}

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0A66C2]/10">
          <TypeIcon className="w-4 h-4 text-[#0A66C2]" />
          <span className="text-xs text-blue-200">{typeConfig.label}</span>
        </div>

        {data?.message && (
          <p className="text-xs text-blue-300/70 line-clamp-2">
            {data.message}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-blue-400/60">
            Max: {typeConfig.limit} chars
          </span>
          {data?.message && (
            <span className={`text-[10px] ${
              data.message.length > typeConfig.limit ? 'text-red-400' : 'text-blue-400/60'
            }`}>
              {data.message.length}/{typeConfig.limit}
            </span>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#0A66C2] !border-2 !border-[#001830]"
      />
    </div>
  );
}

export default memo(LinkedInNode);
