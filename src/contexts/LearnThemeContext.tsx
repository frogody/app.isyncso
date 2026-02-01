import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type LearnTheme = 'dark' | 'light';

interface LearnThemeContextType {
  theme: LearnTheme;
  toggleTheme: () => void;
  lt: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'learn-theme';

function getStoredTheme(): LearnTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as LearnTheme) || 'dark';
  }
  return 'dark';
}

const LearnThemeContext = createContext<LearnThemeContextType | undefined>(undefined);

export function LearnThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<LearnTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const lt = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, lt }), [theme, toggleTheme, lt]);

  return (
    <LearnThemeContext.Provider value={value}>
      {children}
    </LearnThemeContext.Provider>
  );
}

export function useLearnTheme(): LearnThemeContextType {
  const context = useContext(LearnThemeContext);

  const [localTheme, setLocalTheme] = useState<LearnTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localLt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, lt: localLt };
}
