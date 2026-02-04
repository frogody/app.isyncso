/**
 * AIAgentNode - Autonomous AI agent with RAG + Composio tool calling
 * Glass morphism card with pink-violet accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Sparkles, Wrench } from 'lucide-react';

function AIAgentNode({ data, selected }) {
  const isConfigured = !!data?.prompt;
  const maxIterations = data?.max_iterations || 10;
  const allowedIntegrations = data?.allowed_integrations || [];

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-fuchsia-400/50 shadow-[0_0_24px_rgba(232,121,249,0.12)] ring-1 ring-fuchsia-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-fuchsia-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">AI Agent</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-mono font-medium">
          {maxIterations}x
        </span>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Autonomous agent with tools & integrations</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-fuchsia-500/15 text-fuchsia-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                RAG + Tools
              </span>
              {allowedIntegrations.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {allowedIntegrations.length} integration{allowedIntegrations.length !== 1 ? 's' : ''}
                </span>
              )}
              {data?.model && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                  {data.model.includes('haiku') ? 'Haiku' : 'Sonnet'}
                </span>
              )}
            </div>
            {data?.prompt && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{data.prompt}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure agent</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Set prompt & allowed integrations</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-fuchsia-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(AIAgentNode);
