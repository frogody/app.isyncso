/**
 * TriggerNode - Entry point for flow execution
 * Green themed, play icon, configures trigger conditions
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Zap, Clock, Users } from 'lucide-react';

const TRIGGER_TYPES = {
  manual: { label: 'Manual Start', icon: Play, description: 'Manually triggered' },
  new_prospect: { label: 'New Prospect', icon: Users, description: 'When prospect is added' },
  scheduled: { label: 'Scheduled', icon: Clock, description: 'At scheduled time' },
  webhook: { label: 'Webhook', icon: Zap, description: 'External webhook trigger' }
};

function TriggerNode({ data, selected }) {
  const triggerType = data?.trigger_type || 'manual';
  const triggerConfig = TRIGGER_TYPES[triggerType] || TRIGGER_TYPES.manual;
  const TriggerIcon = triggerConfig.icon;

  return (
    <div
      className={`
        relative w-[200px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/30'
          : 'border-emerald-500/50 hover:border-emerald-400'
        }
        bg-gradient-to-br from-emerald-950/90 to-emerald-900/80
        backdrop-blur-sm
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/30">
        <div className="p-1.5 rounded-lg bg-emerald-500/20">
          <Play className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-emerald-100">Trigger</span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10">
          <TriggerIcon className="w-4 h-4 text-emerald-300" />
          <span className="text-xs text-emerald-200">{triggerConfig.label}</span>
        </div>

        {data?.name && (
          <p className="text-xs text-emerald-300/70 truncate px-1">
            {data.name}
          </p>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-950"
      />
    </div>
  );
}

export default memo(TriggerNode);
