// ---------------------------------------------------------------------------
// useBuilderHistory.js -- Undo / redo stack for store config changes.
// Maintains up to 50 previous states so the user can step backwards through
// edits made in the store builder. Persists to DB via onSave callback.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

const MAX_HISTORY = 50;

/**
 * @param {object}   config          Current StoreConfig from useStoreBuilder.
 * @param {function} updateConfig    Function that replaces the full config.
 * @param {object}   options
 * @param {Array}    options.initialEntries  Persisted history entries from DB.
 * @param {function} options.onSave          Called with serializable entries after changes.
 */
export function useBuilderHistory(config, updateConfig, { initialEntries, onSave } = {}) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Keep a ref to the latest config so callbacks never go stale.
  const configRef = useRef(config);
  configRef.current = config;

  // Hydrate from persisted entries when they arrive (async DB fetch)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (Array.isArray(initialEntries) && initialEntries.length > 0) {
      hydratedRef.current = true;
      setUndoStack((prev) => {
        if (prev.length > 0) return prev; // Don't overwrite if user already made edits
        return initialEntries.map((e) => ({
          config: e.config,
          label: e.label || 'Restored',
          timestamp: e.timestamp || Date.now(),
        }));
      });
    }
  }, [initialEntries]);

  // Persist to DB whenever undoStack changes (debounced)
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!onSave || undoStack.length === 0) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Only persist last 20 entries to keep DB payload reasonable
      const toSave = undoStack.slice(-20).map((e) => ({
        config: e.config,
        label: e.label,
        timestamp: e.timestamp,
      }));
      onSave(toSave);
    }, 2000); // 2s debounce
    return () => clearTimeout(saveTimerRef.current);
  }, [undoStack, onSave]);

  /**
   * Push the current config snapshot onto the undo stack.
   * Should be called *before* applying a new config.
   * Clears the redo stack (new edits invalidate any redo history).
   * @param {string} [label] - Optional label describing this change.
   */
  const pushState = useCallback((label) => {
    const snapshot = configRef.current;
    if (!snapshot) return;

    setUndoStack((prev) => {
      const entry = {
        config: JSON.parse(JSON.stringify(snapshot)),
        label: label || 'Manual edit',
        timestamp: Date.now(),
      };
      const next = [...prev, entry];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  /**
   * Undo the last change.
   */
  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;

      const nextUndo = [...prevUndo];
      const previous = nextUndo.pop();

      const current = configRef.current;
      if (current) {
        setRedoStack((prevRedo) => [
          ...prevRedo,
          {
            config: JSON.parse(JSON.stringify(current)),
            label: 'Undo',
            timestamp: Date.now(),
          },
        ]);
      }

      updateConfig(previous.config);
      return nextUndo;
    });
  }, [updateConfig]);

  /**
   * Redo the last undone change.
   */
  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;

      const nextRedo = [...prevRedo];
      const restored = nextRedo.pop();

      const current = configRef.current;
      if (current) {
        setUndoStack((prevUndo) => {
          const entry = {
            config: JSON.parse(JSON.stringify(current)),
            label: 'Redo',
            timestamp: Date.now(),
          };
          const next = [...prevUndo, entry];
          if (next.length > MAX_HISTORY) next.shift();
          return next;
        });
      }

      updateConfig(restored.config);
      return nextRedo;
    });
  }, [updateConfig]);

  /**
   * Restore config to a specific point in the undo history.
   * All entries after that index become the redo stack.
   */
  const restoreToIndex = useCallback((index) => {
    setUndoStack((prevUndo) => {
      if (index < 0 || index >= prevUndo.length) return prevUndo;

      const entry = prevUndo[index];
      const current = configRef.current;

      // Everything after this index + current state goes to redo
      const futureEntries = prevUndo.slice(index + 1);
      if (current) {
        futureEntries.push({
          config: JSON.parse(JSON.stringify(current)),
          label: 'Before rollback',
          timestamp: Date.now(),
        });
      }
      setRedoStack(futureEntries);

      // Apply the restored config
      updateConfig(entry.config);

      // Undo stack is now everything up to (but not including) the restored index
      return prevUndo.slice(0, index);
    });
  }, [updateConfig]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Expose history entries for the timeline UI (most recent first)
  const historyEntries = useMemo(() => {
    return undoStack.map((entry, i) => ({
      index: i,
      label: entry.label,
      timestamp: entry.timestamp,
    })).reverse();
  }, [undoStack]);

  return { pushState, undo, redo, canUndo, canRedo, historyEntries, restoreToIndex };
}
