import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/supabaseClient";

/**
 * Hook for managing AI agent control of the application
 * Handles action execution, navigation, and state management
 */
export function useAgentControl({ agentType, onActionComplete }) {
  const navigate = useNavigate();
  const [isControlling, setIsControlling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [progress, setProgress] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const abortControllerRef = useRef(null);

  // Color mapping for different agent types
  const colorMap = {
    learn: "cyan",
    sentinel: "sage",
    growth: "indigo",
    finance: "amber",
    raise: "orange",
    create: "rose"
  };

  const color = colorMap[agentType] || "cyan";

  // Execute a single action
  const executeAction = useCallback(async (action) => {
    if (isPaused) return;

    setCurrentAction(action);
    setProgress(0);

    try {
      switch (action.type) {
        case "navigate":
          // Navigate to a page
          setProgress(50);
          await new Promise(r => setTimeout(r, 500)); // Visual delay
          navigate(createPageUrl(action.target));
          setProgress(100);
          break;

        case "create":
          // Create an entity
          setProgress(30);
          if (action.entity && action.data) {
            await db.entities[action.entity].create(action.data);
          }
          setProgress(100);
          break;

        case "update":
          // Update an entity
          setProgress(30);
          if (action.entity && action.id && action.data) {
            await db.entities[action.entity].update(action.id, action.data);
          }
          setProgress(100);
          break;

        case "enroll":
          // Enroll in a course
          setProgress(30);
          if (action.courseId) {
            const user = await db.auth.me();
            await db.entities.UserProgress.create({
              user_id: user.id,
              course_id: action.courseId,
              status: "in_progress",
              completion_percentage: 0,
              completed_lessons: []
            });
            setProgress(70);
            navigate(createPageUrl(`LessonViewer?courseId=${action.courseId}`));
          }
          setProgress(100);
          break;

        case "research":
          // Execute research function
          setProgress(30);
          if (action.functionName && action.params) {
            await db.functions.invoke(action.functionName, action.params);
          }
          setProgress(100);
          break;

        case "generate":
          // Generate document or content
          setProgress(30);
          if (action.functionName && action.params) {
            const result = await db.functions.invoke(action.functionName, action.params);
            if (action.navigateOnComplete) {
              navigate(createPageUrl(action.navigateOnComplete));
            }
          }
          setProgress(100);
          break;

        case "assess":
          // Run assessment
          setProgress(30);
          if (action.systemId) {
            navigate(createPageUrl(`RiskAssessment?id=${action.systemId}`));
          }
          setProgress(100);
          break;

        default:
          // Custom action via function
          if (action.functionName) {
            setProgress(30);
            await db.functions.invoke(action.functionName, action.params || {});
            setProgress(100);
          }
      }

      // Brief delay to show completion
      await new Promise(r => setTimeout(r, 300));
      
      onActionComplete?.(action, true);
    } catch (error) {
      console.error("Action execution failed:", error);
      onActionComplete?.(action, false, error.message);
    } finally {
      setCurrentAction(null);
      setProgress(0);
    }
  }, [isPaused, navigate, onActionComplete]);

  // Start agent control mode
  const startControl = useCallback((action) => {
    setIsControlling(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();
    executeAction(action);
  }, [executeAction]);

  // Pause control
  const pauseControl = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume control
  const resumeControl = useCallback(() => {
    setIsPaused(false);
    if (currentAction) {
      executeAction(currentAction);
    }
  }, [currentAction, executeAction]);

  // Stop control completely
  const stopControl = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsControlling(false);
    setIsPaused(false);
    setCurrentAction(null);
    setProgress(0);
    setPendingAction(null);
  }, []);

  // Propose an action (for user approval)
  const proposeAction = useCallback((action) => {
    setPendingAction(action);
  }, []);

  // Clear pending action
  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  // Approve and execute pending action
  const approvePendingAction = useCallback(() => {
    if (pendingAction) {
      startControl(pendingAction);
      setPendingAction(null);
    }
  }, [pendingAction, startControl]);

  return {
    // State
    isControlling,
    isPaused,
    currentAction,
    progress,
    pendingAction,
    color,

    // Actions
    startControl,
    pauseControl,
    resumeControl,
    stopControl,
    proposeAction,
    clearPendingAction,
    approvePendingAction,
    executeAction
  };
}

export default useAgentControl;