/**
 * SendEmailNode - Email sending step
 * Blue themed, mail icon, configures email content
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mail, Send } from 'lucide-react';

function SendEmailNode({ data, selected }) {
  return (
    <div
      className={`
        relative w-[200px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30'
          : 'border-blue-500/50 hover:border-blue-400'
        }
        bg-gradient-to-br from-blue-950/90 to-blue-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/30">
        <div className="p-1.5 rounded-lg bg-blue-500/20">
          <Mail className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-sm font-medium text-blue-100">Send Email</span>
        <Send className="w-3 h-3 text-blue-300 ml-auto" />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {data?.name && (
          <p className="text-sm font-medium text-blue-100 truncate">
            {data.name}
          </p>
        )}

        {data?.email_type && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 capitalize">
              {data.email_type.replace('_', ' ')}
            </span>
          </div>
        )}

        {data?.subject && (
          <p className="text-xs text-blue-300/70 truncate">
            Subject: {data.subject}
          </p>
        )}

        {!data?.name && !data?.email_type && (
          <p className="text-xs text-blue-400/50 italic">
            Configure email...
          </p>
        )}

        {data?.send_at && (
          <p className="text-[10px] text-blue-400/60">
            Scheduled: {new Date(data.send_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-950"
      />
    </div>
  );
}

export default memo(SendEmailNode);
