// ---------------------------------------------------------------------------
// StoreBuilder.jsx -- Main 3-panel IDE layout for the B2B Store Builder.
//
// Layout (Lovable/Bolt-inspired):
// ┌──────────────────────────────────────────────────────────────┐
// │  BuilderToolbar (top bar)                                    │
// ├──────────┬──────────────────────────────┬────────────────────┤
// │ Builder  │      BuilderCanvas           │  BuilderProperty   │
// │ Sidebar  │      (live preview iframe)   │  Editor            │
// │ (280px)  │      (flex-1)                │  (320px)           │
// ├──────────┴──────────────────────────────┴────────────────────┤
// │  AIPromptBar (bottom bar)                                    │
// └──────────────────────────────────────────────────────────────┘
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react';

import BuilderToolbar from './BuilderToolbar';
import BuilderSidebar from './BuilderSidebar';
import BuilderCanvas from './BuilderCanvas';
import BuilderPropertyEditor from './BuilderPropertyEditor';
import AIPromptBar from './AIPromptBar';
import AIChatPanel from './AIChatPanel';

import { useStoreBuilder } from './hooks/useStoreBuilder';
import { useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPreview } from './hooks/useBuilderPreview';
import { useBuilderAI } from './hooks/useBuilderAI';
import { createDefaultSection } from './utils/storeDefaults';

// ---------------------------------------------------------------------------
// Section add modal (simple inline picker)
// ---------------------------------------------------------------------------

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero' },
  { type: 'featured_products', label: 'Featured Products' },
  { type: 'category_grid', label: 'Category Grid' },
  { type: 'about', label: 'About' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'cta', label: 'Call to Action' },
  { type: 'faq', label: 'FAQ' },
  { type: 'contact', label: 'Contact' },
  { type: 'banner', label: 'Banner' },
  { type: 'stats', label: 'Stats' },
  { type: 'rich_text', label: 'Rich Text' },
  { type: 'logo_grid', label: 'Logo Grid' },
];

function AddSectionModal({ open, onClose, onAdd }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900 rounded-2xl border border-zinc-800/60 p-5 w-full max-w-md mx-4 shadow-2xl"
      >
        <h3 className="text-sm font-semibold text-white mb-3">Add Section</h3>
        <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
          {SECTION_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => {
                onAdd(type);
                onClose();
              }}
              className="text-left px-3 py-2.5 rounded-xl border border-zinc-800/60 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white hover:border-zinc-700 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main StoreBuilder Component
// ---------------------------------------------------------------------------

export default function StoreBuilder({ organizationId, storeName, onBack }) {
  // ---- Hooks ---------------------------------------------------------------
  const builder = useStoreBuilder(organizationId);
  const history = useBuilderHistory(builder.config, builder.updateConfig);
  const preview = useBuilderPreview();
  const ai = useBuilderAI();

  // ---- Local state ---------------------------------------------------------
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // ---- Sync config to preview iframe when it changes -----------------------
  const prevConfigRef = useRef(null);
  useEffect(() => {
    if (builder.config && builder.config !== prevConfigRef.current) {
      prevConfigRef.current = builder.config;
      preview.sendConfigToPreview(builder.config);
    }
  }, [builder.config, preview.sendConfigToPreview]);

  // ---- Listen for section clicks from the preview iframe -------------------
  useEffect(() => {
    function handleSectionClick(e) {
      if (e.detail?.sectionId) {
        builder.selectSection(e.detail.sectionId);
      }
    }
    window.addEventListener('builder:section-click', handleSectionClick);
    return () =>
      window.removeEventListener('builder:section-click', handleSectionClick);
  }, [builder.selectSection]);

  // ---- Keyboard shortcuts (Cmd+S save, Cmd+Z undo, Cmd+Shift+Z redo) ------
  useEffect(() => {
    function handleKeyDown(e) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (isMeta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        history.redo();
      } else if (isMeta && e.key === 'z') {
        e.preventDefault();
        history.undo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history.undo, history.redo]);

  // ---- Handlers (wrap builder methods with history pushes) -----------------

  const handleSave = useCallback(async () => {
    try {
      await builder.saveConfig();
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [builder.saveConfig]);

  const handlePublish = useCallback(async () => {
    try {
      if (isPublished) {
        await builder.unpublishStore();
        setIsPublished(false);
      } else {
        // Auto-save before publishing
        await builder.saveConfig();
        await builder.publishStore();
        setIsPublished(true);
      }
    } catch (err) {
      console.error('Publish failed:', err);
    }
  }, [isPublished, builder.saveConfig, builder.publishStore, builder.unpublishStore]);

  const handleAddSection = useCallback(
    (type) => {
      history.pushState();
      builder.addSection(type);
    },
    [history.pushState, builder.addSection],
  );

  const handleRemoveSection = useCallback(
    (sectionId) => {
      history.pushState();
      builder.removeSection(sectionId);
    },
    [history.pushState, builder.removeSection],
  );

  const handleReorderSections = useCallback(
    (newOrder) => {
      history.pushState();
      builder.reorderSections(newOrder);
    },
    [history.pushState, builder.reorderSections],
  );

  const handleToggleVisibility = useCallback(
    (sectionId) => {
      history.pushState();
      builder.toggleSectionVisibility(sectionId);
    },
    [history.pushState, builder.toggleSectionVisibility],
  );

  const handleUpdateSection = useCallback(
    (sectionId, updates) => {
      history.pushState();
      builder.updateSection(sectionId, updates);
    },
    [history.pushState, builder.updateSection],
  );

  const handleUpdateSectionProps = useCallback(
    (sectionId, propUpdates) => {
      history.pushState();
      builder.updateSectionProps(sectionId, propUpdates);
    },
    [history.pushState, builder.updateSectionProps],
  );

  const handleUpdateTheme = useCallback(
    (themeUpdates) => {
      history.pushState();
      builder.updateTheme(themeUpdates);
    },
    [history.pushState, builder.updateTheme],
  );

  const handleAIPrompt = useCallback(
    async (prompt) => {
      const result = await ai.sendPrompt(prompt, builder.config);
      if (result?.updatedConfig) {
        history.pushState();
        builder.updateConfig(result.updatedConfig);
      }
    },
    [ai.sendPrompt, builder.config, builder.updateConfig, history.pushState],
  );

  // ---- Loading state -------------------------------------------------------
  if (builder.loading) {
    return (
      <div className="flex flex-col h-screen bg-[#09090b] items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm text-zinc-400">Loading store builder...</p>
      </div>
    );
  }

  // ---- Resolved values -----------------------------------------------------
  const showPropertyEditor = !!builder.selectedSection;

  // ---- Render --------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-[#09090b] overflow-hidden">
      {/* ---- Top Toolbar ---- */}
      <BuilderToolbar
        onBack={onBack}
        storeName={storeName || 'B2B Store'}
        isDirty={builder.isDirty}
        saving={builder.saving}
        onSave={handleSave}
        onPublish={handlePublish}
        isPublished={isPublished}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        previewDevice={preview.previewDevice}
        onDeviceChange={preview.setPreviewDevice}
      />

      {/* ---- Main 3-panel area ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[280px] h-full">
                <BuilderSidebar
                  config={builder.config}
                  selectedSectionId={builder.selectedSectionId}
                  activePanel={builder.activePanel}
                  onSelectSection={builder.selectSection}
                  onAddSection={() => setShowAddSection(true)}
                  onRemoveSection={handleRemoveSection}
                  onReorderSections={handleReorderSections}
                  onToggleVisibility={handleToggleVisibility}
                  onActivePanel={builder.setActivePanel}
                  onUpdateTheme={handleUpdateTheme}
                  onUpdateNavigation={builder.updateNavigation}
                  onUpdateFooter={builder.updateFooter}
                  onUpdateCatalog={builder.updateCatalog}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="flex-shrink-0 w-5 flex items-center justify-center border-r border-zinc-800/60 bg-zinc-950 hover:bg-zinc-900 transition-colors group"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          )}
        </button>

        {/* Center Canvas */}
        <BuilderCanvas
          config={builder.config}
          organizationId={organizationId}
          previewDevice={preview.previewDevice}
          iframeRef={preview.iframeRef}
          previewLoading={preview.previewLoading}
        />

        {/* Right Property Editor */}
        <AnimatePresence initial={false}>
          {showPropertyEditor && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[320px] h-full">
                <BuilderPropertyEditor
                  section={builder.selectedSection}
                  onUpdateSection={handleUpdateSection}
                  onUpdateSectionProps={handleUpdateSectionProps}
                  onClose={() => builder.selectSection(null)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Bottom AI Prompt Bar ---- */}
      <AIPromptBar
        onSendPrompt={handleAIPrompt}
        isProcessing={ai.isProcessing}
        suggestions={ai.suggestions}
        onExpandChat={() => setShowAIChat(true)}
      />

      {/* ---- AI Chat Panel (slide-in) ---- */}
      <AIChatPanel
        messages={ai.messages}
        isProcessing={ai.isProcessing}
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onSendPrompt={handleAIPrompt}
      />

      {/* ---- Add Section Modal ---- */}
      <AnimatePresence>
        {showAddSection && (
          <AddSectionModal
            open={showAddSection}
            onClose={() => setShowAddSection(false)}
            onAdd={handleAddSection}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
