/**
 * NodePalette - Draggable list of available node types
 * Grouped by category with drag-to-canvas functionality
 */

import React, { useState } from 'react';
import {
  Play, Brain, Mail, Clock, GitBranch, Linkedin,
  MessageSquare, Layers, Edit3, Square, Search,
  ChevronDown, ChevronRight, GripVertical,
  Table, Hash, Users, Webhook, Bot
} from 'lucide-react';
import { nodePaletteConfig } from './nodes';

const NODE_ICONS = {
  trigger: Play,
  timer: Clock,
  condition: GitBranch,
  end: Square,
  aiAnalysis: Brain,
  research: Search,
  sendEmail: Mail,
  linkedin: Linkedin,
  sms: MessageSquare,
  followUp: Layers,
  updateStatus: Edit3,
  gmail: Mail,
  googleSheets: Table,
  slack: Hash,
  hubspot: Users,
  webhookTrigger: Webhook,
  aiAgent: Bot
};

const COLOR_CLASSES = {
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  linkedin: 'bg-[#0A66C2]/20 text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/30',
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30 hover:bg-teal-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30',
  zinc: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30',
  fuchsia: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 hover:bg-fuchsia-500/30',
  gmail: 'bg-[#EA4335]/20 text-[#EA4335] border-[#EA4335]/30 hover:bg-[#EA4335]/30',
  sheets: 'bg-[#0F9D58]/20 text-[#0F9D58] border-[#0F9D58]/30 hover:bg-[#0F9D58]/30',
  slack: 'bg-[#4A154B]/20 text-[#E01E5A] border-[#4A154B]/30 hover:bg-[#4A154B]/30',
  hubspot: 'bg-[#FF7A59]/20 text-[#FF7A59] border-[#FF7A59]/30 hover:bg-[#FF7A59]/30'
};

function DraggableNode({ node }) {
  const Icon = NODE_ICONS[node.type] || Square;
  const colorClass = COLOR_CLASSES[node.color] || COLOR_CLASSES.zinc;

  const onDragStart = (event) => {
    event.dataTransfer.setData('application/reactflow', node.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        flex items-center gap-3 p-2.5 rounded-lg border cursor-grab
        active:cursor-grabbing transition-all duration-200
        ${colorClass}
      `}
    >
      <GripVertical className="w-4 h-4 opacity-50" />
      <div className="p-1.5 rounded-md bg-white/5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{node.label}</p>
        <p className="text-[10px] text-zinc-400 truncate">{node.description}</p>
      </div>
    </div>
  );
}

function CategoryGroup({ category, nodes, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-white/5 rounded-lg transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {category}
        </span>
        <span className="text-[10px] text-zinc-500 ml-auto">
          {nodes.length}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-2">
          {nodes.map((node) => (
            <DraggableNode key={node.type} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NodePalette({ className = '' }) {
  return (
    <div className={`
      flex flex-col h-full bg-zinc-900/50 border-r border-zinc-800
      ${className}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Nodes</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Drag nodes to the canvas
        </p>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-3">
        {nodePaletteConfig.map((group) => (
          <CategoryGroup
            key={group.category}
            category={group.category}
            nodes={group.nodes}
          />
        ))}
      </div>

      {/* Tips */}
      <div className="p-3 border-t border-zinc-800">
        <div className="p-2 rounded-lg bg-zinc-800/50 text-[10px] text-zinc-400">
          <p className="font-medium text-zinc-300 mb-1">Tips:</p>
          <ul className="space-y-0.5">
            <li>• Drag nodes onto canvas</li>
            <li>• Connect handles to link</li>
            <li>• Click node to configure</li>
            <li>• Delete: select + backspace</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
