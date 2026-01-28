import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  IntelligenceWidget,
  TimingSignalsWidget,
  OutreachWidget,
  ContactInfoWidget,
  SkillsWidget,
  ExperienceWidget,
  KeyInsightsWidget,
  QuickStatsWidget,
  JobSatisfactionWidget,
  WorkHistoryWidget,
  EducationWidget,
  TechStackWidget,
  CompanyOverviewWidget,
  PainPointsWidget,
  DEFAULT_WIDGETS
} from "./summary-widgets";
import AddWidgetModal from "./AddWidgetModal";

// Widget component mapping
const WIDGET_COMPONENTS = {
  IntelligenceWidget,
  TimingSignalsWidget,
  OutreachWidget,
  ContactInfoWidget,
  SkillsWidget,
  ExperienceWidget,
  KeyInsightsWidget,
  QuickStatsWidget,
  JobSatisfactionWidget,
  WorkHistoryWidget,
  EducationWidget,
  TechStackWidget,
  CompanyOverviewWidget,
  PainPointsWidget
};

/**
 * SummaryTabContent - Customizable summary tab with drag-and-drop widgets
 */
const SummaryTabContent = ({
  candidate,
  preferences,
  onUpdatePreferences,
  onSavePreferences,
  saving = false
}) => {
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localWidgets, setLocalWidgets] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize widgets from preferences or defaults
  // Merge saved widgets with defaults to include any new widgets added later
  useEffect(() => {
    const savedWidgets = preferences?.summary_tab?.widgets;
    if (savedWidgets && savedWidgets.length > 0) {
      // Merge saved widgets with defaults to include any new widgets
      const savedTypes = new Set(savedWidgets.map(w => w.type));
      const newWidgets = DEFAULT_WIDGETS.filter(w => !savedTypes.has(w.type));
      setLocalWidgets([...savedWidgets, ...newWidgets]);
    } else {
      setLocalWidgets(DEFAULT_WIDGETS);
    }
  }, [preferences?.summary_tab?.widgets]);

  // Get enabled widgets sorted by order
  const enabledWidgets = localWidgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  // Handle drag end
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(enabledWidgets);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Update order values
    const reorderedWidgets = items.map((item, index) => ({
      ...item,
      order: index
    }));

    // Merge with disabled widgets
    const disabledWidgets = localWidgets.filter(w => !w.enabled);
    const newWidgets = [...reorderedWidgets, ...disabledWidgets];

    setLocalWidgets(newWidgets);
    setHasChanges(true);

    // Auto-save on drag
    saveWidgets(newWidgets);
  };

  // Save widgets to preferences
  const saveWidgets = async (widgets) => {
    const newPrefs = {
      ...preferences,
      summary_tab: {
        ...preferences?.summary_tab,
        enabled: true,
        widgets
      }
    };

    if (onUpdatePreferences) {
      onUpdatePreferences(newPrefs);
    }

    if (onSavePreferences) {
      try {
        await onSavePreferences(newPrefs);
        setHasChanges(false);
      } catch (error) {
        toast.error('Failed to save widget preferences');
        console.error('Failed to save preferences:', error);
      }
    }
  };

  // Handle add widget
  const handleAddWidget = (widgetType) => {
    const widget = localWidgets.find(w => w.type === widgetType);
    if (!widget) return;

    const newWidget = { ...widget, enabled: true };
    const updatedWidgets = localWidgets.map(w =>
      w.id === widget.id ? newWidget : w
    );

    setLocalWidgets(updatedWidgets);
    setHasChanges(true);
    setShowAddModal(false);

    // Auto-save on add
    saveWidgets(updatedWidgets);
  };

  // Handle remove widget
  const handleRemoveWidget = (widgetId) => {
    const updatedWidgets = localWidgets.map(w =>
      w.id === widgetId ? { ...w, enabled: false } : w
    );

    setLocalWidgets(updatedWidgets);
    setHasChanges(true);

    // Auto-save on remove
    saveWidgets(updatedWidgets);
  };

  // Render widget component
  const renderWidget = (widget, index) => {
    const WidgetComponent = WIDGET_COMPONENTS[widget.type];
    if (!WidgetComponent) return null;

    return (
      <Draggable
        key={widget.id}
        draggableId={widget.id}
        index={index}
        isDragDisabled={!editMode}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`transition-shadow ${
              snapshot.isDragging ? 'shadow-2xl' : ''
            }`}
          >
            <WidgetComponent
              candidate={candidate}
              editMode={editMode}
              onRemove={() => handleRemoveWidget(widget.id)}
              dragHandleProps={provided.dragHandleProps}
            />
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editMode ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Widget
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium text-white transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Done
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Customize
            </button>
          )}
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {/* Edit Mode Instructions */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400">
                Drag widgets to reorder. Click the X to remove a widget. Click "Add Widget" to add more.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widgets */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="summary-widgets">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-4 min-h-[200px] rounded-xl transition-colors ${
                snapshot.isDraggingOver ? 'bg-zinc-800/30' : ''
              }`}
            >
              {enabledWidgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                    <Settings className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Widgets Added
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4 max-w-xs">
                    Customize your summary view by adding widgets that matter to you.
                  </p>
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Widget
                  </button>
                </div>
              ) : (
                enabledWidgets.map((widget, index) => renderWidget(widget, index))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Widget Modal */}
      <AddWidgetModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        widgets={localWidgets}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
};

export default SummaryTabContent;
