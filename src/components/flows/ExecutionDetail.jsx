/**
 * ExecutionDetail - Detailed view of a flow execution
 * Shows timeline of node executions with expandable details
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  Mail,
  Timer,
  GitBranch,
  Brain,
  Linkedin,
  Phone,
  RefreshCw,
  Settings,
  StopCircle,
  Loader2,
  Code,
  FileText,
  Wrench
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

// Node type icons
const NODE_ICONS = {
  trigger: Play,
  start: Play,
  aiAnalysis: Brain,
  ai_analysis: Brain,
  research: Brain,
  researchProspect: Brain,
  sendEmail: Mail,
  send_email: Mail,
  linkedinMessage: Linkedin,
  linkedin: Linkedin,
  sms: Phone,
  timer: Timer,
  delay: Timer,
  condition: GitBranch,
  branch: GitBranch,
  followUp: RefreshCw,
  follow_up: RefreshCw,
  updateStatus: Settings,
  update_status: Settings,
  end: StopCircle
};

// Status configuration
const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    dotColor: 'bg-zinc-500'
  },
  running: {
    icon: Loader2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    dotColor: 'bg-cyan-500',
    animated: true
  },
  completed: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dotColor: 'bg-red-500'
  },
  skipped: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dotColor: 'bg-amber-500'
  }
};

// Format duration
function formatDuration(startTime, endTime) {
  if (!startTime) return '-';
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;

  if (diffMs < 1000) return '< 1s';
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s`;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

// JSON viewer component
function JsonViewer({ data, label }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return null;
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Code className="w-3 h-3" />
        {label}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto"
          >
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

// Node execution item
function NodeExecutionItem({ nodeExec, nodeDef, isLast }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = STATUS_CONFIG[nodeExec.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const NodeIcon = NODE_ICONS[nodeDef?.type] || Zap;

  const aiResponse = nodeExec.output_data?.ai_response || nodeExec.output_data?.response;
  const toolCalls = nodeExec.output_data?.tool_calls;
  const tokensUsed = nodeExec.output_data?.tokens_used || nodeExec.output_data?.usage;

  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[9px] top-8 bottom-0 w-0.5 bg-zinc-800" />
      )}

      {/* Timeline dot */}
      <div className={`absolute left-0 top-2 w-5 h-5 rounded-full border-2 border-zinc-900 ${config.dotColor} ${config.animated ? 'animate-pulse' : ''}`} />

      {/* Content */}
      <div
        className={`ml-4 p-4 rounded-xl border ${config.border} ${config.bg} cursor-pointer transition-colors hover:bg-opacity-80`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-zinc-800 ${config.color}`}>
              <NodeIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">
                {nodeDef?.data?.label || nodeDef?.type || 'Unknown Node'}
              </h4>
              <p className="text-xs text-zinc-500">{nodeDef?.type}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Duration */}
            {nodeExec.started_at && (
              <span className="text-xs text-zinc-400">
                {formatDuration(nodeExec.started_at, nodeExec.completed_at)}
              </span>
            )}

            {/* Status */}
            <div className={`flex items-center gap-1.5 ${config.color}`}>
              <StatusIcon className={`w-4 h-4 ${config.animated ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium capitalize">{nodeExec.status}</span>
            </div>

            {/* Expand */}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {nodeExec.error_message && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{nodeExec.error_message}</p>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-4 border-t border-zinc-700/50 pt-4"
            >
              {/* AI Response */}
              {aiResponse && (
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    AI Response
                  </h5>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-200 whitespace-pre-wrap">
                      {typeof aiResponse === 'string' ? aiResponse : aiResponse.content || JSON.stringify(aiResponse)}
                    </p>
                  </div>
                </div>
              )}

              {/* Tool Calls */}
              {toolCalls && toolCalls.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Tool Calls ({toolCalls.length})
                  </h5>
                  <div className="space-y-2">
                    {toolCalls.map((call, idx) => (
                      <div key={idx} className="p-2 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Code className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs font-mono text-cyan-300">{call.name || call.function?.name}</span>
                        </div>
                        {call.arguments && (
                          <pre className="text-xs text-zinc-400 overflow-x-auto">
                            {typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tokens Used */}
              {tokensUsed && (
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Tokens: {tokensUsed.total_tokens || (tokensUsed.input_tokens + tokensUsed.output_tokens) || '-'}
                  </span>
                  {tokensUsed.input_tokens && (
                    <span>Input: {tokensUsed.input_tokens}</span>
                  )}
                  {tokensUsed.output_tokens && (
                    <span>Output: {tokensUsed.output_tokens}</span>
                  )}
                </div>
              )}

              {/* Input Context */}
              <JsonViewer data={nodeExec.input_context} label="Input Context" />

              {/* Output Data */}
              <JsonViewer data={nodeExec.output_data} label="Output Data" />

              {/* Full Node Config */}
              <JsonViewer data={nodeDef?.data} label="Node Configuration" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ExecutionDetail({ execution }) {
  const [nodeExecutions, setNodeExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  const flow = execution.outreach_flows || {};
  const prospect = execution.prospects || {};
  const nodes = flow.nodes || [];

  // Build node map for quick lookup
  const nodeMap = {};
  nodes.forEach(node => {
    nodeMap[node.id] = node;
  });

  // Load detailed node executions
  useEffect(() => {
    const loadNodeExecutions = async () => {
      try {
        const { data, error } = await supabase
          .from('node_executions')
          .select('*')
          .eq('execution_id', execution.id)
          .order('started_at', { ascending: true });

        if (error) throw error;
        setNodeExecutions(data || []);
      } catch (error) {
        console.error('Failed to load node executions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNodeExecutions();
  }, [execution.id]);

  // Combine node executions with node definitions
  const executionTimeline = nodeExecutions.map(nodeExec => ({
    ...nodeExec,
    nodeDef: nodeMap[nodeExec.node_id]
  }));

  return (
    <div className="p-6 border-t border-zinc-800 bg-zinc-900/30">
      {/* Execution Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <h4 className="text-xs font-medium text-zinc-500 mb-1">Prospect</h4>
          <p className="text-sm text-white">
            {prospect.full_name || prospect.name || 'Unknown'}
          </p>
          <p className="text-xs text-zinc-400">{prospect.email}</p>
        </div>
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <h4 className="text-xs font-medium text-zinc-500 mb-1">Started</h4>
          <p className="text-sm text-white">
            {execution.started_at
              ? new Date(execution.started_at).toLocaleString()
              : new Date(execution.created_at).toLocaleString()
            }
          </p>
        </div>
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <h4 className="text-xs font-medium text-zinc-500 mb-1">Duration</h4>
          <p className="text-sm text-white">
            {formatDuration(
              execution.started_at || execution.created_at,
              execution.completed_at
            )}
          </p>
        </div>
      </div>

      {/* Execution Context */}
      {execution.execution_context && Object.keys(execution.execution_context).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Execution Context
          </h4>
          <JsonViewer data={execution.execution_context} label="View Context" />
        </div>
      )}

      {/* Node Timeline */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Execution Timeline
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : executionTimeline.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No node executions yet
          </div>
        ) : (
          <div className="space-y-4">
            {executionTimeline.map((nodeExec, idx) => (
              <NodeExecutionItem
                key={nodeExec.id}
                nodeExec={nodeExec}
                nodeDef={nodeExec.nodeDef}
                isLast={idx === executionTimeline.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error Details */}
      {execution.error_message && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Execution Error
          </h4>
          <p className="text-sm text-red-300">{execution.error_message}</p>
        </div>
      )}
    </div>
  );
}
