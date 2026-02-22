// ---------------------------------------------------------------------------
// VersionHistory.jsx -- Visual timeline of config snapshots for the Store Builder.
// Allows the user to roll back to any previous state.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, ChevronDown, Clock } from 'lucide-react';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function VersionHistory({ entries, onRestore, canUndo, onUndo }) {
  const [expanded, setExpanded] = useState(false);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="mx-4 mb-2">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800/40 transition-colors cursor-pointer"
      >
        <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
          <History className="w-3 h-3 text-amber-400" />
        </div>
        <span className="text-[11px] font-medium text-zinc-300 flex-1 text-left">
          Version History
        </span>
        <span className="text-[10px] font-mono text-amber-400/70 shrink-0">
          {entries.length} {entries.length === 1 ? 'version' : 'versions'}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 divide-y divide-zinc-800/40 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {/* Current state marker */}
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 ring-2 ring-cyan-400/20" />
                <span className="text-[11px] text-cyan-400 font-medium flex-1">Current state</span>
                <span className="text-[10px] text-zinc-600">now</span>
              </div>

              {entries.map((entry) => (
                <div
                  key={`${entry.index}-${entry.timestamp}`}
                  className="flex items-center gap-2.5 px-3 py-2 group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-400 truncate">{entry.label}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(entry.timestamp)}
                  </span>
                  <button
                    onClick={() => onRestore(entry.index)}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all shrink-0"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
