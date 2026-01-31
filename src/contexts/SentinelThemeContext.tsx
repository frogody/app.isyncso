import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type SentinelTheme = 'dark' | 'light';

interface SentinelThemeContextType {
  theme: SentinelTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  st: (lightClasses: string, darkClasses: string) => string;
}

const SentinelThemeContext = createContext<SentinelThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'sentinel-theme';

export function SentinelThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SentinelTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY) as SentinelTheme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const st = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, st }), [theme, toggleTheme, st]);

  return (
    <SentinelThemeContext.Provider value={value}>
      {children}
    </SentinelThemeContext.Provider>
  );
}

export function useSentinelTheme() {
  const context = useContext(SentinelThemeContext);
  if (!context) {
    // Fallback for components rendered outside provider (e.g. tests)
    return {
      theme: 'dark' as SentinelTheme,
      toggleTheme: () => {},
      st: (_light: string, dark: string) => dark,
    };
  }
  return context;
}
