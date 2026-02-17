/**
 * TriggerCard - Display card for a single workflow trigger.
 *
 * Shows event icon, trigger name, condition summary, toggle switch,
 * last triggered timestamp, and action icons showing what happens
 * (post, email, create task, etc.). Glass morphism card with dark theme.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Play, Settings, Clock, CheckCircle, AlertTriangle,
  MessageSquare, Mail, ListTodo, FileText, Bell, PartyPopper,
  RefreshCw, Globe, MoreHorizontal, Trash2, Pencil, Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Map action type id -> icon component
const ACTION_ICON_MAP = {
  post_message: MessageSquare,
  send_email: Mail,
  create_task: ListTodo,
  create_invoice: FileText,
  notify_channel: Bell,
  celebrate: PartyPopper,
  update_status: RefreshCw,
  webhook: Globe,
};

// Map action type id -> color
const ACTION_COLOR_MAP = {
  post_message: 'text-cyan-400',
  send_email: 'text-blue-400',
  create_task: 'text-amber-400',
  create_invoice: 'text-green-400',
  notify_channel: 'text-purple-400',
  celebrate: 'text-pink-400',
  update_status: 'text-teal-400',
  webhook: 'text-zinc-400',
};

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

const TriggerCard = memo(function TriggerCard({
  trigger,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onRunNow,
  index = 0,
}) {
  const {
    id,
    name,
    description,
    eventType,
    conditions,
    actions,
    enabled,
    lastTriggeredAt,
    triggerCount,
  } = trigger;

  const conditionSummary = useMemo(() => {
    if (!conditions || conditions.length === 0) return 'No conditions';
    if (conditions.length === 1) {
      const c = conditions[0];
      return `${c.field} ${c.operator?.replace(/_/g, ' ')} ${c.value}`;
    }
    return `${conditions.length} conditions`;
  }, [conditions]);

  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      onToggle?.(id);
    },
    [id, onToggle]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={`group relative rounded-xl border transition-all duration-200 ${
        enabled
          ? 'bg-zinc-900/60 border-zinc-800/60 hover:border-cyan-500/30'
          : 'bg-zinc-950/40 border-zinc-800/30 opacity-60'
      }`}
    >
      <div className="p-4">
        {/* Top row: event badge + name + toggle */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Event icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                enabled
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'bg-zinc-800/50 text-zinc-500'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-medium text-zinc-200 truncate">
                {name}
              </h4>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {eventType?.replace(/_/g, ' ')} &middot; {conditionSummary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Toggle switch */}
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                enabled ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
                  enabled ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50 transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => onEdit?.(trigger)}
                  className="text-zinc-300 hover:text-white focus:text-white"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicate?.(trigger)}
                  className="text-zinc-300 hover:text-white focus:text-white"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRunNow?.(trigger)}
                  className="text-cyan-400 hover:text-cyan-300 focus:text-cyan-300"
                >
                  <Play className="w-3.5 h-3.5 mr-2" />
                  Run Now
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => onDelete?.(id)}
                  className="text-red-400 hover:text-red-300 focus:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Description (if any) */}
        {description && (
          <p className="text-[11px] text-zinc-500 mb-3 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {/* Bottom row: action icons + last triggered */}
        <div className="flex items-center justify-between">
          {/* Action icons */}
          <div className="flex items-center gap-1">
            {(actions || []).map((action, i) => {
              const Icon = ACTION_ICON_MAP[action.type] || Zap;
              const color = ACTION_COLOR_MAP[action.type] || 'text-zinc-400';
              return (
                <div
                  key={`${action.type}-${i}`}
                  className={`w-6 h-6 rounded-md flex items-center justify-center bg-zinc-800/60 ${color}`}
                  title={action.type?.replace(/_/g, ' ')}
                >
                  <Icon className="w-3 h-3" />
                </div>
              );
            })}
            {(!actions || actions.length === 0) && (
              <span className="text-[10px] text-zinc-600 italic">No actions</span>
            )}
          </div>

          {/* Last triggered + count */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            {triggerCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500/70" />
                {triggerCount}x
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(lastTriggeredAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default TriggerCard;
