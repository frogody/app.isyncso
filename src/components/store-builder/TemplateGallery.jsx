import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { STORE_TEMPLATES } from './utils/storeTemplates';
import { DEFAULT_STORE_CONFIG } from './utils/storeDefaults';

// ---------------------------------------------------------------------------
// Mini layout preview -- renders a small visual representation using the
// template's theme colors so users get a sense of the colour scheme.
// ---------------------------------------------------------------------------

function TemplateMiniPreview({ theme }) {
  const primary = theme?.primaryColor || '#06b6d4';
  const surface = theme?.surfaceColor || '#18181b';
  const bg = theme?.backgroundColor || '#09090b';
  const border = theme?.borderColor || '#27272a';

  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden flex flex-col"
      style={{ backgroundColor: bg }}
    >
      {/* Nav bar */}
      <div
        className="h-3 shrink-0 flex items-center px-2 gap-1"
        style={{ backgroundColor: surface }}
      >
        <div className="w-3 h-1 rounded-full" style={{ backgroundColor: primary, opacity: 0.7 }} />
        <div className="flex-1" />
        <div className="w-2 h-1 rounded-full" style={{ backgroundColor: border }} />
        <div className="w-2 h-1 rounded-full" style={{ backgroundColor: border }} />
      </div>

      {/* Hero area */}
      <div
        className="flex-[3] flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${primary}33 0%, ${primary}11 100%)`,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: primary, opacity: 0.6 }} />
          <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: border }} />
          <div
            className="w-5 h-1.5 rounded-sm mt-0.5"
            style={{ backgroundColor: primary, opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Card placeholders */}
      <div className="flex-[2] px-2 py-1.5 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 rounded"
            style={{ backgroundColor: surface, border: `1px solid ${border}40` }}
          />
        ))}
      </div>

      {/* Footer line */}
      <div className="h-1.5 shrink-0" style={{ backgroundColor: surface }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual template card
// ---------------------------------------------------------------------------

function TemplateCard({ template, isSelected, onSelect }) {
  const theme = template.config?.theme;

  return (
    <button
      onClick={() => onSelect(template)}
      className={`
        group flex flex-col rounded-xl border overflow-hidden text-left
        transition-all duration-200
        ${
          isSelected
            ? 'ring-2 ring-cyan-500 border-cyan-500/40 bg-zinc-800/70'
            : 'border-zinc-800/60 bg-zinc-800/40 hover:border-cyan-500/30 hover:scale-[1.02]'
        }
      `}
    >
      {/* Preview area */}
      <div className="aspect-[16/10] p-2 bg-zinc-900/60">
        <TemplateMiniPreview theme={theme} />
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-zinc-200">{template.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
          {template.description}
        </p>
        {template.industry && (
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            {template.industry}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// TemplateGallery modal
// ---------------------------------------------------------------------------

export default function TemplateGallery({ isOpen, onClose, onSelectTemplate }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(template) {
    setSelected(template);
  }

  function handleBlankStore() {
    onSelectTemplate(DEFAULT_STORE_CONFIG);
    handleClose();
  }

  function handleConfirm() {
    if (!selected) return;
    onSelectTemplate(selected.config);
    handleClose();
  }

  function handleClose() {
    setSelected(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-4xl mx-4 bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-2xl shadow-black/50 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
              <h2 className="text-base font-semibold text-zinc-100">Choose a Template</h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {STORE_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selected?.id === template.id}
                    onSelect={handleSelect}
                  />
                ))}

                {/* Start from scratch */}
                <button
                  onClick={handleBlankStore}
                  className="
                    flex flex-col items-center justify-center rounded-xl
                    border-2 border-dashed border-zinc-700
                    hover:border-cyan-500/40 hover:bg-cyan-500/5
                    transition-colors min-h-[200px]
                  "
                >
                  <Plus className="w-6 h-6 text-zinc-600 mb-2" />
                  <p className="text-sm font-medium text-zinc-400">Blank Store</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Start from scratch</p>
                </button>
              </div>
            </div>

            {/* Footer -- visible when a template is selected */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="shrink-0 px-5 py-3 border-t border-zinc-800/60 flex items-center justify-between"
                >
                  <p className="text-sm text-zinc-400">
                    Selected: <span className="text-zinc-200 font-medium">{selected.name}</span>
                  </p>
                  <button
                    onClick={handleConfirm}
                    className="
                      px-4 py-2 rounded-lg text-sm font-medium
                      bg-cyan-500 text-zinc-950 hover:bg-cyan-400
                      transition-colors
                    "
                  >
                    Use This Template
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
