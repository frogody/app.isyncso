import React from "react";
import { GripVertical, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

/**
 * WidgetWrapper - Shared wrapper component for all summary widgets
 * Provides drag handle, collapse/expand, and remove functionality
 */
const WidgetWrapper = ({
  children,
  title,
  icon: Icon,
  iconColor = "text-red-400",
  editMode = false,
  onRemove,
  dragHandleProps,
  collapsed = false,
  onToggleCollapse,
  isEmpty = false,
  compact = false
}) => {
  if (isEmpty && !editMode) return null;

  return (
    <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-zinc-700/30 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <div className="flex items-center gap-3">
          {/* Drag Handle - only in edit mode */}
          {editMode && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 -ml-2 hover:bg-zinc-700/50 rounded transition-colors"
            >
              <GripVertical className="w-4 h-4 text-zinc-500" />
            </div>
          )}

          {/* Icon */}
          {Icon && (
            <div className={`p-1.5 rounded-lg bg-zinc-700/30`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
          )}

          {/* Title */}
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors"
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          )}

          {/* Remove Button - only in edit mode */}
          {editMode && onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group"
            >
              <X className="w-4 h-4 text-zinc-400 group-hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={compact ? 'p-3' : 'p-4'}
        >
          {isEmpty ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No data available
            </p>
          ) : (
            children
          )}
        </motion.div>
      )}
    </div>
  );
};

export default WidgetWrapper;
