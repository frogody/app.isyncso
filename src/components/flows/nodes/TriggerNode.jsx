/**
 * TriggerNode - Entry point for flow execution
 * Glass morphism card with emerald accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Zap, Clock, Users, Webhook } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

const TRIGGER_TYPES = {
  manual: { label: 'Manual Start', icon: Play },
  new_prospect: { label: 'New Prospect', icon: Users },
  scheduled: { label: 'Scheduled', icon: Clock },
  webhook: { label: 'Webhook', icon: Zap }
};

function TriggerNode({ data, selected }) {
  const triggerType = data?.trigger_type || 'manual';
  const triggerConfig = TRIGGER_TYPES[triggerType] || TRIGGER_TYPES.manual;
  const TriggerIcon = triggerConfig.icon;
  const isConfigured = !!data?.trigger_type;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-emerald-400/50 shadow-[0_0_24px_rgba(52,211,153,0.12)] ring-1 ring-emerald-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Play className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Trigger</span>
        </div>
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Starts the flow when triggered</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04]">
              <TriggerIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-zinc-300 font-medium">{triggerConfig.label}</span>
            </div>
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Select a trigger type</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">How should this flow start?</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-emerald-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(TriggerNode);
