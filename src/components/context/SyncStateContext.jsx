/**
 * SyncStateContext
 * Shares SYNC agent avatar state between the mini sidebar avatar and the full SyncAgent page
 * This enables synchronized animations and reactive behavior across the app
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const SyncStateContext = createContext(null);

// Default state values
const DEFAULT_STATE = {
  mood: 'listening',      // 'listening' | 'thinking' | 'speaking'
  level: 0.18,            // Animation intensity 0-1
  seed: 4,                // Visual variation seed
  activeAgent: null,      // Currently delegated agent id
  actionEffect: null,     // Current action visual effect
  showSuccess: false,     // Success animation flag
  isProcessing: false,    // Whether SYNC is processing a request
  lastActivity: null,     // Timestamp of last activity
};

export function SyncStateProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const listenersRef = useRef(new Set());

  // Update specific state properties
  const updateState = useCallback((updates) => {
    setState(prev => {
      const newState = { ...prev, ...updates, lastActivity: Date.now() };
      // Notify listeners
      listenersRef.current.forEach(listener => listener(newState));
      return newState;
    });
  }, []);

  // Set mood with automatic level adjustment
  const setMood = useCallback((mood) => {
    const levelTargets = {
      speaking: 0.55,
      thinking: 0.35,
      listening: 0.18,
    };
    updateState({ mood, level: levelTargets[mood] || 0.18 });
  }, [updateState]);

  // Set active agent (for delegation visualization)
  const setActiveAgent = useCallback((agentId) => {
    updateState({ activeAgent: agentId });
  }, [updateState]);

  // Trigger action effect
  const triggerActionEffect = useCallback((effect) => {
    updateState({ actionEffect: effect });
    // Clear effect after animation
    setTimeout(() => updateState({ actionEffect: null }), 2000);
  }, [updateState]);

  // Show success animation
  const triggerSuccess = useCallback(() => {
    updateState({ showSuccess: true });
    setTimeout(() => updateState({ showSuccess: false }), 1500);
  }, [updateState]);

  // Set processing state
  const setProcessing = useCallback((isProcessing) => {
    updateState({
      isProcessing,
      mood: isProcessing ? 'thinking' : 'listening'
    });
  }, [updateState]);

  // Subscribe to state changes (for external listeners)
  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  // Reset to default state
  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const value = {
    ...state,
    updateState,
    setMood,
    setActiveAgent,
    triggerActionEffect,
    triggerSuccess,
    setProcessing,
    subscribe,
    reset,
  };

  return (
    <SyncStateContext.Provider value={value}>
      {children}
    </SyncStateContext.Provider>
  );
}

export function useSyncState() {
  const context = useContext(SyncStateContext);
  if (!context) {
    // Return default state if not within provider (graceful fallback)
    return {
      ...DEFAULT_STATE,
      updateState: () => {},
      setMood: () => {},
      setActiveAgent: () => {},
      triggerActionEffect: () => {},
      triggerSuccess: () => {},
      setProcessing: () => {},
      subscribe: () => () => {},
      reset: () => {},
    };
  }
  return context;
}

export default SyncStateContext;
