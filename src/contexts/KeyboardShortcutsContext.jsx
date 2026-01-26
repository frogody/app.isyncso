import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const KeyboardShortcutsContext = createContext(null);

// Display key combination nicely
const KeyCombo = ({ keys }) => {
  const parts = keys.split("+").map((k) => {
    if (k === "mod") return navigator.platform.includes("Mac") ? "⌘" : "Ctrl";
    if (k === "shift") return "⇧";
    if (k === "alt") return navigator.platform.includes("Mac") ? "⌥" : "Alt";
    if (k === "escape") return "Esc";
    if (k === "enter") return "↵";
    if (k === "arrowup") return "↑";
    if (k === "arrowdown") return "↓";
    if (k === "arrowleft") return "←";
    if (k === "arrowright") return "→";
    if (k === " ") return "Space";
    return k.toUpperCase();
  });

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono min-w-[24px] text-center"
        >
          {part}
        </kbd>
      ))}
    </div>
  );
};

// Shortcuts Help Modal
function ShortcutsHelpModal({ open, onClose, shortcuts }) {
  const groupedShortcuts = Object.entries(shortcuts).reduce(
    (acc, [key, { description, scope }]) => {
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push({ key, description });
      return acc;
    },
    {}
  );

  // Sort scopes for consistent display
  const scopeOrder = ["Global", "Navigation", "Candidates", "Campaign", "Quick Actions"];
  const sortedScopes = Object.keys(groupedShortcuts).sort(
    (a, b) => scopeOrder.indexOf(a) - scopeOrder.indexOf(b)
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-[550px] max-h-[80vh] overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-red-400" />
                  <h2 className="text-lg font-medium text-white">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
                {sortedScopes.map((scope) => (
                  <div key={scope}>
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                      {scope}
                    </h3>
                    <div className="space-y-2">
                      {groupedShortcuts[scope].map(({ key, description }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-zinc-300">{description}</span>
                          <KeyCombo keys={key} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {Object.keys(groupedShortcuts).length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    No shortcuts registered on this page
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-800/50">
                <p className="text-sm text-zinc-500 text-center">
                  Press <KeyCombo keys="?" /> anytime to show this help
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function KeyboardShortcutsProvider({ children }) {
  const [shortcuts, setShortcuts] = useState({});
  const [helpOpen, setHelpOpen] = useState(false);
  const sequenceBuffer = useRef("");
  const sequenceTimeout = useRef(null);

  const registerShortcut = useCallback(
    (key, handler, description, scope = "Global") => {
      setShortcuts((prev) => ({
        ...prev,
        [key]: { handler, description, scope },
      }));
      return () => {
        setShortcuts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      };
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea (except for Escape and specific modifiers)
      const isInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable;

      if (isInput) {
        // Only allow Escape and Cmd/Ctrl shortcuts in inputs
        if (e.key !== "Escape" && !e.metaKey && !e.ctrlKey) return;
      }

      // Build key string
      const key = [
        e.metaKey || e.ctrlKey ? "mod" : "",
        e.shiftKey ? "shift" : "",
        e.altKey ? "alt" : "",
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      // Check for direct shortcut match
      const shortcut = shortcuts[key];
      if (shortcut) {
        e.preventDefault();
        shortcut.handler();
        sequenceBuffer.current = "";
        return;
      }

      // Handle sequence shortcuts (like "g+c" for go to candidates)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        // Clear previous timeout
        if (sequenceTimeout.current) {
          clearTimeout(sequenceTimeout.current);
        }

        // Add to sequence buffer
        sequenceBuffer.current += e.key.toLowerCase();

        // Check for sequence match
        const sequenceKey = sequenceBuffer.current.split("").join("+");
        const sequenceShortcut = shortcuts[sequenceKey];
        if (sequenceShortcut) {
          e.preventDefault();
          sequenceShortcut.handler();
          sequenceBuffer.current = "";
          return;
        }

        // Set timeout to clear buffer
        sequenceTimeout.current = setTimeout(() => {
          sequenceBuffer.current = "";
        }, 1000);
      }

      // ? key opens help (without modifiers, when not in input)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey && !isInput) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }
    };
  }, [shortcuts]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ registerShortcut, shortcuts, helpOpen, setHelpOpen }}
    >
      {children}
      <ShortcutsHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        shortcuts={shortcuts}
      />
    </KeyboardShortcutsContext.Provider>
  );
}

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    // Return a no-op version if not wrapped in provider
    return {
      registerShortcut: () => () => {},
      shortcuts: {},
      helpOpen: false,
      setHelpOpen: () => {},
    };
  }
  return context;
};

// Hook for registering a shortcut
export function useShortcut(key, handler, description, scope = "Global", deps = []) {
  const { registerShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    if (!key || !handler) return;
    return registerShortcut(key, handler, description, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, registerShortcut, ...deps]);
}

// Export KeyCombo for use elsewhere
export { KeyCombo };
