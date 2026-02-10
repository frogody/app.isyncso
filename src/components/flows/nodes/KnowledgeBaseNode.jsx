/**
 * KnowledgeBaseNode - RAG knowledge source for AI nodes
 * Glass morphism card with cyan accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BookOpen, Database, FileText } from 'lucide-react';
import SettingsIndicator from './SettingsIndicator';

function KnowledgeBaseNode({ data, selected }) {
  const collections = data?.collections || [];
  const isConfigured = collections.length > 0 || !!data?.search_query;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-cyan-400/50 shadow-[0_0_24px_rgba(34,211,238,0.12)] ring-1 ring-cyan-400/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Knowledge Base</span>
        </div>
        {collections.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-mono font-medium">
            {collections.length}
          </span>
        )}
        <SettingsIndicator />
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Search & inject knowledge context</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              {collections.slice(0, 3).map(col => (
                <span key={col} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-medium flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  {col}
                </span>
              ))}
              {collections.length > 3 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
                  +{collections.length - 3} more
                </span>
              )}
            </div>
            {data?.search_query && (
              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed flex items-center gap-1">
                <FileText className="w-3 h-3 shrink-0" />
                {data.search_query}
              </p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure knowledge</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Select collections to search</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(KnowledgeBaseNode);
