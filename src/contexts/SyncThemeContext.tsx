import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type SyncTheme = 'dark' | 'light';

interface SyncThemeContextType {
  theme: SyncTheme;
  toggleTheme: () => void;
  syt: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'sync-theme';

function getStoredTheme(): SyncTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as SyncTheme) || 'dark';
  }
  return 'dark';
}

const SyncThemeContext = createContext<SyncThemeContextType | undefined>(undefined);

export function SyncThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SyncTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const syt = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, syt }), [theme, toggleTheme, syt]);

  return (
    <SyncThemeContext.Provider value={value}>
      {children}
    </SyncThemeContext.Provider>
  );
}

export function useSyncTheme(): SyncThemeContextType {
  const context = useContext(SyncThemeContext);

  const [localTheme, setLocalTheme] = useState<SyncTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localSyt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, syt: localSyt };
}
