/**
 * AIAnalysisNode - Claude-powered analysis step
 * Purple themed, brain icon, configures AI prompts
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Brain, Sparkles } from 'lucide-react';

function AIAnalysisNode({ data, selected }) {
  const isConfigured = !!data?.prompt;
  const modelLabel = data?.model?.includes('sonnet') ? 'Sonnet 4'
    : data?.model?.includes('haiku') ? 'Haiku'
    : null;

  return (
    <div
      className={`
        relative w-[220px] rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-purple-400 shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/30'
          : 'border-purple-500/50 hover:border-purple-400'
        }
        bg-gradient-to-br from-purple-950/90 to-purple-900/80
        backdrop-blur-sm
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-950"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/30">
        <div className="p-1.5 rounded-lg bg-purple-500/20">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <span className="text-sm font-medium text-purple-100">AI Analysis</span>
        <Sparkles className="w-3 h-3 text-purple-300 ml-auto" />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-purple-300/60">Analyzes prospect data with AI</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-purple-100 truncate">{data.name}</p>
            )}
            {data?.prompt && (
              <p className="text-[10px] text-purple-300/70 line-clamp-2">{data.prompt}</p>
            )}
            <div className="flex flex-wrap items-center gap-1">
              {modelLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                  {modelLabel}
                </span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                Custom prompt
              </span>
            </div>
          </>
        ) : (
          <div className="px-2 py-2 rounded-lg border border-dashed border-purple-500/30 bg-purple-500/5">
            <p className="text-xs text-purple-300/80 font-medium">Set up AI prompt</p>
            <p className="text-[10px] text-purple-400/60 mt-0.5">Define what to analyze</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-950"
      />
    </div>
  );
}

export default memo(AIAnalysisNode);
