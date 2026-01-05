import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['↑', '↓'], description: 'Navigate channels' },
    { keys: ['⌘', 'K'], description: 'Quick switcher / Search' },
    { keys: ['⌘', 'Shift', 'K'], description: 'Open DM' },
    { keys: ['Esc'], description: 'Close panel / Cancel' },
  ]},
  { category: 'Messages', items: [
    { keys: ['Enter'], description: 'Send message' },
    { keys: ['Shift', 'Enter'], description: 'New line' },
    { keys: ['↑'], description: 'Edit last message (empty input)' },
    { keys: ['⌘', 'B'], description: 'Bold text' },
    { keys: ['⌘', 'I'], description: 'Italic text' },
    { keys: ['⌘', 'K'], description: 'Insert link' },
    { keys: ['⌘', 'U'], description: 'Upload file' },
  ]},
  { category: 'Actions', items: [
    { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['⌘', 'N'], description: 'New channel' },
    { keys: ['⌘', 'F'], description: 'Search in channel' },
  ]},
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-xs text-zinc-500">Work faster with these shortcuts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto max-h-[60vh] space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="text-sm text-zinc-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 min-w-[24px] text-center">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-zinc-600 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
            <p className="text-xs text-zinc-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] mx-1">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px]">/</kbd> to toggle this panel
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
