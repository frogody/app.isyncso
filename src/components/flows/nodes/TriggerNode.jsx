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
  const isConfigured = !!data?.trigger_type;

  return (
    <div
      className={`
        relative w-[220px] rounded-xl border-2 transition-all duration-200
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
        <div className={`ml-auto w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-emerald-300/60">Starts the flow when triggered</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-emerald-100 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10">
              <TriggerIcon className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-xs text-emerald-200">{triggerConfig.label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {triggerConfig.label}
              </span>
            </div>
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5">
            <p className="text-xs text-emerald-300/80 font-medium">Select a trigger type</p>
            <p className="text-[10px] text-emerald-400/60 mt-0.5">How should this flow start?</p>
          </div>
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
