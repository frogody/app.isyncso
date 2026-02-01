import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type CRMTheme = 'dark' | 'light';

interface CRMThemeContextType {
  theme: CRMTheme;
  toggleTheme: () => void;
  crt: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'crm-theme';

function getStoredTheme(): CRMTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as CRMTheme) || 'dark';
  }
  return 'dark';
}

const CRMThemeContext = createContext<CRMThemeContextType | undefined>(undefined);

export function CRMThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<CRMTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const crt = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, crt }), [theme, toggleTheme, crt]);

  return (
    <CRMThemeContext.Provider value={value}>
      {children}
    </CRMThemeContext.Provider>
  );
}

export function useCRMTheme(): CRMThemeContextType {
  const context = useContext(CRMThemeContext);

  const [localTheme, setLocalTheme] = useState<CRMTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localCrt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, crt: localCrt };
}
