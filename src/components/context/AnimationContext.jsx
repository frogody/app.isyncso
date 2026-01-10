import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const AnimationContext = createContext(null);

export function AnimationProvider({ children }) {
  const [avatarState, setAvatarState] = useState('idle'); // 'idle' | 'active' | 'loading'

  const setIdle = useCallback(() => setAvatarState('idle'), []);
  const setActive = useCallback(() => setAvatarState('active'), []);
  const setLoading = useCallback(() => setAvatarState('loading'), []);

  // Auto-return to idle after activity
  const triggerActivity = useCallback(() => {
    setAvatarState('active');
    setTimeout(() => setAvatarState('idle'), 2000); // Return to idle after 2s
  }, []);

  const value = useMemo(() => ({
    avatarState,
    setIdle,
    setActive,
    setLoading,
    triggerActivity,
    isIdle: avatarState === 'idle',
    isActive: avatarState === 'active',
    isLoading: avatarState === 'loading'
  }), [avatarState, setIdle, setActive, setLoading, triggerActivity]);

  return <AnimationContext.Provider value={value}>{children}</AnimationContext.Provider>;
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (!context) throw new Error('useAnimation must be used within AnimationProvider');
  return context;
}
