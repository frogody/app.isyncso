/**
 * AIAnalysisNode - AI-powered analysis step
 * Glass morphism card with violet accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles } from 'lucide-react';

function AIAnalysisNode({ data, selected }) {
  const isConfigured = !!data?.prompt;
  const model = data?.model || 'sonnet';
  const modelLabel = model?.includes('haiku') ? 'Haiku' : 'Sonnet 4';

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-violet-400/50 shadow-[0_0_24px_rgba(139,92,246,0.12)] ring-1 ring-violet-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-violet-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">AI Analysis</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Analyzes prospect data with AI</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 font-medium">
                {modelLabel}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                Custom prompt
              </span>
            </div>
            {data?.prompt && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{data.prompt}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Set up AI prompt</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Define what to analyze</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-violet-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(AIAnalysisNode);
