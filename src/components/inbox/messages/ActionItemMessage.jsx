import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, AlertTriangle, Calendar, User, Link2 } from 'lucide-react';

const PRIORITY_CONFIG = {
  high: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    label: 'High',
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    label: 'Medium',
  },
  low: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
    label: 'Low',
  },
};

export default function ActionItemMessage({ messageId, actionItem, onToggleComplete, onAssign }) {
  const isDone = actionItem.status === 'done';
  const priority = PRIORITY_CONFIG[actionItem.priority] || PRIORITY_CONFIG.medium;

  const isOverdue = React.useMemo(() => {
    if (!actionItem.dueDate || isDone) return false;
    return new Date(actionItem.dueDate) < new Date();
  }, [actionItem.dueDate, isDone]);

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays <= 7) return `${diffDays}d left`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleToggle = () => {
    onToggleComplete?.(messageId, actionItem);
  };

  return (
    <motion.div
      layout
      className={`rounded-xl border px-3 py-2.5 max-w-sm transition-all ${
        isDone
          ? 'bg-zinc-800/30 border-zinc-700/30'
          : 'bg-zinc-800/60 border-zinc-700/50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className="mt-0.5 flex-shrink-0 transition-colors"
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className={`w-5 h-5 ${priority.color} hover:opacity-80`} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${
            isDone ? 'text-zinc-500 line-through' : 'text-white font-medium'
          }`}>
            {actionItem.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {/* Priority badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${priority.bg} ${priority.color} border ${priority.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>

            {/* Assignee */}
            {actionItem.assignee && (
              <button
                onClick={() => onAssign?.(messageId, actionItem)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                <User className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{actionItem.assignee}</span>
              </button>
            )}

            {/* Due date */}
            {actionItem.dueDate && (
              <span className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-400' : isDone ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                {isOverdue && !isDone ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                {formatDueDate(actionItem.dueDate)}
              </span>
            )}

            {/* Source link */}
            {actionItem.sourceMessageId && (
              <a
                href={`#message-${actionItem.sourceMessageId}`}
                className="flex items-center gap-0.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
                title="Jump to source message"
              >
                <Link2 className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
