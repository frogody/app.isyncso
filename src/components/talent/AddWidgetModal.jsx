import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Search,
  Sparkles,
  Clock,
  Target,
  User,
  Award,
  Briefcase,
  Lightbulb,
  BarChart3,
  Check
} from "lucide-react";
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from "./summary-widgets";

// Icon mapping
const ICONS = {
  Sparkles,
  Clock,
  Target,
  User,
  Award,
  Briefcase,
  Lightbulb,
  BarChart3
};

/**
 * AddWidgetModal - Modal for selecting widgets to add to the Summary tab
 */
const AddWidgetModal = ({ open, onClose, widgets, onAddWidget }) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!open) return null;

  // Get enabled widget types
  const enabledTypes = new Set(
    widgets.filter(w => w.enabled).map(w => w.type)
  );

  // Group available widgets by category
  const groupedWidgets = {};
  Object.entries(WIDGET_REGISTRY).forEach(([type, info]) => {
    const category = info.category || 'other';
    if (!groupedWidgets[category]) {
      groupedWidgets[category] = [];
    }
    groupedWidgets[category].push({
      type,
      ...info,
      isEnabled: enabledTypes.has(type)
    });
  });

  // Filter by search
  const filteredWidgets = searchQuery
    ? Object.entries(groupedWidgets).reduce((acc, [cat, items]) => {
        const filtered = items.filter(w =>
          w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) acc[cat] = filtered;
        return acc;
      }, {})
    : groupedWidgets;

  // Sort categories
  const sortedCategories = Object.entries(filteredWidgets)
    .sort((a, b) => {
      const orderA = WIDGET_CATEGORIES[a[0]]?.order ?? 99;
      const orderB = WIDGET_CATEGORIES[b[0]]?.order ?? 99;
      return orderA - orderB;
    });

  const handleAdd = (type) => {
    // Find existing widget config or create new one
    const existingWidget = widgets.find(w => w.type === type);
    if (existingWidget) {
      onAddWidget({ ...existingWidget, enabled: true });
    } else {
      onAddWidget({
        id: type.toLowerCase().replace('widget', ''),
        type,
        order: widgets.length,
        enabled: true
      });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[70] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">Add Widget</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Choose widgets to add to your Summary tab
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-zinc-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search widgets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>

              {/* Widget List */}
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-6">
                {sortedCategories.map(([category, categoryWidgets]) => (
                  <div key={category}>
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                      {WIDGET_CATEGORIES[category]?.label || category}
                    </h3>
                    <div className="space-y-2">
                      {categoryWidgets.map((widget) => {
                        const Icon = ICONS[widget.icon] || BarChart3;
                        return (
                          <div
                            key={widget.type}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              widget.isEnabled
                                ? 'bg-green-500/5 border-green-500/20'
                                : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                widget.isEnabled ? 'bg-green-500/20' : 'bg-zinc-700/50'
                              }`}>
                                <Icon className={`w-4 h-4 ${
                                  widget.isEnabled ? 'text-green-400' : 'text-zinc-400'
                                }`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{widget.title}</p>
                                <p className="text-xs text-zinc-500">{widget.description}</p>
                              </div>
                            </div>
                            {widget.isEnabled ? (
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-xs font-medium text-green-400">
                                <Check className="w-3 h-3" />
                                Added
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAdd(widget.type)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium text-white transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {sortedCategories.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500">No widgets found</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end p-4 border-t border-zinc-700 bg-zinc-800/30">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddWidgetModal;
