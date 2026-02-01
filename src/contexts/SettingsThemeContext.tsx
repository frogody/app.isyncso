import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type SettingsTheme = 'dark' | 'light';

interface SettingsThemeContextType {
  theme: SettingsTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  st: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'settings-theme';

function getStoredTheme(): SettingsTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as SettingsTheme) || 'dark';
  }
  return 'dark';
}

const SettingsThemeContext = createContext<SettingsThemeContextType | undefined>(undefined);

export function SettingsThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SettingsTheme>(getStoredTheme);

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
    <SettingsThemeContext.Provider value={value}>
      {children}
    </SettingsThemeContext.Provider>
  );
}

/**
 * Hook that works both inside and outside the provider.
 * Outside the provider it still reads/writes localStorage and triggers re-renders
 * via its own local state — so useSettingsTheme() is safe to call anywhere.
 */
export function useSettingsTheme(): SettingsThemeContextType {
  const context = useContext(SettingsThemeContext);

  const [localTheme, setLocalTheme] = useState<SettingsTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localSt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, st: localSt };
}
