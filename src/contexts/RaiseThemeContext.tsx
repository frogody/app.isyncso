import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type RaiseTheme = 'dark' | 'light';

interface RaiseThemeContextType {
  theme: RaiseTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  rt: (lightClasses: string, darkClasses: string) => string;
}

const RaiseThemeContext = createContext<RaiseThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'raise-theme';

export function RaiseThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<RaiseTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY) as RaiseTheme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const rt = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, rt }), [theme, toggleTheme, rt]);

  return (
    <RaiseThemeContext.Provider value={value}>
      {children}
    </RaiseThemeContext.Provider>
  );
}

export function useRaiseTheme() {
  const context = useContext(RaiseThemeContext);
  if (!context) {
    return {
      theme: 'dark' as RaiseTheme,
      toggleTheme: () => {},
      rt: (_light: string, dark: string) => dark,
    };
  }
  return context;
}
