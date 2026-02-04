/**
 * DebugPanel - Real-time debug panel for flow testing
 * Shows live execution state, logs, RAG context, and Claude responses
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Database,
  Code,
  Terminal,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';

// Log entry types with icons and colors
const LOG_TYPES = {
  info: { icon: Terminal, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ai: { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  context: { icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  tool: { icon: Code, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  node: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' }
};

// Log entry component
function LogEntry({ log, isExpanded, onToggle }) {
  const config = LOG_TYPES[log.type] || LOG_TYPES.info;
  const Icon = config.icon;
  const hasDetails = log.details || log.data;

  return (
    <div className={`rounded-lg ${config.bg} border border-zinc-800/50`}>
      <div
        className={`flex items-start gap-3 p-3 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && onToggle()}
      >
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm ${config.color}`}>{log.message}</p>
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {log.nodeId && (
            <p className="text-xs text-zinc-500 mt-0.5">Node: {log.nodeId}</p>
          )}
        </div>
        {hasDetails && (
          <button className="text-zinc-500">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800/50"
          >
            <pre className="p-3 text-xs text-zinc-300 overflow-x-auto max-h-48 overflow-y-auto">
              {typeof (log.details || log.data) === 'string'
                ? log.details || log.data
                : JSON.stringify(log.details || log.data, null, 2)
              }
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// RAG Context section
function RagContextSection({ context }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!context) return null;

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/80"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">RAG Context</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-zinc-700/50"
          >
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {context.prospect && (
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-1">Prospect Data</h5>
                  <pre className="text-xs text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(context.prospect, null, 2)}
                  </pre>
                </div>
              )}
              {context.company && (
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-1">Company Intel</h5>
                  <pre className="text-xs text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(context.company, null, 2)}
                  </pre>
                </div>
              )}
              {context.embeddings && (
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-1">Retrieved Embeddings</h5>
                  <p className="text-xs text-zinc-300">{context.embeddings.length} chunks retrieved</p>
                </div>
              )}
              {context.history && (
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-1">Interaction History</h5>
                  <p className="text-xs text-zinc-300">{context.history.length} previous interactions</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DebugPanel({
  execution,
  onClose,
  onHighlightNode,
  className = ''
}) {
  const [logs, setLogs] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [ragContext, setRagContext] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);

  // Add log helper
  const addLog = (type, message, details = null, nodeId = null) => {
    const log = {
      id: Date.now() + Math.random(),
      type,
      message,
      details,
      nodeId,
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [...prev, log]);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Subscribe to execution updates
  useEffect(() => {
    if (!execution?.id) return;

    addLog('info', 'Debug panel connected');
    addLog('info', `Monitoring execution: ${execution.id.slice(0, 8)}...`);

    // Subscribe to node executions
    const channel = supabase
      .channel(`debug-${execution.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'node_executions',
          filter: `execution_id=eq.${execution.id}`
        },
        (payload) => {
          const nodeExec = payload.new;

          if (payload.eventType === 'INSERT') {
            addLog('node', `Starting node: ${nodeExec.node_id}`, null, nodeExec.node_id);
            setCurrentNodeId(nodeExec.node_id);
            onHighlightNode?.(nodeExec.node_id);
          }

          if (payload.eventType === 'UPDATE') {
            if (nodeExec.status === 'completed') {
              addLog('success', `Node completed: ${nodeExec.node_id}`, nodeExec.output_data, nodeExec.node_id);

              // Extract AI response if present
              if (nodeExec.output_data?.ai_response) {
                addLog('ai', 'Claude response received', nodeExec.output_data.ai_response, nodeExec.node_id);
              }

              // Extract tool calls if present
              if (nodeExec.output_data?.tool_calls?.length > 0) {
                addLog('tool', `${nodeExec.output_data.tool_calls.length} tool calls made`, nodeExec.output_data.tool_calls, nodeExec.node_id);
              }
            } else if (nodeExec.status === 'failed') {
              addLog('error', `Node failed: ${nodeExec.error_message || 'Unknown error'}`, nodeExec, nodeExec.node_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [execution?.id, onHighlightNode]);

  // Monitor execution context changes
  useEffect(() => {
    if (execution?.execution_context) {
      setRagContext(execution.execution_context);
      if (execution.execution_context.rag_context) {
        addLog('context', 'RAG context built', execution.execution_context.rag_context);
      }
    }
  }, [execution?.execution_context]);

  // Monitor execution status
  useEffect(() => {
    if (!execution) return;

    if (execution.status === 'completed') {
      addLog('success', 'Execution completed successfully');
    } else if (execution.status === 'failed') {
      addLog('error', `Execution failed: ${execution.error_message || 'Unknown error'}`);
    } else if (execution.status === 'paused') {
      addLog('warning', 'Execution paused');
    }
  }, [execution?.status, execution?.error_message]);

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  return (
    <div className={`bg-zinc-900 border-l border-zinc-800 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Debug Panel</h3>
          {execution?.status === 'running' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-xs text-cyan-400">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`h-7 ${autoScroll ? 'text-cyan-400' : 'text-zinc-400'}`}
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${autoScroll ? 'animate-spin' : ''}`} />
            Auto-scroll
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="h-7 text-zinc-400 hover:text-white"
          >
            Clear
          </Button>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Node Indicator */}
      {currentNodeId && execution?.status === 'running' && (
        <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm text-cyan-300">
              Executing: <span className="font-mono">{currentNodeId}</span>
            </span>
          </div>
        </div>
      )}

      {/* RAG Context */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <RagContextSection context={ragContext} />
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for execution logs...</p>
            </div>
          ) : (
            logs.map(log => (
              <LogEntry
                key={log.id}
                log={log}
                isExpanded={expandedLogId === log.id}
                onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
              />
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{logs.length} log entries</span>
          {execution && (
            <span>
              Status: <span className="text-zinc-300">{execution.status}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
