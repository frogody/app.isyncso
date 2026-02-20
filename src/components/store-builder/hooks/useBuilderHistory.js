// ---------------------------------------------------------------------------
// useBuilderHistory.js -- Undo / redo stack for store config changes.
// Maintains up to 50 previous states so the user can step backwards through
// edits made in the store builder.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

/**
 * @param {object}   config       Current StoreConfig from useStoreBuilder.
 * @param {function} updateConfig Function that replaces the full config
 *                                (e.g. the `patchConfig` or top-level setter
 *                                from useStoreBuilder).
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
   */
  const pushState = useCallback(() => {
    const snapshot = configRef.current;
    if (!snapshot) return;

    setUndoStack((prev) => {
      const next = [...prev, JSON.parse(JSON.stringify(snapshot))];
      // Cap the stack size
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  /**
   * Undo the last change:
   *  1. Pop the most recent entry off the undo stack.
   *  2. Push the *current* config onto the redo stack.
   *  3. Apply the popped config.
   */
  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;

      const nextUndo = [...prevUndo];
      const previous = nextUndo.pop();

      // Push current state onto redo stack
      const current = configRef.current;
      if (current) {
        setRedoStack((prevRedo) => [
          ...prevRedo,
          JSON.parse(JSON.stringify(current)),
        ]);
      }

      // Apply the restored config
      updateConfig(previous);

      return nextUndo;
    });
  }, [updateConfig]);

  /**
   * Redo the last undone change:
   *  1. Pop the most recent entry off the redo stack.
   *  2. Push the *current* config onto the undo stack.
   *  3. Apply the popped config.
   */
  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;

      const nextRedo = [...prevRedo];
      const restored = nextRedo.pop();

      // Push current state onto undo stack
      const current = configRef.current;
      if (current) {
        setUndoStack((prevUndo) => {
          const next = [
            ...prevUndo,
            JSON.parse(JSON.stringify(current)),
          ];
          if (next.length > MAX_HISTORY) next.shift();
          return next;
        });
      }

      // Apply the restored config
      updateConfig(restored);

      return nextRedo;
    });
  }, [updateConfig]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return { pushState, undo, redo, canUndo, canRedo };
}
