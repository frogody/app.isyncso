import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type FinanceTheme = 'dark' | 'light';

interface FinanceThemeContextType {
  theme: FinanceTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  ft: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'finance-theme';

function getStoredTheme(): FinanceTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as FinanceTheme) || 'dark';
  }
  return 'dark';
}

const FinanceThemeContext = createContext<FinanceThemeContextType | undefined>(undefined);

export function FinanceThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<FinanceTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const ft = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, ft }), [theme, toggleTheme, ft]);

  return (
    <FinanceThemeContext.Provider value={value}>
      {children}
    </FinanceThemeContext.Provider>
  );
}

/**
 * Hook that works both inside and outside the provider.
 * Outside the provider it still reads/writes localStorage and triggers re-renders
 * via its own local state — so useFinanceTheme() is safe to call anywhere.
 */
export function useFinanceTheme(): FinanceThemeContextType {
  const context = useContext(FinanceThemeContext);

  const [localTheme, setLocalTheme] = useState<FinanceTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localFt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, ft: localFt };
}
