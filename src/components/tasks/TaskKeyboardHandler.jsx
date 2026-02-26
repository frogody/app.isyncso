import { useEffect, useCallback } from "react";

/**
 * Keyboard handler for task-specific shortcuts.
 * Attaches to the Tasks page scope.
 */
export default function TaskKeyboardHandler({
  onCreateTask,
  onCycleView,
  onFocusSearch,
  onDeleteSelected,
  onEditSelected,
  onChangeStatus,
  onChangePriority,
  onAssign,
  onSetDueDate,
  onNavigateUp,
  onNavigateDown,
  onDeselectTask,
  onOpenDetail,
  selectedTask,
  enabled = true,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Skip if user is typing in an input/textarea/select
      const target = e.target;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Allow Escape even in inputs
      if (e.key === "Escape") {
        if (isInputFocused) {
          target.blur();
        } else {
          onDeselectTask?.();
        }
        return;
      }

      if (isInputFocused) return;

      switch (e.key.toLowerCase()) {
        case "c":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onCreateTask?.();
          }
          break;

        case "v":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onCycleView?.();
          }
          break;

        case "/":
          e.preventDefault();
          onFocusSearch?.();
          break;

        case "enter":
          if (selectedTask) {
            e.preventDefault();
            onOpenDetail?.(selectedTask);
          }
          break;

        case "e":
          if (selectedTask) {
            e.preventDefault();
            onEditSelected?.();
          }
          break;

        case "s":
          if (selectedTask && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onChangeStatus?.();
          }
          break;

        case "p":
          if (selectedTask && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onChangePriority?.();
          }
          break;

        case "a":
          if (selectedTask) {
            e.preventDefault();
            onAssign?.();
          }
          break;

        case "d":
          if (selectedTask && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onSetDueDate?.();
          }
          break;

        case "backspace":
        case "delete":
          if (selectedTask) {
            e.preventDefault();
            onDeleteSelected?.();
          }
          break;

        case "arrowup":
          e.preventDefault();
          onNavigateUp?.();
          break;

        case "arrowdown":
          e.preventDefault();
          onNavigateDown?.();
          break;

        default:
          break;
      }
    },
    [
      enabled,
      selectedTask,
      onCreateTask,
      onCycleView,
      onFocusSearch,
      onDeleteSelected,
      onEditSelected,
      onChangeStatus,
      onChangePriority,
      onAssign,
      onSetDueDate,
      onNavigateUp,
      onNavigateDown,
      onDeselectTask,
      onOpenDetail,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return null; // Invisible — just attaches event listener
}
