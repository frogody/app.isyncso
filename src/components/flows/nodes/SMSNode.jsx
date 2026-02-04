/**
 * SMSNode - SMS message step
 * Green themed, phone icon, configures SMS content
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Phone } from 'lucide-react';

const SMS_CHAR_LIMIT = 160;

function SMSNode({ data, selected }) {
  const messageLength = data?.message?.length || 0;
  const segments = Math.ceil(messageLength / SMS_CHAR_LIMIT) || 1;

  return (
    <div
      className={`
        relative w-[200px] rounded-xl border-2 transition-all duration-200
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
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {data?.name && (
          <p className="text-sm font-medium text-teal-100 truncate">
            {data.name}
          </p>
        )}

        {data?.message && (
          <p className="text-xs text-teal-300/70 line-clamp-3">
            {data.message}
          </p>
        )}

        {!data?.message && !data?.name && (
          <p className="text-xs text-teal-400/50 italic">
            Configure SMS message...
          </p>
        )}

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-teal-400/60">
            {messageLength} chars ({segments} segment{segments > 1 ? 's' : ''})
          </span>
          {messageLength > SMS_CHAR_LIMIT && (
            <span className="text-amber-400">
              Multi-segment
            </span>
          )}
        </div>

        {data?.from_number && (
          <p className="text-[10px] text-teal-400/60">
            From: {data.from_number}
          </p>
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
