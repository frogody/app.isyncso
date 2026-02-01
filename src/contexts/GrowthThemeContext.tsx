import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type GrowthTheme = 'dark' | 'light';

interface GrowthThemeContextType {
  theme: GrowthTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  gt: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'growth-theme';

function getStoredTheme(): GrowthTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as GrowthTheme) || 'dark';
  }
  return 'dark';
}

const GrowthThemeContext = createContext<GrowthThemeContextType | undefined>(undefined);

export function GrowthThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<GrowthTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const gt = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, gt }), [theme, toggleTheme, gt]);

  return (
    <GrowthThemeContext.Provider value={value}>
      {children}
    </GrowthThemeContext.Provider>
  );
}

/**
 * Hook that works both inside and outside the provider.
 * Outside the provider it still reads/writes localStorage and triggers re-renders
 * via its own local state — so useGrowthTheme() is safe to call anywhere.
 */
export function useGrowthTheme(): GrowthThemeContextType {
  const context = useContext(GrowthThemeContext);

  const [localTheme, setLocalTheme] = useState<GrowthTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localGt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, gt: localGt };
}
