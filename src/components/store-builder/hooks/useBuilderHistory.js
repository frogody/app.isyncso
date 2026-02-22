// ---------------------------------------------------------------------------
// useBuilderHistory.js -- Undo / redo stack for store config changes.
// Maintains up to 50 previous states so the user can step backwards through
// edits made in the store builder.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useMemo } from 'react';

const MAX_HISTORY = 50;

/**
 * @param {object}   config       Current StoreConfig from useStoreBuilder.
 * @param {function} updateConfig Function that replaces the full config.
 */
export function useBuilderHistory(config, updateConfig) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Keep a ref to the latest config so callbacks never go stale.
  const configRef = useRef(config);
  configRef.current = config;

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
