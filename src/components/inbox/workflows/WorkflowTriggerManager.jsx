/**
 * WorkflowTriggerManager - UI for configuring cross-module workflow trigger rules.
 *
 * Features:
 *   - Trigger list with toggle enable/disable
 *   - Each trigger shows: event type, conditions, actions, last triggered
 *   - Create/edit trigger modal (TriggerEditor)
 *   - Predefined trigger templates with one-click setup
 *   - Execution history log tab
 *   - Dark theme: zinc-950 background, cyan accents
 *   - Glass morphism cards with Framer Motion animations
 */

import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Settings, Clock, Sparkles, LayoutList,
  History, ChevronDown, Play, Search, X, Filter
} from 'lucide-react';

import TriggerCard from './TriggerCard';
import TriggerEditor from './TriggerEditor';
import WorkflowLog from './WorkflowLog';
import useWorkflowTriggers, { TRIGGER_TEMPLATES } from './useWorkflowTriggers';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'triggers', label: 'Triggers', icon: Zap },
  { id: 'templates', label: 'Templates', icon: Sparkles },
  { id: 'log', label: 'Log', icon: History },
];

// ---------------------------------------------------------------------------
// Template Card (for templates tab)
// ---------------------------------------------------------------------------

const TemplateCard = memo(function TemplateCard({ template, onCreate, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 hover:border-cyan-500/20 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">{template.name}</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {template.eventType?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 mb-3 line-clamp-2 leading-relaxed">
        {template.description}
      </p>

      {/* Action preview */}
      <div className="flex items-center gap-1.5 mb-3">
        {template.actions.map((action, i) => (
          <span
            key={i}
            className="text-[9px] bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded-md"
          >
            {action.type?.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <button
        onClick={() => onCreate(template.id)}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15 rounded-lg py-1.5 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Use Template
      </button>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

const StatsBar = memo(function StatsBar({ totalTriggerCount, enabledCount, historyCount }) {
  return (
    <div className="flex items-center gap-4 px-1 py-2">
      <div className="flex items-center gap-1.5 text-[10px]">
        <div className="w-2 h-2 rounded-full bg-cyan-500" />
        <span className="text-zinc-400">
          <span className="text-zinc-200 font-medium">{enabledCount}</span> active
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <LayoutList className="w-3 h-3 text-zinc-500" />
        <span className="text-zinc-400">
          <span className="text-zinc-200 font-medium">{totalTriggerCount}</span> total
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <History className="w-3 h-3 text-zinc-500" />
        <span className="text-zinc-400">
          <span className="text-zinc-200 font-medium">{historyCount}</span> runs
        </span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WorkflowTriggerManager() {
  const {
    triggers,
    history,
    enabledCount,
    totalTriggerCount,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
    executeTrigger,
    createFromTemplate,
  } = useWorkflowTriggers();

  const [activeTab, setActiveTab] = useState('triggers');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ---- Handlers -----------------------------------------------------------

  const handleCreate = useCallback(() => {
    setEditingTrigger(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback((trigger) => {
    setEditingTrigger(trigger);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(
    (data) => {
      if (data.id) {
        updateTrigger(data.id, data);
      } else {
        createTrigger(data);
      }
      setEditorOpen(false);
      setEditingTrigger(null);
    },
    [createTrigger, updateTrigger]
  );

  const handleDuplicate = useCallback(
    (trigger) => {
      createTrigger({
        name: `${trigger.name} (copy)`,
        description: trigger.description,
        eventType: trigger.eventType,
        conditions: [...(trigger.conditions || [])],
        actions: (trigger.actions || []).map((a) => ({ ...a, config: { ...a.config } })),
      });
    },
    [createTrigger]
  );

  const handleRunNow = useCallback(
    (trigger) => {
      executeTrigger(trigger.id, { manual: true, timestamp: new Date().toISOString() });
    },
    [executeTrigger]
  );

  const handleCreateFromTemplate = useCallback(
    (templateId) => {
      createFromTemplate(templateId);
      setActiveTab('triggers');
    },
    [createFromTemplate]
  );

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingTrigger(null);
  }, []);

  // ---- Filtered triggers --------------------------------------------------

  const filteredTriggers = searchQuery.trim()
    ? triggers.filter(
        (t) =>
          t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.eventType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : triggers;

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-zinc-800/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Workflow Triggers</h2>
              <p className="text-[10px] text-zinc-500">Automate actions across modules</p>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 text-[11px] font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Trigger
          </button>
        </div>

        <StatsBar
          totalTriggerCount={totalTriggerCount}
          enabledCount={enabledCount}
          historyCount={history.length}
        />

        {/* Tabs */}
        <div className="flex items-center gap-0.5 mt-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'log' && history.length > 0 && (
                  <span className="text-[9px] bg-zinc-800/60 text-zinc-400 px-1 py-0 rounded-full ml-0.5">
                    {history.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Triggers tab */}
          {activeTab === 'triggers' && (
            <motion.div
              key="tab-triggers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-3"
            >
              {/* Search bar */}
              {triggers.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Search triggers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Trigger list */}
              {filteredTriggers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/40 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-1">
                    {searchQuery ? 'No matching triggers' : 'No triggers yet'}
                  </p>
                  <p className="text-[11px] text-zinc-600 mb-4 max-w-[240px]">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Create your first automation or pick a template to get started.'}
                  </p>
                  {!searchQuery && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 text-[11px] bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Create Trigger
                      </button>
                      <button
                        onClick={() => setActiveTab('templates')}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 hover:bg-zinc-800/60 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Browse Templates
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredTriggers.map((trigger, i) => (
                      <TriggerCard
                        key={trigger.id}
                        trigger={trigger}
                        index={i}
                        onToggle={toggleTrigger}
                        onEdit={handleEdit}
                        onDelete={deleteTrigger}
                        onDuplicate={handleDuplicate}
                        onRunNow={handleRunNow}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* Templates tab */}
          {activeTab === 'templates' && (
            <motion.div
              key="tab-templates"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-4"
            >
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-zinc-300 mb-1">Starter Templates</h3>
                <p className="text-[10px] text-zinc-500">
                  One-click setup for common automation patterns. Customize after creation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRIGGER_TEMPLATES.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onCreate={handleCreateFromTemplate}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Log tab */}
          {activeTab === 'log' && (
            <motion.div
              key="tab-log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <WorkflowLog history={history} triggers={triggers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editorOpen && (
          <TriggerEditor
            trigger={editingTrigger}
            onSave={handleSave}
            onClose={handleCloseEditor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
