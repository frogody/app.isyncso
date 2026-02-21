// ---------------------------------------------------------------------------
// StoreBuilder.jsx -- Chat-driven B2B Store Builder (Base44-style layout)
//
// Layout:
// ┌──────────────────────────────────────────────────────────────┐
// │  BuilderToolbar (top bar)                                    │
// ├─────────────────────────┬────────────────────────────────────┤
// │  AI Chat Panel          │      BuilderCanvas                 │
// │  - Suggestions chips    │      (live preview iframe)         │
// │  - Full conversation    │                                    │
// │  - Chat input           │                                    │
// │  (~420px)               │      (flex-1)                      │
// └─────────────────────────┴────────────────────────────────────┘
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Settings2,
  Palette,
  Type,
  Layout,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';

import BuilderToolbar from './BuilderToolbar';
import BuilderCanvas from './BuilderCanvas';

import { useStoreBuilder } from './hooks/useStoreBuilder';
import { useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPreview } from './hooks/useBuilderPreview';
import { useBuilderAI } from './hooks/useBuilderAI';

// ---------------------------------------------------------------------------
// Relative-time helper
// ---------------------------------------------------------------------------

function formatRelativeTime(date) {
  if (!date) return '';
  const now = Date.now();
  const then = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const diffMs = now - then;
  if (Number.isNaN(diffMs) || diffMs < 0) return '';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const d = new Date(then);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 pb-4">
      <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <div className="bg-zinc-800/60 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-zinc-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat message bubble
// ---------------------------------------------------------------------------

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 pb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5 mr-2.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-cyan-500/15 text-white rounded-2xl rounded-tr-md'
              : 'bg-zinc-800/60 text-zinc-300 rounded-2xl rounded-tl-md'
          }`}
        >
          {message.content}
        </div>
        {message.timestamp && (
          <span className="text-[10px] text-zinc-600 mt-1 px-1 select-none">
            {formatRelativeTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings panel (collapsible inline sections for theme, nav, footer)
// ---------------------------------------------------------------------------

function SettingsPanel({ config, onUpdateTheme }) {
  const [openSection, setOpenSection] = useState(null);
  const theme = config?.theme || {};

  const toggle = (section) => setOpenSection((prev) => (prev === section ? null : section));

  const THEME_COLORS = [
    { key: 'primaryColor', label: 'Primary', default: '#06b6d4' },
    { key: 'backgroundColor', label: 'Background', default: '#09090b' },
    { key: 'textColor', label: 'Text', default: '#fafafa' },
    { key: 'surfaceColor', label: 'Surface', default: '#18181b' },
    { key: 'borderColor', label: 'Border', default: '#27272a' },
    { key: 'mutedTextColor', label: 'Muted', default: '#a1a1aa' },
  ];

  return (
    <div className="border-t border-zinc-800/60">
      {/* Theme Colors */}
      <button
        onClick={() => toggle('colors')}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
      >
        <Palette className="w-4 h-4 text-cyan-400" />
        <span className="flex-1 text-left font-medium">Colors</span>
        {openSection === 'colors' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence>
        {openSection === 'colors' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 grid grid-cols-2 gap-2">
              {THEME_COLORS.map(({ key, label, default: def }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="color"
                    value={theme[key] || def}
                    onChange={(e) => onUpdateTheme({ [key]: e.target.value })}
                    className="w-6 h-6 rounded-md border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  {label}
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typography */}
      <button
        onClick={() => toggle('typography')}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors border-t border-zinc-800/40"
      >
        <Type className="w-4 h-4 text-cyan-400" />
        <span className="flex-1 text-left font-medium">Typography</span>
        {openSection === 'typography' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence>
        {openSection === 'typography' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              <label className="block">
                <span className="text-xs text-zinc-500 mb-1 block">Body Font</span>
                <input
                  type="text"
                  value={theme.font || 'Inter, system-ui, sans-serif'}
                  onChange={(e) => onUpdateTheme({ font: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500 mb-1 block">Heading Font</span>
                <input
                  type="text"
                  value={theme.headingFont || 'Inter, system-ui, sans-serif'}
                  onChange={(e) => onUpdateTheme({ headingFont: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sections Overview */}
      <button
        onClick={() => toggle('sections')}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors border-t border-zinc-800/40"
      >
        <Layout className="w-4 h-4 text-cyan-400" />
        <span className="flex-1 text-left font-medium">Sections</span>
        <span className="text-[10px] text-zinc-600 mr-1">
          {config?.sections?.length || 0}
        </span>
        {openSection === 'sections' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence>
        {openSection === 'sections' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1">
              {(config?.sections || []).length === 0 ? (
                <p className="text-xs text-zinc-600 py-2">No sections yet. Ask AI to add some!</p>
              ) : (
                config.sections.map((s, i) => (
                  <div
                    key={s.id || i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-400"
                  >
                    <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{s.type || 'Unknown'}</span>
                    {s.visible === false && (
                      <span className="text-[10px] text-zinc-600 italic">hidden</span>
                    )}
                  </div>
                ))
              )}
              <p className="text-[10px] text-zinc-600 pt-1">
                Use the chat to add, remove, or reorder sections.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [showSettings, setShowSettings] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [chatValue, setChatValue] = useState('');
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const canSend = chatValue.trim().length > 0 && !ai.isProcessing;

  // ---- Sync config to preview iframe when it changes -----------------------
  const prevConfigRef = useRef(null);
  useEffect(() => {
    if (builder.config && builder.config !== prevConfigRef.current) {
      prevConfigRef.current = builder.config;
      preview.sendConfigToPreview(builder.config);
    }
  }, [builder.config, preview.sendConfigToPreview]);

  // ---- Auto-scroll chat to bottom ------------------------------------------
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ai.messages, ai.isProcessing]);

  // ---- Focus input on mount ------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => chatInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

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

  // ---- Handlers ------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setSaveError(null);
    try {
      await builder.saveConfig();
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err.message || 'Failed to save. Please try again.');
    }
  }, [builder.saveConfig]);

  const handlePublish = useCallback(async () => {
    setSaveError(null);
    try {
      if (builder.isPublished) {
        await builder.unpublishStore();
      } else {
        await builder.saveConfig();
        await builder.publishStore();
      }
    } catch (err) {
      console.error('Publish failed:', err);
    }
  }, [builder.isPublished, builder.saveConfig, builder.publishStore, builder.unpublishStore]);

  const handleUpdateTheme = useCallback(
    (themeUpdates) => {
      history.pushState();
      builder.updateTheme(themeUpdates);
    },
    [history.pushState, builder.updateTheme],
  );

  const handleAIPrompt = useCallback(
    async (prompt) => {
      try {
        const businessCtx = { storeName: storeName || 'B2B Store', organizationId };
        const result = await ai.sendPrompt(prompt, builder.config, businessCtx);
        if (result?.updatedConfig) {
          history.pushState();
          builder.updateConfig(result.updatedConfig);
        }
      } catch (err) {
        console.error('AI prompt failed:', err);
      }
    },
    [ai.sendPrompt, builder.config, builder.updateConfig, history.pushState, storeName, organizationId],
  );

  const handleSend = useCallback(async () => {
    const prompt = chatValue.trim();
    if (!prompt || ai.isProcessing) return;
    setChatValue('');
    await handleAIPrompt(prompt);
  }, [chatValue, ai.isProcessing, handleAIPrompt]);

  const handleChatKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      if (ai.isProcessing) return;
      handleAIPrompt(suggestion);
    },
    [ai.isProcessing, handleAIPrompt],
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

  // ---- Render --------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-[#09090b] overflow-hidden">
      {/* ---- Save/Publish Error Banner ---- */}
      {saveError && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
          <span className="flex-1">{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="text-red-400 hover:text-red-300 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---- Top Toolbar ---- */}
      <BuilderToolbar
        onBack={onBack}
        storeName={storeName || 'B2B Store'}
        isDirty={builder.isDirty}
        saving={builder.saving}
        onSave={handleSave}
        onPublish={handlePublish}
        isPublished={builder.isPublished}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        previewDevice={preview.previewDevice}
        onDeviceChange={preview.setPreviewDevice}
      />

      {/* ---- Main 2-panel area ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---- Left: Chat Panel ---- */}
        <div className="w-[420px] flex-shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800/60">
          {/* Chat header */}
          <div className="shrink-0 h-12 flex items-center justify-between px-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">AI Store Builder</span>
            </div>
            <button
              onClick={() => setShowSettings((p) => !p)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                showSettings ? 'bg-cyan-500/15 text-cyan-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
              title="Store settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {/* Settings panel (collapsible) */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden shrink-0"
              >
                <SettingsPanel
                  config={builder.config}
                  onUpdateTheme={handleUpdateTheme}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {/* Welcome + Suggestions (shown when no messages) */}
            {ai.messages.length === 0 && !ai.isProcessing && (
              <div className="flex flex-col items-center justify-center px-6 pt-8 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Build your store with AI
                </h3>
                <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6 max-w-[280px]">
                  Describe what you want and I'll build it. You can change colors,
                  add sections, update text, and more.
                </p>

                {/* Suggestion chips */}
                <div className="w-full space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium px-1">
                    Try asking
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 rounded-full text-xs text-zinc-400 border border-zinc-800 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat messages */}
            {ai.messages.map((msg, idx) => (
              <ChatBubble key={msg.id || idx} message={msg} />
            ))}

            {ai.isProcessing && <TypingIndicator />}

            {/* Follow-up suggestions (after messages) */}
            {ai.messages.length > 0 && !ai.isProcessing && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {ai.suggestions.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-2.5 py-1 rounded-full text-[11px] text-zinc-500 border border-zinc-800/60 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="shrink-0 border-t border-zinc-800/60 p-3">
            <div className="flex items-center gap-2.5">
              <textarea
                ref={chatInputRef}
                value={chatValue}
                onChange={(e) => setChatValue(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={ai.isProcessing}
                placeholder="Describe what you want to build..."
                rows={1}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all disabled:opacity-50 resize-none min-h-[40px] max-h-[120px]"
                style={{ fieldSizing: 'content' }}
              />
              {ai.isProcessing ? (
                <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    canSend
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400 cursor-pointer'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Right: Preview Canvas ---- */}
        <BuilderCanvas
          config={builder.config}
          organizationId={organizationId}
          previewDevice={preview.previewDevice}
          iframeRef={preview.iframeRef}
          previewLoading={preview.previewLoading}
        />
      </div>
    </div>
  );
}
