import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type CreateTheme = 'dark' | 'light';

interface CreateThemeContextType {
  theme: CreateTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  ct: (lightClasses: string, darkClasses: string) => string;
}

const CreateThemeContext = createContext<CreateThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'create-theme';

export function CreateThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<CreateTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY) as CreateTheme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const ct = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, ct }), [theme, toggleTheme, ct]);

  return (
    <CreateThemeContext.Provider value={value}>
      {children}
    </CreateThemeContext.Provider>
  );
}

export function useCreateTheme() {
  const context = useContext(CreateThemeContext);
  if (!context) {
    return {
      theme: 'dark' as CreateTheme,
      toggleTheme: () => {},
      ct: (_light: string, dark: string) => dark,
    };
  }
  return context;
}
